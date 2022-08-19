import {Writable} from 'stream';

/**
 * This reporter is used by linters to report findings and add annotations used
 * by GitHub actions to display enhance the output, for example making paths to
 * the problematic files link to the file in a GitHub repo.
 *
 * This reporter will print out a notice suggesting users to add the flag
 * `--fix` on their linter to automatically fix the linter findings reported
 * as being fixable.
 */
export class GithubActionsReporter {
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

  /** Reports an error and whether it's fixable passing the `--fix` flag. */
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
