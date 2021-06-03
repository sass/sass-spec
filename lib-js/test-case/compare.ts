import {createPatch} from 'diff';
import {failures, SassResult, TestResult} from './util';

/**
 * Normalize the output of the Sass compiler.
 * Standardizes the number and type of newlines and the paths of input files.
 */
export function normalizeOutput(output: string): string {
  return (
    output
      .replace(/(\r?\n)+/g, '\n')
      // Normalize paths
      .replace(/[-_/a-zA-Z0-9]+(input\.s[ca]ss)/g, '$1')
  );
}

/**
 * Extract the error message of a Sass compiler.
 */
export function extractErrorMessage(msg: string): string {
  return (
    normalizeOutput(msg)
      .split('\n')
      .find(line => line.startsWith('Error:')) ?? ''
  );
}

/**
 * Extract the warning message(s) of a Sass compiler.
 */
export function extractWarningMessages(msg: string): string {
  // TODO fix warning extraction
  // This implementation replicates behavior in the ruby runner, which is broken right now
  // and compares only the first line of the first warning.
  // return (
  //   normalizeOutput(msg)
  //     .split("\n\n")
  //     .filter((line) => /^\s*(DEPRECATION )?WARNING/.test(line))
  //     .join("\n\n")
  return (
    normalizeOutput(msg)
      .split('\n')
      .find(line => /^\s*(DEPRECATION )?WARNING/.test(line)) ?? ''
  );
}

function getDiff(
  filename: string,
  expected = '',
  actual = '',
  normalizer: (text: string) => string = normalizeOutput
): string | undefined {
  expected = normalizer(expected);
  actual = normalizer(actual);
  if (expected === actual) {
    return;
  }
  return createPatch(filename, expected, actual, 'expected', 'actual');
}

interface CompareOptions {
  /**
   * if true, errors and warnings will be trimmed
   * so only the messages are compared and not line information
   */
  trimErrors?: boolean;
  /** If true, skip warning checks */
  skipWarning?: boolean;
}

/**
 * Compare the provided expected and actual results.
 * @param expected the expected results to check
 * @param actual the actual results to check
 * @param options options for comparison
 */
export function compareResults(
  expected: SassResult,
  actual: SassResult,
  {skipWarning, trimErrors}: CompareOptions
): TestResult {
  if (expected.isSuccess) {
    if (!actual.isSuccess) {
      return failures.UnexpectedError();
    }

    const diff = getDiff('output.css', expected.output, actual.output);
    if (diff) {
      return failures.OutputDifference(diff);
    }

    if ((expected.warning || actual.warning) && !skipWarning) {
      const normalizer = trimErrors ? extractWarningMessages : normalizeOutput;
      const diff = getDiff(
        'warning',
        expected.warning,
        actual.warning,
        normalizer
      );
      if (diff) {
        return failures.WarningDifference(diff);
      }
    }
  } else {
    if (actual.isSuccess) {
      return failures.UnexpectedSuccess();
    }
    const normalizer = trimErrors ? extractErrorMessage : normalizeOutput;
    const diff = getDiff('error', expected.error, actual.error, normalizer);
    if (diff) {
      return failures.ErrorDifference(diff);
    }
  }

  return {type: 'pass'};
}
