import yaml from "js-yaml"
import { Compiler, Stdio } from "../../lib-js/compiler"
import { SpecDirectory } from "../../lib-js/spec-directory"

export function mockCompiler(specDir: SpecDirectory): Compiler {
  return {
    async compile(_, args) {
      // just read the input as yaml and then return its contents
      const contents = await specDir.readFile(args[args.length - 1])
      return yaml.safeLoad(contents) as Stdio
    },
  }
}
