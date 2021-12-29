import fs from 'fs';
import path from 'path';
import {Writable} from 'stream';
import yargs from 'yargs/yargs';

import {fromPath, SpecDirectory} from './lib-js/spec-directory';
import VirtualDirectory from './lib-js/spec-directory/virtual-directory';

const args = yargs(process.argv.slice(2)).boolean('fix');

const argv = args.parseSync();

class Reporter {
  private output: Writable;
  private errors = 0;
  private lintedFiles = 0;
  private githubActionsAnnotations: string[] = [];
  readonly fix: boolean;
  private fixableErrorCount = 0;

  constructor(output: Writable, fix = false) {
    this.output = output;
    this.fix = fix;
  }

  reportLintedFile() {
    this.lintedFiles++;
  }

  reportError(message: string, path: string, fixable = false): void {
    this.errors++;
    if (fixable) this.fixableErrorCount++;
    this.output.write(`${path}: ${message}\n`);
    this.githubActionsAnnotations.push(
      `::error file=${escapeProperty(path)},line=1::${escapeData(message)}`
    );
  }

  writeSummary(): void {
    if (
      process.env.GITHUB_ACTIONS &&
      this.githubActionsAnnotations.length > 0
    ) {
      this.output.write(`${this.githubActionsAnnotations.join('\n')}\n`);
    }

    this.output.write('\n');
    this.output.write(
      `Found ${this.errors} error${
        this.errors === 1 ? '' : 's'
      } while linting ${this.lintedFiles} file${
        this.lintedFiles === 1 ? '' : 's'
      }.`
    );
    if (this.fixableErrorCount > 0 && !this.fix) {
      this.output.write(
        ` ${this.fixableErrorCount} of them can be fixed automatically by passing the "--fix" flag.`
      );
    }
    this.output.write('\n');
  }

  exitCode(): number {
    return this.errors > 0 ? 1 : 0;
  }
}

function escapeData(s: string): string {
  return s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function escapeProperty(s: string): string {
  return s
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/:/g, '%3A')
    .replace(/,/g, '%2C');
}

async function lintAllTests() {
  try {
    const rootPath = path.resolve(process.cwd(), 'spec');
    const rootDir = await fromPath(rootPath);
    const reporter = new Reporter(process.stdout, argv.fix ?? false);

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
  reporter: Reporter,
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
  reporter: Reporter
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

lintAllTests();
