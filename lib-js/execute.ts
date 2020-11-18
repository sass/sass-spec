import { SpecDirectory } from "./spec-directory"
import { Compiler } from "./compiler"

interface SuccessResult {
  isSuccess: true
  output: string
  warning?: string
}

interface ErrorResult {
  isSuccess: false
  error: string
}

export type SpecResult = SuccessResult | ErrorResult

/**
 * Return whether the file should have a successful output
 */
function hasOutputFile(dir: SpecDirectory, impl: string) {
  return (
    dir.hasFile(`output-${impl}.css`) ||
    (dir.hasFile("output.css") && !dir.hasFile(`error-${impl}`))
  )
}

/**
 * Get the expected result from running a spec on a directory.
 */
export async function getExpectedResult(
  dir: SpecDirectory,
  impl: string
): Promise<SpecResult> {
  const isSuccessCase = hasOutputFile(dir, impl)
  let resultFilename

  if (isSuccessCase) {
    resultFilename = dir.hasFile(`output-${impl}.css`)
      ? `output-${impl}.css`
      : "output.css"
  } else {
    resultFilename = dir.hasFile(`error-${impl}`) ? `error-${impl}` : "error"
  }

  let warning
  // check if there's a warning
  const warningFilename = dir.hasFile(`warning-${impl}`)
    ? `warning-${impl}`
    : "warning"
  if (dir.hasFile(warningFilename)) {
    warning = await dir.readFile(warningFilename)
  }

  const expected = await dir.readFile(resultFilename)

  if (isSuccessCase) {
    return {
      isSuccess: true,
      output: expected,
      warning,
    }
  } else {
    return {
      isSuccess: false,
      error: expected,
    }
  }
}

export async function getActualResult(
  dir: SpecDirectory,
  impl: string,
  compiler: Compiler
): Promise<SpecResult> {
  const precision = await dir.precision()

  const cmdArgs = []
  // Pass in the indentend option to the command
  if (dir.isIndented()) {
    cmdArgs.push(impl === "dart-sass" ? "--indented" : "--sass")
  }
  if (precision) {
    cmdArgs.push(`--precision`)
    cmdArgs.push(`${precision}`)
  }
  cmdArgs.push(dir.inputFile())

  const { stdout, stderr, status } = await compiler.compile(dir.path, cmdArgs)
  if (status === 0) {
    return {
      isSuccess: true,
      output: stdout,
      warning: stderr,
    }
  } else {
    return {
      isSuccess: false,
      error: stderr,
    }
  }
}
