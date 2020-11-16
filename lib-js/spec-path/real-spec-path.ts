import fs from "fs"
import path from "path"

import { RunOptions } from "../options"
import SpecPath from "./spec-path"
import VirtualSpecPath from "./virtual-spec-path"

export default class RealSpecPath extends SpecPath {
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
