import fs from "fs"
import path from "path"
import SpecPath, { SpecIteratee } from "./spec-path"
import { archiveFromStream, Directory as HrxDirectory } from "node-hrx"
import { RunOptions } from "../options"

function createCache(hrxDir: HrxDirectory) {
  const cache: Record<string, string | -1> = {}
  for (const subitemName of hrxDir) {
    const subitem = hrxDir.get(subitemName)
    cache[subitemName] = subitem?.isFile() ? subitem.body : -1
  }
  return cache
}

export default class VirtualSpecPath extends SpecPath {
  path: string
  basePath: string
  hrx: HrxDirectory
  cache: Record<string, string | -1>

  constructor(
    basePath: string,
    hrxDir: HrxDirectory,
    root?: SpecPath,
    parentOpts?: RunOptions
  ) {
    super(root, parentOpts)
    this.path = path.resolve(basePath, hrxDir.path)
    this.basePath = basePath
    this.hrx = hrxDir
    this.cache = createCache(hrxDir)
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

  isArchiveRoot() {
    return this.hrx.path === ""
  }

  private async writeDirectFiles() {
    await fs.promises.mkdir(this.path, { recursive: true })
    const files = await this.files()
    const writableFiles = files.filter((filename) => {
      const { base, ext } = path.parse(filename)
      if (base.startsWith("output")) return false
      if (![".sass", ".scss", ".css"].includes(ext)) return false
      return true
    })
    await Promise.all(
      writableFiles.map(async (filename) => {
        const filepath = path.resolve(this.path, filename)
        await fs.promises.writeFile(filepath, await this.contents(filename), {
          encoding: "utf-8",
        })
      })
    )
  }

  async writeToDisk() {
    await this.writeDirectFiles()
    const subdirs = await this.items()
    await Promise.all(subdirs.map((subdir) => subdir.writeToDisk()))
  }

  async cleanup() {
    // TODO this can lead to errors if we don't do stuff sequentially
    await fs.promises.rmdir(this.path, { recursive: true })
  }

  cleanupSync() {
    fs.rmSync(this.path, { recursive: true, force: true })
  }

  async files() {
    return Object.keys(this.cache).filter(
      (filename) => this.cache[filename] !== -1
    )
  }

  async subdirs() {
    return Object.keys(this.cache).filter(
      (filename) => this.cache[filename] === -1
    )
  }

  // FIXME change this to work with file writing
  async getSubitem(itemName: string) {
    const hrx = this.hrx
    const options = await this.options()
    const subitem = hrx.get(itemName)
    if (!subitem) {
      throw new Error(`Item does not exist: ${itemName}`)
    }
    if (subitem.isFile()) {
      throw new Error("Item is not a directory")
    }

    return new VirtualSpecPath(this.basePath, subitem, this.root, options)
  }

  has(filename: string) {
    return typeof this.cache[filename] === "string"
  }

  async contents(filename: string) {
    const item = this.cache[filename]
    if (item === -1) {
      throw new Error(`Cannot get contents of directory ${filename}`)
    }
    return item
  }

  async writeFile(filename: string, contents: string) {
    if (this.cache[filename] === -1) {
      throw new Error("Trying to write a subdirectory")
    }
    this.cache[filename] = contents
  }

  async removeFile(filename: string) {
    if (this.cache[filename] === -1) {
      throw new Error("Trying to remove a subdirectory")
    }
    delete this.cache[filename]
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
