import fs from "fs"
import path from "path"
import yaml from "js-yaml"
import { archiveFromStream, HrxItem } from "node-hrx"
import { getOptionOverrides } from "./lib-js/directory"

type SpecDirCallback = (path: string) => Promise<void>

interface RunOpts {
  todoWarning?: boolean
  mode?: "ignore" | "todo"
  precision?: number
}

type SpecIteratee = (subdir: SpecPath) => Promise<void>

/** Represents an abstract directory used in sass-spec */
export interface SpecPath {
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
  parent(): SpecPath | undefined
  getOptions(impl: string): Promise<RunOpts>
  forEachTest(paths: string[], iteratee: SpecIteratee): Promise<void>
}

abstract class AbstractSpecPath implements SpecPath {
  _parent?: SpecPath
  abstract path: string

  constructor(parent?: SpecPath) {
    this._parent = parent
  }

  relPath() {
    return path.relative(path.resolve(__dirname, "spec"), this.path)
  }

  abstract isArchiveRoot(): boolean
  abstract items(): Promise<SpecPath[]>
  abstract get(filename: string): Promise<string>
  abstract has(filename: string): boolean
  abstract isDirectory(): boolean
  parent() {
    return this._parent
  }

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

  private async getDirectOptions(impl: string) {
    if (this.has("options.yml")) {
      const rawOptions = yaml.safeLoad(await this.get("options.yml")) as any
      return getOptionOverrides(rawOptions, impl)
    }
    return {}
  }

  async getOptions(impl: string) {
    const opts = await this.getDirectOptions(impl)
    const parentOpts = (await this.parent()?.getOptions(impl)) ?? {}
    return { ...parentOpts, ...opts }
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

  constructor(path: string, parent?: SpecPath) {
    super(parent)
    this.path = path
  }

  isDirectory() {
    return fs.statSync(this.path).isDirectory()
  }

  isArchiveRoot() {
    return false
  }

  parent(): SpecPath | undefined {
    if (!this._parent) {
      const dir = path.dirname(this.path)
      const baseDir = path.resolve(__dirname, "spec")
      // FIXME don't hardcode this
      if (this.path !== baseDir) {
        // TODO possibility of caching a parent directory
        this._parent = new RealSpecPath(dir)
      }
    }
    return this._parent
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
    const filenames = await fs.promises.readdir(this.path)
    return await Promise.all(
      filenames.map(async (filename) => {
        const fullPath = path.resolve(this.path, filename)
        if (filename.endsWith(".hrx")) {
          return await VirtualSpecPath.fromArchive(fullPath, this)
        } else {
          return new RealSpecPath(fullPath, this)
        }
      })
    )
  }
}

class VirtualSpecPath extends AbstractSpecPath {
  path: string
  basePath: string
  hrx: HrxItem

  constructor(basePath: string, hrxItem: HrxItem, parent?: SpecPath) {
    super(parent)
    this.path = path.resolve(basePath, hrxItem.path)
    this.basePath = basePath
    this.hrx = hrxItem
  }

  // Unarchive the given .hrx file and turn it into a spec path
  static async fromArchive(hrxPath: string, parent?: SpecPath) {
    const stream = fs.createReadStream(hrxPath, { encoding: "utf-8" })
    const archive = await archiveFromStream(stream)
    const { dir, name } = path.parse(hrxPath)
    return new VirtualSpecPath(path.resolve(dir, name), archive, parent)
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
    return [...hrx].map((itemName) => {
      return new VirtualSpecPath(this.basePath, hrx.get(itemName)!, this)
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
