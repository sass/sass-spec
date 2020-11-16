import fs from "fs"
import path from "path"
import { archiveFromStream, HrxItem } from "node-hrx"

import { RunOptions, mergeOptions, optsFromYaml } from "./options"

type SpecIteratee = (subdir: SpecPath) => Promise<void>

/**
 * Represents either a real or virtual directory that contains spec files.
 */
export abstract class SpecPath {
  private parentOpts?: RunOptions
  private _options?: RunOptions
  private subitems: Record<string, SpecPath>
  abstract path: string
  protected root: SpecPath

  constructor(root?: SpecPath, parentOpts?: RunOptions) {
    this.root = root ?? this
    this.parentOpts = parentOpts
    this.subitems = {}
  }

  // returns true if this is the root of an HRX archive
  protected abstract isArchiveRoot(): boolean
  // helper to get the subitem with the given name
  protected abstract getSubitem(name: string): Promise<SpecPath>

  /** The path of this directory relative to the top level that was created */
  relPath() {
    return path.relative(this.root.path, this.path)
  }

  /** The list of sub-files of this directory */
  abstract list(): Promise<string[]>
  /** The file contents of the given filename */
  abstract contents(filename: string): Promise<string>
  /** Returns true if this directory has the given filename as a subitem */
  abstract has(filename: string): boolean
  /** True if this represents a directory */
  abstract isDirectory(): boolean

  /** true if this represents a single file */
  isFile() {
    return !this.isDirectory()
  }

  /** Update the contents of the given file */
  async writeFile(filename: string, contents: string) {
    throw new Error("Not implemented")
  }

  /** Remove the file from this directory */
  async removeFile(filename: string) {
    throw new Error("Not implemented")
  }

  /**
   * Get the SpecPath at the provided path to the subitem
   */
  async atPath(path: string): Promise<SpecPath> {
    if (!path) return this
    const i = path.indexOf("/")
    if (i === -1) {
      return await this.subitem(path)
    }
    const child = await this.subitem(path.slice(0, i))
    return await child.atPath(path.slice(i + 1))
  }

  /**
   * Return the subitem of this directory corresponding to the given name
   */
  async subitem(name: string) {
    if (!this.subitems[name]) {
      this.subitems[name] = await this.getSubitem(name)
    }
    return this.subitems[name]
  }

  async items() {
    if (this.isFile()) return []
    const list = await this.list()
    return Promise.all(list.map((item) => this.subitem(item)))
  }

  // by default, do nothing
  async writeToDisk(): Promise<void> {}
  async cleanup(): Promise<void> {}

  cleanupSync() {}

  /**
   * Write files corresponding to this directory and run the given callback,
   * deleting the files when done
   */
  async withRealFiles(cb: () => Promise<void>) {
    await this.writeToDisk()
    // TODO handle process exit
    // process.on("exit", (status) => {
    //   this.cleanupSync()
    //   process.exit(status)
    // })
    try {
      await cb()
    } finally {
      await this.cleanup()
    }
  }

  // Get the options from a physical options.yml file
  private async getDirectOptions(): Promise<RunOptions> {
    const contents = this.has("options.yml")
      ? await this.contents("options.yml")
      : ""
    return optsFromYaml(contents)
  }

  /** Get the run options of this directory, including those inherited from its parent */
  async options() {
    if (!this._options) {
      const opts = await this.getDirectOptions()
      this._options = this.parentOpts
        ? mergeOptions(this.parentOpts, opts)
        : opts
    }
    return this._options
  }

  /**
   * Return whether this directory corresponds to a test case
   * (i.e. it has an `input.scss` file).
   */
  isTestDir() {
    return this.has("input.scss") || this.has("input.sass")
  }

  /** Return whether this test directory has an indented sass file */
  isIndented() {
    return this.has("input.sass")
  }

  /** Return the name of the input file of this test directory. */
  inputFile() {
    return this.isIndented() ? "input.sass" : "input.scss"
  }

  /** Get the contents of the input file for this test directory. */
  async input() {
    const inputFile = this.isIndented() ? "input.sass" : "input.scss"
    return await this.contents(inputFile)
  }

  private isMatch(paths: string[]) {
    return paths.length === 0 || paths.some((path) => this.path === path)
  }

  // TODO should we move this function out to its own file?
  /**
   * Iterate through the subpaths of this directory, running the iteratee
   * on all
   * @param paths the paths to match against
   * @param iteratee the function to call for each matching subdirectory
   */
  async forEachTest(paths: string[], iteratee: SpecIteratee) {
    // If we're a matching test directory, run the test
    if (this.isMatch(paths)) {
      if (this.isTestDir()) {
        await iteratee(this)
      } else {
        // otherwise, recurse through all subdirectories
        for (const subdir of await this.items()) {
          await subdir.forEachTest([], iteratee)
        }
      }
    } else {
      // otherwise, recurse through all subdirectories
      const subpaths = paths.filter((p) => p.startsWith(this.path))
      // if this path isn't a parent of any of the given paths, return
      if (subpaths.length === 0) {
        return
      }
      for (const subdir of await this.items()) {
        await subdir.forEachTest(subpaths, iteratee)
      }
    }
  }
}

class RealSpecPath extends SpecPath {
  path: string

  constructor(path: string, root?: SpecPath, parentOpts?: RunOptions) {
    super(root, parentOpts)
    this.path = path
  }

  isDirectory() {
    return fs.statSync(this.path).isDirectory()
  }

  isArchiveRoot() {
    return false
  }

  has(filename: string) {
    const filepath = path.resolve(this.path, filename)
    return fs.existsSync(filepath)
  }

  async contents(filename: string) {
    // TODO error checking
    const filepath = path.resolve(this.path, filename)
    return await fs.promises.readFile(filepath, { encoding: "utf-8" })
  }

  async list() {
    return await fs.promises.readdir(this.path)
  }

  async getSubitem(filename: string): Promise<SpecPath> {
    const options = await this.options()
    const fullPath = path.resolve(this.path, filename)
    if (filename.endsWith(".hrx")) {
      return await VirtualSpecPath.fromArchive(fullPath, this.root, options)
    } else {
      return new RealSpecPath(fullPath, this.root, options)
    }
  }
}

class VirtualSpecPath extends SpecPath {
  path: string
  basePath: string
  hrx: HrxItem

  constructor(
    basePath: string,
    hrxItem: HrxItem,
    root?: SpecPath,
    parentOpts?: RunOptions
  ) {
    super(root, parentOpts)
    this.path = path.resolve(basePath, hrxItem.path)
    this.basePath = basePath
    this.hrx = hrxItem
  }

  // Unarchive the given .hrx file and turn it into a spec path
  static async fromArchive(
    hrxPath: string,
    root?: SpecPath,
    parentOpts?: RunOptions
  ) {
    const stream = fs.createReadStream(hrxPath, { encoding: "utf-8" })
    const archive = await archiveFromStream(stream)
    const { dir, name } = path.parse(hrxPath)
    return new VirtualSpecPath(
      path.resolve(dir, name),
      archive,
      root,
      parentOpts
    )
  }

  isDirectory() {
    return this.hrx.isDirectory()
  }

  isArchiveRoot() {
    return this.hrx.path === ""
  }

  async writeToDisk() {
    if (this.hrx.isFile()) {
      const { dir, base, ext } = path.parse(this.path)
      // only write sass and css files (e.g. ignore READMEs, yaml, and errors/warnings)
      // if (![".sass", ".scss", ".css"].includes(ext)) {
      //   return
      // }
      // // ignore output files
      // if (base.startsWith("output")) {
      //   return
      // }
      // recursively create this file's parent directories
      await fs.promises.mkdir(dir, { recursive: true })
      // write this file to disk
      await fs.promises.writeFile(this.path, this.hrx.body, {
        encoding: "utf-8",
      })
    } else {
      // Otherwise, recurse as defined by the base class
      const subitems = await this.items()
      await Promise.all(subitems.map((item) => item.writeToDisk()))
    }
  }

  async cleanup() {
    // TODO this can lead to errors if we don't do stuff sequentially
    await fs.promises.rmdir(this.path, { recursive: true })
  }

  cleanupSync() {
    fs.rmSync(this.path, { recursive: true, force: true })
  }

  async list() {
    if (this.hrx.isFile()) {
      throw new Error("Attempting to list contents of a file")
    }
    return this.hrx.list()
  }

  async getSubitem(itemName: string) {
    const hrx = this.hrx
    const options = await this.options()
    if (hrx.isFile()) {
      throw new Error("Trying to get a subitem of a file")
    }
    return new VirtualSpecPath(
      this.basePath,
      hrx.get(itemName)!,
      this.root,
      options
    )
  }

  has(filename: string) {
    if (!this.hrx.isDirectory()) return false
    return !!this.hrx.get(filename)
  }

  async contents(filename: string) {
    if (!this.hrx.isDirectory()) {
      throw new Error(`Trying to get contents of a file`)
    }
    const item = this.hrx.get(filename)
    if (!item?.isFile()) {
      throw new Error(`${filename} is not a file`)
    }
    return item.body
  }

  async forEachTest(paths: string[], iteratee: SpecIteratee) {
    if (this.isArchiveRoot()) {
      // TODO adjust this so that it only creates files needed for the test
      await this.withRealFiles(async () => {
        await super.forEachTest(paths, iteratee)
      })
    } else {
      await super.forEachTest(paths, iteratee)
    }
  }
}

/**
 * Creates either a physical SpecPath from a directory or a virtual one from an hrx archive
 */
export async function fromPath(specPath: string): Promise<SpecPath> {
  if (path.parse(specPath).ext == ".hrx") {
    return await VirtualSpecPath.fromArchive(specPath)
  }
  return new RealSpecPath(specPath)
}
