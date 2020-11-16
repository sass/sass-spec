import fs from "fs"
import path from "path"
import SpecPath, { SpecIteratee } from "./spec-path"
import { archiveFromStream, HrxItem } from "node-hrx"
import { RunOptions } from "../options"

export default class VirtualSpecPath extends SpecPath {
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

  async writeFile(filename: string, contents: string) {
    throw new Error("Not implemented")
  }

  async removeFile(filename: string) {
    throw new Error("Not implemented")
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
