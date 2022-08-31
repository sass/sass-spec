import {Writable} from 'stream';
import p from 'path';

/**
 * This reporter is used by linters to report findings. It can also be used by
 * GitHub actions to display enhance the output, for example making paths to the
 * problematic files link to the file in a GitHub repo.
 *
 * This reporter will print out a notice suggesting users to add the flag
 * `--fix` on their linter to automatically fix the linter findings reported
 * as being fixable.
 */
export class LintReporter {
  private errors = 0;
  private readonly lintedFiles = new Set();
  private readonly githubActionsAnnotations: string[] = [];
  private fixableErrorCount = 0;

  constructor(
    private readonly output: Writable,
    private readonly rootPath: string
  ) {}

  /** Reports that the linter checked {@link path}. */
  reportLintedFile(path: string) {
    if (p.isAbsolute(path)) path = p.relative(this.rootPath, path);
    this.lintedFiles.add(path);
  }

  /**
   * Reports an error in {@link relativePath} and whether it's fixable passing
   * the `--fix` flag.
   */
  reportError(message: string, relativePath: string, fixable = false): void {
    this.errors++;
    if (fixable) this.fixableErrorCount++;
    this.output.write(`${relativePath}: ${message}\n`);
    this.githubActionsAnnotations.push(
      `::error file=${escapeProperty(relativePath)},line=1::${escapeData(
        message
      )}`
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
      } while linting ${this.lintedFiles.size} file${
        this.lintedFiles.size === 1 ? '' : 's'
      }.`
    );
    if (this.fixableErrorCount > 0) {
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
