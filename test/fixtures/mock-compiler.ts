import path from "path"
import fs from "fs"
import yaml from "js-yaml"
import { Compiler, Stdio } from "../../lib-js/compiler"

export const mockCompiler: Compiler = {
  async compile(dir, args) {
    // just read the input as yaml and then return its contents
    const contents = await fs.promises.readFile(
      path.resolve(dir, args[args.length - 1]),
      { encoding: "utf-8" }
    )
    return yaml.safeLoad(contents) as Stdio
  },
}
