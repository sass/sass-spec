import { SpecPath } from "./spec-path"
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
function hasOutputFile(dir: SpecPath, impl: string) {
  return (
    dir.has(`output-${impl}.css`) ||
    (dir.has("output.css") && !dir.has(`error-${impl}`))
  )
}

/**
 * Get the expected result from running a spec on a directory.
 */
export async function getExpectedResult(
  dir: SpecPath,
  impl: string
): Promise<SpecResult> {
  const isSuccessCase = hasOutputFile(dir, impl)
  let resultFilename

  if (isSuccessCase) {
    resultFilename = dir.has(`output-${impl}.css`)
      ? `output-${impl}.css`
      : "output.css"
  } else {
    resultFilename = dir.has(`error-${impl}`) ? `error-${impl}` : "error"
  }

  let warning
  // check if there's a warning
  const warningFilename = dir.has(`warning-${impl}`)
    ? `warning-${impl}`
    : "warning"
  if (dir.has(warningFilename)) {
    warning = await dir.contents(warningFilename)
  }
  // TODO print warning if expectedWarning is given on an expected error case
  const expected = await dir.contents(resultFilename)

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

// TODO dedupe with the Options in `directory`
interface Options {
  rootDir: string
  impl: string
  compiler: Compiler
  cmdArgs: string[]
  precision?: number
}

export async function getActualResult(
  dir: SpecPath,
  opts: Options
): Promise<SpecResult> {
  const { rootDir, impl, cmdArgs: _cmdArgs, precision, compiler } = opts
  const indented = dir.has("input.sass")
  const inputFile = indented ? "input.sass" : "input.scss"

  const cmdArgs = [..._cmdArgs]
  cmdArgs.push(`--load-path=${rootDir}`)
  // Pass in the indentend option to the command
  if (indented) {
    cmdArgs.push(impl === "dart-sass" ? "--indented" : "--sass")
  }
  if (precision) {
    cmdArgs.push(`--precision`)
    cmdArgs.push(`${precision}`)
  }
  cmdArgs.push(inputFile)

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
