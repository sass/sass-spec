import fs from "fs"
import path from "path"
import yaml from "js-yaml"
import { archiveFromStream, HrxItem } from "node-hrx"

type SpecDirCallback = (path: string) => Promise<void>

export interface RunOptions {
  ignore: string[]
  todo: string[]
  todoWarning: string[]
  precision?: number
}

function mergeOptions(base: RunOptions, ext: RunOptions): RunOptions {
  return {
    ignore: [...base.ignore, ...ext.ignore],
    todo: [...base.todo, ...ext.todo],
    todoWarning: [...base.todoWarning, ...ext.todoWarning],
    precision: ext.precision ?? base.precision,
  }
}

type SpecIteratee = (subdir: SpecPath) => Promise<void>

/**
 * A directory that may contain sass-spec test cases.
 */
export interface SpecPath {
  root: SpecPath
  path: string
  relPath(): string
  list(): Promise<string[]>
  items(): Promise<SpecPath[]>
  // run the callback with the physical files present
  withRealFiles(cb: SpecDirCallback): Promise<void>
  writeToDisk(): Promise<void>
  cleanup(): Promise<void>
  isFile(): boolean
  isDirectory(): boolean
  isArchiveRoot(): boolean
  has(filename: string): boolean
  /** Get the contents of the subfile of this directory */
  contents(filename: string): Promise<string>
  /** Get the subitem with the given name */
  subitem(name: string): Promise<SpecPath>
  options(): Promise<RunOptions>
  forEachTest(paths: string[], iteratee: SpecIteratee): Promise<void>
}

abstract class AbstractSpecPath implements SpecPath {
  private parentOpts?: RunOptions
  private _options?: RunOptions
  private subitems: Record<string, SpecPath>
  root: SpecPath
  abstract path: string

  constructor(root?: SpecPath, parentOpts?: RunOptions) {
    this.root = root ?? this
    this.parentOpts = parentOpts
    this.subitems = {}
  }

  relPath() {
    return path.relative(this.root.path, this.path)
  }

  abstract list(): Promise<string[]>
  abstract isArchiveRoot(): boolean
  protected abstract getSubitem(name: string): Promise<SpecPath>
  abstract contents(filename: string): Promise<string>
  abstract has(filename: string): boolean
  abstract isDirectory(): boolean

  // by default, do nothing
  async writeToDisk(): Promise<void> {}
  async cleanup(): Promise<void> {}

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

  async withRealFiles(cb: SpecDirCallback) {
    await this.writeToDisk()
    try {
      await cb(this.path)
    } finally {
      // TODO handle process exit
      await this.cleanup()
    }
  }

  isFile() {
    return !this.isDirectory()
  }

  private async getDirectOptions(): Promise<RunOptions> {
    const defaultOpts: RunOptions = {
      ignore: [],
      todo: [],
      todoWarning: [],
    }
    if (this.has("options.yml")) {
      const rawOpts: any = yaml.safeLoad(await this.contents("options.yml"))
      if (typeof rawOpts !== "object") {
        // TODO throw a warning/error if not a match
        return defaultOpts
      }
      return {
        precision: rawOpts[":precision"],
        ignore: rawOpts[":ignore_for"] || [],
        todo: rawOpts[":todo"] || [],
        todoWarning: rawOpts[":warning_todo"] || [],
      }
    }
    return defaultOpts
  }

  async options() {
    if (!this._options) {
      const opts = await this.getDirectOptions()
      this._options = this.parentOpts
        ? mergeOptions(this.parentOpts, opts)
        : opts
    }
    return this._options
  }

  isTestDir() {
    return this.has("input.scss") || this.has("input.sass")
  }

  isMatch(paths: string[]) {
    return paths.length === 0 || paths.some((path) => this.path === path)
  }

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

class RealSpecPath extends AbstractSpecPath {
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

class VirtualSpecPath extends AbstractSpecPath {
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
    // TODO handle cases where parent files need to be written
    if (this.hrx.isFile()) {
      // TODO use a tmp directory unless there are external references
      const { dir, base, ext } = path.parse(this.path)
      // only write sass and css files (e.g. ignore READMEs, yaml, and errors/warnings)
      if (![".sass", ".scss", ".css"].includes(ext)) {
        return
      }
      // ignore output files
      if (base.startsWith("output")) {
        return
      }
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
    await fs.promises.rmdir(this.basePath, { recursive: true })
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

export async function fromPath(specPath: string): Promise<SpecPath> {
  if (path.parse(specPath).ext == ".hrx") {
    return await VirtualSpecPath.fromArchive(specPath)
  }
  return new RealSpecPath(specPath)
}
