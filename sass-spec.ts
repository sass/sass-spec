import {fromPath} from './lib-js/spec-directory';
import {Interactor} from './lib-js/interactor';
import {parseArgs, CliArgs} from './lib-js/cli-args';
import TestCase from './lib-js/test-case';
import Tabulator from './lib-js/tabulator';

async function runAllTests() {
  let args_: CliArgs | undefined;
  try {
    const interactor = new Interactor(process.stdin, process.stdout);
    const start = Date.now();
    const args = (args_ = await parseArgs(process.argv.slice(2)));
    const rootPath = args.root;
    const rootDir = await fromPath(rootPath);
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
        args.todoMode
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
    console.log(error.toString());
    process.exitCode = 255;
  } finally {
    args_?.compiler?.shutdown();
  }
}

runAllTests();
