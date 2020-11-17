import fs from "fs"
import path from "path"
import { Readable } from "stream"
import SpecPath, { SpecIteratee } from "./spec-path"
import { archiveFromStream, Directory as HrxDirectory } from "node-hrx"
import { RunOptions } from "../options"

function createFileCache(dir: HrxDirectory) {
  const cache: Record<string, string> = {}
  for (const itemName of dir) {
    const subitem = dir.get(itemName)
    if (subitem?.isFile()) {
      cache[itemName] = subitem.body
    }
  }
  return cache
}

function createSubdirCache(dir: HrxDirectory) {
  const cache: Record<string, HrxDirectory> = {}
  for (const itemName of dir) {
    const subitem = dir.get(itemName)
    if (subitem?.isDirectory()) {
      cache[itemName] = subitem
    }
  }
  return cache
}

export default class VirtualSpecPath extends SpecPath {
  path: string
  basePath: string
  private fileCache: Record<string, string>
  private subdirCache: Record<string, HrxDirectory>
  private isArchiveRoot: boolean

  constructor(
    basePath: string,
    hrxDir: HrxDirectory,
    root?: SpecPath,
    parentOpts?: RunOptions
  ) {
    super(root, parentOpts)
    this.path = path.resolve(basePath, hrxDir.path)
    this.basePath = basePath
    this.fileCache = createFileCache(hrxDir)
    this.subdirCache = createSubdirCache(hrxDir)
    this.isArchiveRoot = hrxDir.path === ""
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

  static async fromContents(contents: string, path = "/tmp") {
    const stream = Readable.from(contents)
    const archive = await archiveFromStream(stream)
    // TODO where should the temp path be?
    return new VirtualSpecPath(path, archive)
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
    // FIXME replace this with rmSync when we have a higher node version
    fs.rmdirSync(this.path, { recursive: true })
  }

  async files() {
    return Object.keys(this.fileCache)
  }

  async subdirs() {
    return Object.keys(this.subdirCache)
  }

  // FIXME change this to work with file writing
  async getSubitem(itemName: string) {
    const subitem = this.subdirCache[itemName]
    const options = await this.options()
    if (!subitem) {
      throw new Error(`Item does not exist: ${itemName}`)
    }
    return new VirtualSpecPath(this.basePath, subitem, this.root, options)
  }

  hasFile(filename: string) {
    return this.fileCache.hasOwnProperty(filename)
  }

  async contents(filename: string) {
    return this.fileCache[filename]
  }

  async writeFile(filename: string, contents: string) {
    if (this.subdirCache[filename]) {
      throw new Error("Trying to write a subdirectory")
    }
    this.fileCache[filename] = contents
  }

  async removeFile(filename: string) {
    if (this.subdirCache[filename]) {
      throw new Error("Trying to remove a subdirectory")
    }
    delete this.fileCache[filename]
  }

  async forEachTest(paths: string[], iteratee: SpecIteratee) {
    if (this.isArchiveRoot) {
      // TODO adjust this so that it only creates files needed for the test
      await this.withRealFiles(async () => {
        await super.forEachTest(paths, iteratee)
      })
    } else {
      await super.forEachTest(paths, iteratee)
    }
  }
}
