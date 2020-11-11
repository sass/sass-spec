import { promises as fs } from "fs"
import path from "path"
import { promisify } from "util"
import { SpecPath } from "../newdirs"

const exec = promisify(require("child_process").exec)

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
  precision?: number
}

export async function getActualResult(dir: string, opts: Options) {
  const { rootDir, impl, bin, precision } = opts
  const files = await fs.readdir(dir)
  const indented = files.includes("input.sass")
  const inputFile = indented ? "input.sass" : "input.scss"

  // const bin = bins[impl]
  const cmdOpts = [`--load-path=${rootDir}`]
  // Pass in the indentend option to the command
  if (indented) {
    cmdOpts.push(impl === "dart-sass" ? "--indented" : "--sass")
  }
  if (precision) {
    cmdOpts.push(`--precision ${precision}`)
  }
  cmdOpts.push(inputFile)
  const cmd = `${bin} ${cmdOpts.join(" ")}`

  try {
    const { stdout, stderr } = await exec(cmd, {
      cwd: dir,
      encoding: "utf-8",
      stdio: "pipe",
    })
    return {
      isSuccess: true,
      output: stdout,
      warning: stderr,
    }
  } catch (e) {
    return {
      isSuccess: false,
      error: e.stderr,
    }
  }
}
