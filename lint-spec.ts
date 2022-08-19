import fs from 'fs';
import path from 'path';
import yargs from 'yargs/yargs';

import {fromPath, SpecDirectory} from './lib-js/spec-directory';
import VirtualDirectory from './lib-js/spec-directory/virtual-directory';
import {GithubActionsReporter} from './lib-js/reporter';

async function lintAllTests() {
  try {
    const rootPath = path.resolve(process.cwd(), 'spec');
    const rootDir = await fromPath(rootPath);
    const reporter = new GithubActionsReporter(
      process.stdout,
      argv.fix ?? false
    );

    await lintDirectory(rootDir, reporter, true);

    reporter.writeSummary();
    process.exitCode = reporter.exitCode();
  } catch (error) {
    console.log(`${error}`);
    process.exitCode = 255;
  }
}

async function lintDirectory(
  directory: SpecDirectory,
  reporter: GithubActionsReporter,
  canBeHrxRoot = false
) {
  if (directory instanceof VirtualDirectory && canBeHrxRoot) {
    const hrxPath = directory.basePath + '.hrx';
    const actualSource = await fs.promises.readFile(hrxPath, {
      encoding: 'utf-8',
    });
    const expectedSource = await directory.asArchive();

    if (actualSource !== expectedSource) {
      if (reporter.fix) {
        await fs.promises.writeFile(hrxPath, expectedSource, {
          encoding: 'utf-8',
        });
      } else {
        reporter.reportError(
          'The file does not match the formatting of the styleguide.',
          getRelativePath(hrxPath),
          true
        );
      }
    }
  }

  if (directory.isTestDir()) {
    reporter.reportLintedFile();
    if (directory.hasFile('input.sass') && directory.hasFile('input.scss')) {
      reporter.reportError(
        `The test directory "${getRelativePath(
          directory.path
        )}" cannot have both input.sass and input.scss`,
        getReportedInputLocation(directory)
      );
    }

    await lintNestedTestDirectories(
      directory,
      getRelativePath(directory.path),
      reporter
    );
  } else {
    for (const subdir of await directory.subdirs()) {
      await lintDirectory(
        subdir,
        reporter,
        !(directory instanceof VirtualDirectory)
      );
    }
  }
}

async function lintNestedTestDirectories(
  directory: SpecDirectory,
  basePath: string,
  reporter: GithubActionsReporter
) {
  for (const subdir of await directory.subdirs()) {
    if (subdir.isTestDir()) {
      reporter.reportError(
        `The test directory "${getRelativePath(
          subdir.path
        )}" cannot be nested in the test directory "${basePath}".`,
        getReportedInputLocation(directory)
      );
    } else {
      await lintNestedTestDirectories(subdir, basePath, reporter);
    }
  }
}

function getReportedInputLocation(directory: SpecDirectory): string {
  if (directory instanceof VirtualDirectory) {
    return getRelativePath(directory.basePath + '.hrx');
  }

  if (directory.hasFile('input.sass')) {
    return getRelativePath(path.resolve(directory.path, 'input.sass'));
  }

  return getRelativePath(path.resolve(directory.path, 'input.scss'));
}

function getRelativePath(filepath: string): string {
  return path.relative(process.cwd(), filepath);
}

const args = yargs(process.argv.slice(2)).boolean('fix');
const argv = args.parseSync();
lintAllTests();
