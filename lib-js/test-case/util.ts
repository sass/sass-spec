import { SpecDirectory } from "../spec-directory"

interface SuccessResult {
  isSuccess: true
  output: string
  warning?: string
}

interface ErrorResult {
  isSuccess: false
  error: string
}

/** A result of executing a sass compiler */
export type SassResult = SuccessResult | ErrorResult

type FailureType =
  // | "todo_warning_nonexistent"
  // | "conflicting_files"
  // | "missing_output"
  | "unexpected_error"
  | "unexpected_success"
  | "output_difference"
  | "error_difference"
  | "warning_difference"
  | "unnecessary_todo"

export interface TestResult {
  type: "pass" | "fail" | "todo" | "skip"
  failureType?: FailureType
  message?: string
  diff?: string
}

function makeFailureFactory(failureType: FailureType, message: string) {
  return function (diff?: string): TestResult {
    return {
      type: "fail",
      failureType,
      message,
      diff,
    }
  }
}

export const failures = {
  UnexpectedError: makeFailureFactory(
    "unexpected_error",
    "Test case should succeed but it did not"
  ),
  UnexpectedSuccess: makeFailureFactory(
    "unexpected_success",
    "Expected test to fail but it did not"
  ),
  OutputDifference: makeFailureFactory(
    "output_difference",
    "Expected did not match output"
  ),
  WarningDifference: makeFailureFactory(
    "warning_difference",
    "Expected did not match warning"
  ),
  ErrorDifference: makeFailureFactory(
    "error_difference",
    "Expected did not match error"
  ),
  UnnecessaryTodo: makeFailureFactory(
    "unnecessary_todo",
    "Expected test marked TODO to fail but it passed"
  ),
}

export function getExpectedFiles(impl?: string) {
  return impl
    ? [`output-${impl}.css`, `warning-${impl}`, `error-${impl}`]
    : ["output.css", "warning", "error"]
}

// Overwrite the set of results to be equal to the provided result
export async function overwriteResults(
  dir: SpecDirectory,
  actual: SassResult,
  impl?: string
) {
  const [outputFile, warningFile, errorFile] = getExpectedFiles(impl)
  if (actual.isSuccess) {
    await Promise.all([
      dir.writeFile(outputFile, actual.output),
      actual.warning
        ? dir.writeFile(warningFile, actual.warning)
        : dir.removeFile(warningFile),
      dir.removeFile(errorFile),
    ])
  } else {
    await Promise.all([
      dir.writeFile(errorFile, actual.error),
      dir.removeFile(outputFile),
      dir.removeFile(warningFile),
    ])
  }
}
