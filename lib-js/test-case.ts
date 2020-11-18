import { createPatch } from "diff"
import { SpecResult, getExpectedResult, getActualResult } from "./execute"
import { SpecDirectory } from "./spec-directory"
import { optionsForImpl } from "./options"
import {
  normalizeOutput,
  extractErrorMessage,
  extractWarningMessages,
} from "./normalize"
import { Compiler } from "./compiler"

interface BasicTestResult {
  type: "pass" | "todo" | "skip"
}

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

function makeFailureFactory(failureType: FailureType, message: string) {
  return function (actual: SpecResult, diff?: string): FailTestResult {
    return {
      type: "fail",
      failureType,
      message,
      actual,
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

export interface FailTestResult {
  type: "fail"
  failureType: FailureType
  // TODO determine message from the failure type instead
  message: string
  actual: SpecResult
  diff?: string
}

export type TestResult = BasicTestResult | FailTestResult

function getDiff(filename: string, expected: string, actual: string) {
  if (expected === actual) {
    return
  }
  return createPatch(filename, expected, actual, "expected", "actual")
}

function compareResults(
  impl: string,
  expected: SpecResult,
  actual: SpecResult,
  skipWarning?: boolean
): TestResult {
  if (expected.isSuccess) {
    if (!actual.isSuccess) {
      return failures.UnexpectedError(actual)
    }

    const diff = getDiff(
      "output.css",
      normalizeOutput(expected.output),
      normalizeOutput(actual.output)
    )
    if (diff) {
      return failures.OutputDifference(actual, diff)
    }

    if ((expected.warning || actual.warning) && !skipWarning) {
      const diff = getDiff(
        "warning",
        extractWarningMessages(expected.warning, impl),
        extractWarningMessages(actual.warning, impl)
      )
      if (diff) {
        return failures.WarningDifference(actual, diff)
      }
    }
  } else {
    if (actual.isSuccess) {
      return failures.UnexpectedSuccess(actual)
    }
    const diff = getDiff(
      "error",
      extractErrorMessage(expected.error, impl),
      extractErrorMessage(actual.error, impl)
    )
    if (diff) {
      return failures.ErrorDifference(actual, diff)
    }
  }

  return { type: "pass" }
}

export interface TestCaseOptions {
  impl: string
  compiler: Compiler
  cmdArgs: string[]
  todoMode?: string
}

/**
 * Execute the test case at the given directory, using the provided options.
 */
export async function runTestCase(
  dir: SpecDirectory,
  opts: TestCaseOptions
): Promise<TestResult> {
  const { impl, todoMode } = opts
  const { mode, todoWarning, precision } = optionsForImpl(
    await dir.options(),
    impl
  )
  if (mode === "ignore") {
    return { type: "skip" }
  }

  if (mode === "todo" && !todoMode) {
    return { type: "todo" }
  }

  const [expected, actual] = await Promise.all([
    getExpectedResult(dir, impl),
    getActualResult(dir, { ...opts, precision }),
  ])

  const skipWarning = todoWarning && !todoMode
  const testResult = compareResults(impl, expected, actual, skipWarning)
  // If we're probing todos
  if (mode === "todo" && todoMode === "probe") {
    if (testResult.type === "pass") {
      return failures.UnnecessaryTodo(actual)
    } else {
      return { type: "todo" }
    }
  }
  return testResult
}
