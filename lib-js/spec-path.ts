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
  items(): Promise<SpecPath[]>
  // run the callback with the physical files present
  withRealFiles(cb: SpecDirCallback): Promise<void>
  writeToDisk(): Promise<void>
  cleanup(): Promise<void>
  isFile(): boolean
  isDirectory(): boolean
  isArchiveRoot(): boolean
  has(filename: string): boolean
  get(filename: string): Promise<string>
  options(): Promise<RunOptions>
  forEachTest(paths: string[], iteratee: SpecIteratee): Promise<void>
}

abstract class AbstractSpecPath implements SpecPath {
  private parentOpts?: RunOptions
  root: SpecPath
  abstract path: string

  constructor(root?: SpecPath, parentOpts?: RunOptions) {
    this.root = root ?? this
    this.parentOpts = parentOpts
  }

  relPath() {
    return path.relative(this.root.path, this.path)
  }

  abstract isArchiveRoot(): boolean
  abstract items(): Promise<SpecPath[]>
  abstract get(filename: string): Promise<string>
  abstract has(filename: string): boolean
  abstract isDirectory(): boolean

  // by default, do nothing
  async writeToDisk(): Promise<void> {}
  async cleanup(): Promise<void> {}

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
      const rawOpts: any = yaml.safeLoad(await this.get("options.yml"))
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
    const opts = await this.getDirectOptions()
    return this.parentOpts ? mergeOptions(this.parentOpts, opts) : opts
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

  async get(filename: string) {
    // TODO error checking
    const filepath = path.resolve(this.path, filename)
    return await fs.promises.readFile(filepath, { encoding: "utf-8" })
  }

  async items(): Promise<SpecPath[]> {
    if (this.isFile()) return []
    const options = await this.options()
    const filenames = await fs.promises.readdir(this.path)
    return await Promise.all(
      filenames.map(async (filename) => {
        const fullPath = path.resolve(this.path, filename)
        if (filename.endsWith(".hrx")) {
          return await VirtualSpecPath.fromArchive(fullPath, this.root, options)
        } else {
          return new RealSpecPath(fullPath, this.root, options)
        }
      })
    )
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

  async items(): Promise<SpecPath[]> {
    const hrx = this.hrx
    if (hrx.isFile()) {
      return []
    }
    const options = await this.options()
    return [...hrx].map((itemName) => {
      return new VirtualSpecPath(
        this.basePath,
        hrx.get(itemName)!,
        this.root,
        options
      )
    })
  }

  has(filename: string) {
    if (!this.hrx.isDirectory()) return false
    return !!this.hrx.get(filename)
  }

  async get(filename: string) {
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

export function fromPath(path: string): SpecPath {
  return new RealSpecPath(path)
}
