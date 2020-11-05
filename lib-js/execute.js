const { promises: fs } = require("fs")
const path = require("path")
const { promisify } = require("util")
const exec = promisify(require("child_process").exec)

/**
 * Return whether the file should have a successful output
 */
function hasOutputFile(files, impl) {
  return (
    files.includes(`output-${impl}.css`) ||
    (files.includes("output.css") && !files.includes(`error-${impl}`))
  )
}

/**
 * Get the expected result from running a spec on a directory.
 */
async function getExpectedResult(dir, impl) {
  const files = await fs.readdir(dir)

  const isSuccessCase = hasOutputFile(files, impl)
  let resultFilename

  if (isSuccessCase) {
    resultFilename = files.includes(`output-${impl}.css`)
      ? `output-${impl}.css`
      : "output.css"
  } else {
    resultFilename = files.includes(`error-${impl}`) ? `error-${impl}` : "error"
  }

  let warning
  // check if there's a warning
  const warningFilename = files.includes(`warning-${impl}`)
    ? `warning-${impl}`
    : "warning"
  if (files.includes(warningFilename)) {
    warning = await fs.readFile(path.resolve(dir, warningFilename), {
      encoding: "utf-8",
    })
  }
  // TODO print warning if expectedWarning is given on an expected error case
  const expected = await fs.readFile(path.resolve(dir, resultFilename), {
    encoding: "utf-8",
  })

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

async function getActualResult(dir, opts) {
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

module.exports = {
  getExpectedResult,
  getActualResult,
}
