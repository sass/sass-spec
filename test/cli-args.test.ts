import yargs from 'yargs';
import {parseArgs, CliArgs} from '../lib-js/cli-args';

// mock the compiler, since we don't actually care that it's created
jest.mock('../lib-js/compiler');

function wrap(yargs: yargs.Argv<{}>): yargs.Argv<{}> {
  return yargs.fail((msg, error) => {
    throw error;
  });
}

async function parseTestArgs(args: string): Promise<CliArgs> {
  return await parseArgs(args.split(' '), wrap);
}

describe('getArgs', () => {
  it('requires one of --dart or --command', () => {
    expect(() => parseTestArgs('')).rejects.toThrow(
      'Must specify --dart or --command'
    );
  });

  it('populates impl based on --dart', async () => {
    const argv = await parseTestArgs('--dart ../dart-sass');
    expect(argv.impl).toEqual('dart-sass');
  });

  it('populates the todoMode field based on --run-todo and --probe-todo', async () => {
    const argv = await parseTestArgs('--dart ../dart-sass --run-todo');
    expect(argv.todoMode).toEqual('run');
    const argv2 = await parseTestArgs('--dart ../dart-sass --probe-todo');
    expect(argv2.todoMode).toEqual('probe');
  });
});
