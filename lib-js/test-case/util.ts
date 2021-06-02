import {SpecDirectory} from '../spec-directory';

interface SuccessResult {
  isSuccess: true;
  output: string;
  warning?: string;
}

interface ErrorResult {
  isSuccess: false;
  error: string;
}

/** A result of executing a sass compiler */
export type SassResult = SuccessResult | ErrorResult;

type FailureType =
  // | "todo_warning_nonexistent"
  // | "conflicting_files"
  // | "missing_output"
  | 'unexpected_error'
  | 'unexpected_success'
  | 'output_difference'
  | 'error_difference'
  | 'warning_difference'
  | 'unnecessary_todo';

// TODO split these up into separate types (e.g. `FailureResult | ErrorResult`).
// Spliting up the properties into a union type will be cumbersome when
// results are used as part of a test case across multiple methods (e.g. in `Interactor`).
// When calling `TestResult.result()` across multiple methods with `TestResult` as a signature,
// we need to check each time that we the right type of result before using any sub-properties.
/**
 * The result of a test execution, along with metadata for failures and errors
 */
export interface TestResult {
  type: 'pass' | 'fail' | 'todo' | 'skip' | 'error';
  // If `fail`, the type of failure, message, and possible diff
  failureType?: FailureType;
  message?: string;
  diff?: string;
  // If `error`, the thrown error
  error?: Error;
}

function makeFailureFactory(failureType: FailureType, message: string) {
  return function (diff?: string): TestResult {
    return {
      type: 'fail',
      failureType,
      message,
      diff,
    };
  };
}

export const failures = {
  UnexpectedError: makeFailureFactory(
    'unexpected_error',
    'Test case should succeed but it did not'
  ),
  UnexpectedSuccess: makeFailureFactory(
    'unexpected_success',
    'Expected test to fail but it did not'
  ),
  OutputDifference: makeFailureFactory(
    'output_difference',
    'Expected did not match output'
  ),
  WarningDifference: makeFailureFactory(
    'warning_difference',
    'Expected did not match warning'
  ),
  ErrorDifference: makeFailureFactory(
    'error_difference',
    'Expected did not match error'
  ),
  UnnecessaryTodo: makeFailureFactory(
    'unnecessary_todo',
    'Expected test marked TODO to fail but it passed'
  ),
};

export function getExpectedFiles(impl?: string): string[] {
  return impl
    ? [`output-${impl}.css`, `warning-${impl}`, `error-${impl}`]
    : ['output.css', 'warning', 'error'];
}

// Overwrite the set of results to be equal to the provided result
export async function overwriteResults(
  dir: SpecDirectory,
  actual: SassResult,
  impl?: string
): Promise<void> {
  const [outputFile, warningFile, errorFile] = getExpectedFiles(impl);
  if (actual.isSuccess) {
    await Promise.all([
      dir.writeFile(outputFile, actual.output),
      actual.warning
        ? dir.writeFile(warningFile, actual.warning)
        : dir.removeFile(warningFile),
      dir.removeFile(errorFile),
    ]);
  } else {
    await Promise.all([
      dir.writeFile(errorFile, actual.error),
      dir.removeFile(outputFile),
      dir.removeFile(warningFile),
    ]);
  }
}
