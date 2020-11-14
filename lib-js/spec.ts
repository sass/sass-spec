import { createPatch } from "diff"
import { getExpectedResult, getActualResult } from "./execute"
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
  cmdOpts: string[]
  todoMode?: string
}

interface BasicTestResult {
  type: "pass" | "todo" | "skip"
}

interface TestError {
  message: string
  diff?: string
}

interface FailTestResult {
  type: "fail"
  error: TestError
}

type TestResult = BasicTestResult | FailTestResult

function getDiff(filename: string, expected: string, actual: string) {
  if (expected === actual) {
    return
  }
  return createPatch(filename, expected, actual, "expected", "actual")
}

/**
 * Execute the test case at the given SpecPath, using the provided options.
 */
export async function runSpec(
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
  if (expected.isSuccess !== actual.isSuccess) {
    return {
      type: "fail",
      error: {
        message: `Test case should ${
          expected.isSuccess ? "pass" : "fail"
        } but it did not`,
      },
    }
  }

  if (expected.isSuccess) {
    const diff = getDiff(
      "output.css",
      normalizeOutput(expected.output),
      normalizeOutput(actual.output)
    )
    if (diff) {
      return {
        type: "fail",
        error: { message: "expected did not match output", diff },
      }
    }

    if ((expected.warning || actual.warning) && !todoWarning) {
      const diff = getDiff(
        "warning",
        extractWarningMessages(expected.warning, impl),
        extractWarningMessages(actual.warning, impl)
      )
      if (diff) {
        return {
          type: "fail",
          error: { message: "expected did not match warning", diff },
        }
      }
    }
  } else {
    const diff = getDiff(
      "error",
      extractErrorMessage(expected.error, impl),
      extractErrorMessage(actual.error, impl)
    )
    if (diff) {
      return {
        type: "fail",
        error: { message: "expected did not match error", diff },
      }
    }
  }

  return { type: "pass" }
}
