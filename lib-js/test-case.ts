import { createPatch } from "diff"
import { SpecResult, getExpectedResult, getActualResult } from "./execute"
import { SpecPath } from "./spec-path"
import { optionsForImpl } from "./options"
import {
  normalizeOutput,
  extractErrorMessage,
  extractWarningMessages,
} from "./normalize"
import { Compiler } from "./compiler"

interface Options {
  rootDir: string
  impl: string
  compiler: Compiler
  cmdArgs: string[]
  todoMode?: string
}

interface BasicTestResult {
  type: "pass" | "todo" | "skip"
}

type FailureType =
  | "unexpected_error"
  | "unexpected_success"
  | "output_difference"
  | "error_difference"
  | "warning_difference"
  | "unnecessary_todo"

export interface FailTestResult {
  type: "fail"
  failureType: FailureType
  // TODO determine message from the failure type instead
  message: string
  result: SpecResult
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
      return {
        type: "fail",
        failureType: "unexpected_error",
        message: "Test case should succeed but it did not",
        result: actual,
      }
    }

    const diff = getDiff(
      "output.css",
      normalizeOutput(expected.output),
      normalizeOutput(actual.output)
    )
    if (diff) {
      return {
        type: "fail",
        failureType: "output_difference",
        message: "expected did not match output",
        result: actual,
        diff,
      }
    }

    if ((expected.warning || actual.warning) && !skipWarning) {
      const diff = getDiff(
        "warning",
        extractWarningMessages(expected.warning, impl),
        extractWarningMessages(actual.warning, impl)
      )
      if (diff) {
        return {
          type: "fail",
          failureType: "warning_difference",
          result: actual,
          message: "expected did not match warning",
          diff,
        }
      }
    }
  } else {
    if (actual.isSuccess) {
      return {
        type: "fail",
        failureType: "unexpected_success",
        result: actual,
        message: "Expected test to fail, but it did not",
      }
    }
    const diff = getDiff(
      "error",
      extractErrorMessage(expected.error, impl),
      extractErrorMessage(actual.error, impl)
    )
    if (diff) {
      return {
        type: "fail",
        failureType: "error_difference",
        result: actual,
        message: "expected did not match error",
        diff,
      }
    }
  }

  return { type: "pass" }
}

/**
 * Execute the test case at the given SpecPath, using the provided options.
 */
export async function runTestCase(
  dir: SpecPath,
  opts: Options
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
      return {
        type: "fail",
        failureType: "unnecessary_todo",
        result: actual,
        message: "Expected :todo test to fail but it passed",
      }
    } else {
      return { type: "todo" }
    }
  }
  return testResult
}
