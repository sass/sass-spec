import { createPatch } from "diff"
import { failures, SassResult, TestResult } from "./util"

// Run a particular spec and print the results as a tap test
export function normalizeOutput(output = "") {
  return (
    output
      .replace(/(\r?\n)+/g, "\n")
      // Normalize paths
      .replace(/[-_/a-zA-Z0-9]+(input\.s[ca]ss)/g, "$1")
      .trim()
  )
}

export function extractErrorMessage(msg: string = "") {
  return (
    normalizeOutput(msg)
      .split("\n")
      .find((line) => line.startsWith("Error:")) ?? ""
  )
}

export function extractWarningMessages(msg: string = "") {
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
      .split("\n")
      .find((line) => /^\s*(DEPRECATION )?WARNING/.test(line)) ?? ""
  )
}

function getDiff(
  filename: string,
  expected: string = "",
  actual: string = "",
  normalizer: (text: string) => string = normalizeOutput
) {
  expected = normalizer(expected)
  actual = normalizer(actual)
  if (expected === actual) {
    return
  }
  return createPatch(filename, expected, actual, "expected", "actual")
}

/**
 * Compare the provided expected and actual results.
 * @param expected the expected results to check
 * @param actual the actual results to check
 * @param trimErrors if true, errors and warnings will be trimmed so only the messages are compared
 * and not line information
 * @param skipWarning if true, skip warning checks
 */
export function compareResults(
  expected: SassResult,
  actual: SassResult,
  trimErrors: boolean,
  skipWarning?: boolean
): TestResult {
  if (expected.isSuccess) {
    if (!actual.isSuccess) {
      return failures.UnexpectedError()
    }

    const diff = getDiff("output.css", expected.output, actual.output)
    if (diff) {
      return failures.OutputDifference(diff)
    }

    if ((expected.warning || actual.warning) && !skipWarning) {
      const normalizer = trimErrors ? extractWarningMessages : normalizeOutput
      const diff = getDiff(
        "warning",
        expected.warning,
        actual.warning,
        normalizer
      )
      if (diff) {
        return failures.WarningDifference(diff)
      }
    }
  } else {
    if (actual.isSuccess) {
      return failures.UnexpectedSuccess()
    }
    const normalizer = trimErrors ? extractErrorMessage : normalizeOutput
    const diff = getDiff("error", expected.error, actual.error, normalizer)
    if (diff) {
      return failures.ErrorDifference(diff)
    }
  }

  return { type: "pass" }
}
