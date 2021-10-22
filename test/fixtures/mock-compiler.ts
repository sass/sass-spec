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
    const result = yaml.load(contents) as Partial<Stdio>;
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      status: result.status ?? null,
    };
  }
}

export function mockCompiler(specDir: SpecDirectory): Compiler {
  return new MockCompiler(specDir);
}
