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
  // const testFn = getTestFn(tap, mode, todoMode)

  const [expected, actual] = await Promise.all([
    getExpectedResult(dir, impl),
    getActualResult(dir, { ...opts, precision }),
  ])
  if (expected.isSuccess) {
    if (!actual.isSuccess) {
      return {
        type: "fail",
        error: { message: "Test case should succeed, but it did not" },
      }
    }

    const actualOutput = normalizeOutput(actual.output)
    const expectedOutput = normalizeOutput(expected.output)
    if (actualOutput !== expectedOutput) {
      return {
        type: "fail",
        error: {
          message: "expected did not match output",
          diff: createPatch(
            "output.css",
            expectedOutput,
            actualOutput,
            "expected",
            "actual"
          ),
        },
      }
    }

    if ((expected.warning || actual.warning) && !todoWarning) {
      const actualWarning = extractWarningMessages(actual.warning ?? "", impl)
      const expectedWarning = extractWarningMessages(
        expected.warning ?? "",
        impl
      )
      if (actualWarning !== expectedWarning) {
        return {
          type: "fail",
          error: {
            message: "expected did not match warning",
            diff: createPatch(
              "warning",
              expectedWarning,
              actualWarning,
              "expected",
              "actual"
            ),
          },
        }
      }
    }
  } else {
    if (actual.isSuccess) {
      return {
        type: "fail",
        error: { message: "Test case should fail, but it did not" },
      }
    }
    const actualError = extractErrorMessage(actual.error ?? "", impl)
    const expectedError = extractErrorMessage(expected.error ?? "", impl)
    if (actualError !== expectedError) {
      return {
        type: "fail",
        error: {
          message: "expected did not match warning",
          diff: createPatch(
            "error",
            expectedError,
            actualError,
            "expected",
            "actual"
          ),
        },
      }
    }
  }

  return { type: "pass" }
}
