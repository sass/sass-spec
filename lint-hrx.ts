import fs from 'fs';
import p from 'path';
import yargs from 'yargs/yargs';
import fileLinesCount from 'file-lines-count';

import {fromPath, SpecDirectory} from './lib-js/spec-directory';
import RealDirectory from './lib-js/spec-directory/real-directory';
import VirtualDirectory from './lib-js/spec-directory/virtual-directory';
import {GithubActionsReporter} from './lib-js/reporter';

/** The number of lines allowed in HRX files. */
const LINE_THRESHOLD = 500;

/**
 * Verifies all HRX files in the project `spec` directory are under the
 * {@link LINE_THRESHOLD}.
 *
 * HRX files are unwrapped and transformed into real files when
 * {@link reporter.fix} is true.
 *
 * Skips HRX files if they include a top-level `options.yml` file annotated with
 * :todo: or :ignore-for: `lint-hrx`. For example:
 *
 * ```hrx
 * <===> options.yml
 * # Ignored because <SOME REASON>
 * :todo:
 * - lint-hrx
 * ```
 */
async function lintHrxSize(rootPath: string, reporter: GithubActionsReporter) {
  const rootDir = await fromPath(rootPath);
  const tooBig = await bigHrxInTree(rootDir, reporter);

  // No Errors.
  if (tooBig.length === 0) return;

  if (!reporter.fix) {
    const tooBigRelative = tooBig.map(f => p.relative(process.cwd(), f));
    for (const f of tooBigRelative) {
      reporter.reportError(`HRX file exceeds ${LINE_THRESHOLD} lines`, f, true);
    }
    return;
  }

  for (const archivePath of tooBig) {
    await hrxToRealFiles(archivePath);
    // Fixes files recursively.
    await lintHrxSize(archivePath, reporter);
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
async function hrxToRealFiles(archivePath: string) {
  const virtualDir = (await fromPath(archivePath)) as VirtualDirectory;
  fs.mkdirSync(virtualDir.path, {recursive: true});

  for (const f of await virtualDir.listFiles()) {
    const contents = await virtualDir.readFile(f);
    fs.writeFileSync(p.join(virtualDir.path, f), contents);
  }
  for (const d of await virtualDir.subdirs()) {
    const subArchivePath = `${d.path}.hrx`;
    fs.writeFileSync(subArchivePath, await d.asArchive());
  }
  fs.unlinkSync(archivePath);
}

/**
 * Navigates a directory tree to verify all HRX files follow the style guide,
 * such as number of lines in an HRX file.
 */
async function bigHrxInTree(
  dir: SpecDirectory,
  reporter: GithubActionsReporter
): Promise<string[]> {
  if (!(dir instanceof RealDirectory)) return [];

  return [
    ...(await bigHRX(dir, reporter)),
    ...(
      await Promise.all(
        (await dir.subdirs()).map(d => bigHrxInTree(d, reporter))
      )
    ).flat(),
  ];
}

/**
 * Returns the absolute paths to all HRX files in a single {@link dir} that
 * exceed the {@link LINE_THRESHOLD} into the global set {@link tooBig}.
 */
async function bigHRX(
  dir: RealDirectory,
  reporter: GithubActionsReporter
): Promise<string[]> {
  const hrxFiles = (await dir.listFiles())
    .filter(f => p.extname(f) === '.hrx')
    .map(f => p.join(dir.path, f));

  const tooBig: string[] = [];
  for (const f of hrxFiles) {
    reporter.reportLintedFile();

    // Skip XHR files annotated with :ignore-for: or :todo: `lint-hrx`
    const linterAnnotation = (await (await fromPath(f)).options()).getMode(
      'lint-hrx'
    );
    if (linterAnnotation !== undefined) continue;

    const lines = await fileLinesCount(f);
    if (lines > LINE_THRESHOLD) tooBig.push(f);
  }
  return tooBig;
}

(async () => {
  const args = yargs(process.argv.slice(2)).boolean('fix');
  const argv = args.parseSync();
  try {
    const rootPath = p.resolve(process.cwd(), 'spec');
    const reporter = new GithubActionsReporter(process.stdout, !!argv.fix);

    await lintHrxSize(rootPath, reporter);

    reporter.writeSummary();
    process.exitCode = reporter.exitCode();
  } catch (error) {
    console.log(`${error}`);
    process.exitCode = 255;
  }
})();
