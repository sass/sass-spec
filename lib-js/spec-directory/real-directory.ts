import fs from "fs"
import path from "path"

import SpecOptions from "../options"
import SpecDirectory from "./spec-directory"
import VirtualDirectory from "./virtual-directory"

export default class RealDirectory extends SpecDirectory {
  path: string

  constructor(path: string, root?: SpecDirectory, parentOpts?: SpecOptions) {
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
      .map((entry) => path.parse(entry.name).name)
  }

  async getSubdir(name: string): Promise<SpecDirectory> {
    const options = await this.options()
    const fullPath = path.resolve(this.path, name)
    const archive = fullPath + ".hrx"
    if (fs.existsSync(archive)) {
      return await VirtualDirectory.fromArchive(archive, this.root, options)
    } else {
      return new RealDirectory(fullPath, this.root, options)
    }
  }

  async writeFile(filename: string, contents: string) {
    const filepath = path.resolve(this.path, filename)
    await fs.promises.writeFile(filepath, contents, { encoding: "utf-8" })
  }

  async removeFile(filename: string) {
    await fs.promises.rm(filename, { recursive: true, force: true })
  }
}
