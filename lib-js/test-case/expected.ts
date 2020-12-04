import { SpecDirectory } from "../spec-directory"
import { SassResult } from "./util"

// Ensure that the directory has exactly one output or error file
function validateOutputs(dir: SpecDirectory, impl: string) {
  if (dir.hasFile(`output-${impl}.css`) && dir.hasFile(`error-${impl}`)) {
    throw new Error(`Found both output and error file for ${impl}.`)
  }

  if (dir.hasFile(`output.css`) && dir.hasFile(`error`)) {
    throw new Error(`Found both \`output.css\` and \`error\` file.`)
  }

  if (!dir.hasFile("output.css") && !dir.hasFile("error")) {
    throw new Error(`Neither \`output.css\` nor \`error\` file found`)
  }
}

function expectsSuccess(dir: SpecDirectory, impl: string) {
  if (dir.hasFile(`output-${impl}.css`)) return true
  if (dir.hasFile(`error-${impl}`)) return false
  return dir.hasFile(`output.css`)
}

function getResultFile(
  dir: SpecDirectory,
  impl: string,
  type: "output" | "error" | "warning"
) {
  const ext = type === "output" ? ".css" : ""
  const overrideFile = `${type}-${impl}${ext}`
  return dir.hasFile(overrideFile) ? overrideFile : `${type}${ext}`
}

/**
 * Get the expected test result for the given spec directory and implementation.
 */
export async function getExpectedResult(
  dir: SpecDirectory,
  impl: string
): Promise<SassResult> {
  validateOutputs(dir, impl)
  const isSuccessCase = expectsSuccess(dir, impl)
  const resultFilename = getResultFile(
    dir,
    impl,
    isSuccessCase ? "output" : "error"
  )
  const expected = await dir.readFile(resultFilename)

  let warning
  // check if there's a warning
  const warningFilename = getResultFile(dir, impl, "warning")
  if (dir.hasFile(warningFilename)) {
    if (!isSuccessCase) {
      throw new Error(`Found warning file for test case expecting failure`)
    }
    warning = await dir.readFile(warningFilename)
  }

  if (isSuccessCase) {
    return { isSuccess: true, output: expected, warning }
  } else {
    return { isSuccess: false, error: expected }
  }
}
