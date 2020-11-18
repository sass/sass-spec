import fs from "fs"
import path from "path"

import { RunOptions } from "../options"
import SpecDirectory from "./spec-directory"
import VirtualDirectory from "./virtual-directory"

export default class RealDirectory extends SpecDirectory {
  path: string

  constructor(path: string, root?: SpecDirectory, parentOpts?: RunOptions) {
    super(root, parentOpts)
    this.path = path
  }

  isArchiveRoot() {
    return false
  }

  hasFile(filename: string) {
    const filepath = path.resolve(this.path, filename)
    return fs.existsSync(filepath)
  }

  async readFile(filename: string) {
    const filepath = path.resolve(this.path, filename)
    return await fs.promises.readFile(filepath, { encoding: "utf-8" })
  }

  async listFiles() {
    const contents = await fs.promises.readdir(this.path, {
      withFileTypes: true,
    })
    return contents.filter((entry) => entry.isFile()).map((entry) => entry.name)
  }

  async listSubdirs() {
    const contents = await fs.promises.readdir(this.path, {
      withFileTypes: true,
    })
    return contents
      .filter((entry) => entry.isDirectory() || entry.name.endsWith(".hrx"))
      .map((entry) => entry.name)
  }

  async getSubdir(filename: string): Promise<SpecDirectory> {
    const options = await this.options()
    const fullPath = path.resolve(this.path, filename)
    if (filename.endsWith(".hrx")) {
      return await VirtualDirectory.fromArchive(fullPath, this.root, options)
    } else {
      return new RealDirectory(fullPath, this.root, options)
    }
  }

  async writeFile(filename: string, contents: string) {
    const filepath = path.resolve(this.path, filename)
    await fs.promises.writeFile(filepath, contents, { encoding: "utf-8" })
  }

  async removeFile(filename: string) {
    await fs.promises.rm(filename, { force: true })
  }
}
