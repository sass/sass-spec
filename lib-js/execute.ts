import { promises as fs } from "fs"
import { SpecPath } from "../newdirs"

import child_process from "child_process"

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
export async function getExpectedResult(dir: SpecPath, impl: string) {
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
    warning = await dir.get(warningFilename)
  }
  // TODO print warning if expectedWarning is given on an expected error case
  const expected = await dir.get(resultFilename)

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
  bin: string
  cmdOpts: string[]
  precision?: number
}

export async function getActualResult(dir: string, opts: Options) {
  const { rootDir, impl, bin, cmdOpts: _cmdOpts, precision } = opts
  const files = await fs.readdir(dir)
  const indented = files.includes("input.sass")
  const inputFile = indented ? "input.sass" : "input.scss"

  const cmdOpts = [..._cmdOpts]
  cmdOpts.push(`--load-path=${rootDir}`)
  // Pass in the indentend option to the command
  if (indented) {
    cmdOpts.push(impl === "dart-sass" ? "--indented" : "--sass")
  }
  if (precision) {
    cmdOpts.push(`--precision`)
    cmdOpts.push(`${precision}`)
  }
  cmdOpts.push(inputFile)

  const { stdout, stderr, status } = child_process.spawnSync(bin, cmdOpts, {
    cwd: dir,
    encoding: "utf-8",
    stdio: "pipe",
  })
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
