import fileLinesCount from 'file-lines-count';
import fs from 'fs';
import p from 'path';
import yargs from 'yargs/yargs';

import {LintReporter} from './lib/lint-reporter';
import {fromRoot, SpecDirectory} from './lib/spec-directory';
import RealDirectory from './lib/spec-directory/real-directory';
import VirtualDirectory from './lib/spec-directory/virtual-directory';

async function lintAllTests(fix: boolean) {
  //try {
    const rootPath = p.resolve(process.cwd(), 'spec');
    const rootDir = await fromRoot(rootPath) as RealDirectory;
    const reporter = new LintReporter(process.stdout, rootPath);

    await lintDirectory(rootDir, reporter, {canBeHrxRoot: true, fix});
    await lintHrxSize(rootDir, reporter, {fix});

    reporter.writeSummary();
    process.exitCode = reporter.exitCode();
  // } catch (error) {
  //   console.log(`${error}`);
  //   process.exitCode = 255;
  // }
}

async function lintDirectory(
  directory: SpecDirectory,
  reporter: LintReporter,
  {canBeHrxRoot = false, fix = false}
) {
  if (directory instanceof VirtualDirectory && canBeHrxRoot) {
    const hrxPath = directory.basePath + '.hrx';
    const actualSource = await fs.promises.readFile(hrxPath, {
      encoding: 'utf-8',
    });
    const expectedSource = await directory.asArchive();

    if (actualSource !== expectedSource) {
      if (fix) {
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
    reporter.reportLintedFile(directory.path);
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

    await lintNonHrxTestDir(directory, reporter, {fix});
  } else {
    for (const subdir of await directory.subdirs()) {
      await lintDirectory(subdir, reporter, {
        canBeHrxRoot: !(directory instanceof VirtualDirectory),
        fix,
      });
    }
  }
}

async function lintNestedTestDirectories(
  directory: SpecDirectory,
  basePath: string,
  reporter: LintReporter
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
    return getRelativePath(p.resolve(directory.path, 'input.sass'));
  }

  return getRelativePath(p.resolve(directory.path, 'input.scss'));
}

function getRelativePath(filepath: string): string {
  return p.relative(process.cwd(), filepath);
}

/**
 * Verifies that test directories are stored as HRX files.
 *
 * Test directories are transformed into HRX files when {@link fix} is
 * `true`.
 *
 * Skips directories that include a top-level `options.yml` file annotated with
 * `:todo:` or `:ignore-for:` containing `lint-hrx` or `sass/sass-spec#ISSUE`.
 * This allows keeping a real directory when files contain invalid UTF-8 or a BOM, as
 * those cannot be represented in HRX files.
 */
async function lintNonHrxTestDir(
  directory: SpecDirectory,
  reporter: LintReporter,
  {fix = false}
) {
  if (!directory.isTestDir()) return;

  if (directory instanceof VirtualDirectory) return;

  const options = await directory.options();

  const linterAnnotation =
    options.getMode('lint-hrx') ?? options.getMode('sass/sass-spec#');
  // Skip XHR files annotated with :ignore-for: or :todo: containing
  // `lint-hrx` or `sass/sass-spec#...`
  if (linterAnnotation !== undefined) return;

  if (!fix) {
    reporter.reportError(
      `The test directory "${getRelativePath(
        directory.path
      )}" must use the HRX format.`,
      getReportedInputLocation(directory)
    );
  } else {
    fs.writeFileSync(`${directory.path}.hrx`, await directory.asArchive());

    fs.rmSync(directory.path, {recursive: true});
  }
}

/** The number of lines allowed in HRX files. */
const LINE_THRESHOLD = 500;

/**
 * Verifies all HRX files in {@link dir} directory are under the {@link
 * LINE_THRESHOLD}.
 *
 * HRX files are unwrapped and transformed into real files when {@link fix} is
 * `true`.
 */
async function lintHrxSize(
  dir: RealDirectory,
  reporter: LintReporter,
  {fix = false}
) {
  const tooBig = await bigHrx(dir, reporter);

  // No Errors.
  if (tooBig.length === 0) return;

  if (!fix) {
    for (const dir of tooBig) {
      reporter.reportError(`HRX file exceeds ${LINE_THRESHOLD} lines`, getRelativePath(dir.path), true);
    }
  } else {
    for (const archive of tooBig) {
      await hrxToRealFiles(archive);
      // Fixes files recursively.
      await lintHrxSize((await dir.atPath(archive.relPath())) as RealDirectory, reporter, {fix});
    }
  }
}

/**
 * Transforms one level of a given HRX file into real files.
 *
 * Given:
 * ```
 * root
 * |- foo.hrx        (real)
 *    |- file1       (virtual)
 *    |- file2       (virtual)
 *    |- dir1        (virtual)
 *    |  |- file2    (virtual)
 *    |  |- dir2     (virtual)
 *    |     |- dir3  (virtual)
 *    |- dir4        (virtual)
 * ```
 *
 * Deletes `foo.hrx` and generates:
 * ```
 * root
 * |- foo            (real)
 *    |- file1       (real)
 *    |- file2       (real)
 *    |- dir1.hrx    (real)
 *    |  |- file2    (virtual)
 *    |  |- dir2     (virtual)
 *    |     |- dir3  (virtual)
 *    |- dir4.hrx    (real)
 * ```
 *
 */
async function hrxToRealFiles(archive: VirtualDirectory) {
  fs.mkdirSync(archive.path, {recursive: true});

  for (const file of await archive.listFiles()) {
    const contents = await archive.readFile(file);
    fs.writeFileSync(p.join(archive.path, file), contents);
  }
  for (const subdir of await archive.subdirs()) {
    const subArchivePath = `${subdir.path}.hrx`;
    fs.writeFileSync(subArchivePath, await subdir.asArchive());
  }
  fs.unlinkSync(archive.path);
}

/**
 * Returns the absolute paths of all HRX files in {@link dir} that exceed the
 * {@link LINE_THRESHOLD}.
 *
 * Skips HRX files that include a top-level `options.yml` file annotated with
 * `:todo:` or `:ignore-for:` containing `lint-hrx` or `sass/sass-spec#ISSUE`.
 * For example:
 *
 * ```hrx
 * <===> options.yml
 * # Ignored because <SOME REASON>
 * :todo:
 * - sass/sass-spec#1817
 * ```
 * or
 * ```hrx
 * <===> options.yml
 * # Ignored because <SOME REASON>
 * :ignore_for:
 * - lint-hrx
 * ```
 */
async function bigHrx(
  dir: RealDirectory,
  reporter: LintReporter
): Promise<VirtualDirectory[]> {
  const tooBig: VirtualDirectory[] = [];
  for (const subdir of await dir.subdirs()) {
    if (subdir.isTestDir()) continue;
    if (subdir instanceof RealDirectory) {
      tooBig.push(...await bigHrx(subdir, reporter));
      continue;
    }

    const hrxPath = subdir.path + '.hrx';
    reporter.reportLintedFile(hrxPath);

    const options = await subdir.options();
    const linterAnnotation =
      options.getMode('lint-hrx') ?? options.getMode('sass/sass-spec#');
    // Skip XHR files annotated with :ignore-for: or :todo: containing
    // `lint-hrx` or `sass/sass-spec#...`
    if (linterAnnotation !== undefined) continue;

    const lines = await fileLinesCount(hrxPath);
    if (lines > LINE_THRESHOLD) tooBig.push(subdir as VirtualDirectory);
  }
  return tooBig;
}

const args = yargs(process.argv.slice(2)).boolean('fix');
const argv = args.parseSync();
lintAllTests(argv.fix ?? false);
