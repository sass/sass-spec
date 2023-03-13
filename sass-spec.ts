import {fromRoot} from './lib/spec-directory';
import {Interactor} from './lib/interactor';
import {parseArgs, CliArgs} from './lib/cli-args';
import TestCase from './lib/test-case';
import Tabulator from './lib/tabulator';

async function runAllTests() {
  let args_: CliArgs | undefined;
  try {
    const interactor = new Interactor(process.stdin, process.stdout);
    const start = Date.now();
    const args = (args_ = await parseArgs(process.argv.slice(2)));
    const rootPath = args.root;
    const rootDir = await fromRoot(rootPath);
    const tabulator = new Tabulator(process.stdout, args.verbose);

    const dirsToTest =
      args.testDirs.length === 0
        ? undefined
        : // Ignore a trailing .hrx because shell completion often adds it and
          // it's clear that it means"everything in the archive".
          args.testDirs.map(dir => dir.replace(/\.hrx$/, ''));

    await rootDir.forEachTest(async testDir => {
      const test = await TestCase.create(
        testDir,
        args.impl,
        args.compiler,
        args.todoMode,
        {
          trimErrors: args.trimErrors,
          skipWarning: args.skipWarning,
          ignoreErrorDiffs: args.ignoreErrorDiffs
        },
      );
      if (test.result().type === 'fail' && args.interactive) {
        await interactor.prompt(test);
      }
      tabulator.tabulate(test);
    }, dirsToTest);

    const end = Date.now();
    const time = (end - start) / 1000;

    tabulator.printResults();
    console.log(`Finished in ${time}s`);
    process.exitCode = tabulator.exitCode();
  } catch (error) {
    console.log(`${error}`);
    process.exitCode = 255;
  } finally {
    args_?.compiler?.shutdown();
  }
}

runAllTests();
