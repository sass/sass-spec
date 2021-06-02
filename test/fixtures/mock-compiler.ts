import yaml from 'js-yaml';
import {Compiler, Stdio} from '../../lib-js/compiler';
import {SpecDirectory} from '../../lib-js/spec-directory';

class MockCompiler extends Compiler {
  constructor(private readonly specDir: SpecDirectory) {
    super();
  }

  async compile(_: string, args: string[]): Promise<Stdio> {
    // just read the input as yaml and then return its contents
    const contents = await this.specDir.readFile(args[args.length - 1]);
    return yaml.safeLoad(contents) as Stdio;
  }
}

export function mockCompiler(specDir: SpecDirectory): Compiler {
  return new MockCompiler(specDir);
}
