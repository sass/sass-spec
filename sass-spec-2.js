const tap = require("tap")
const { promisify } = require("util")
const fs = require("fs")
const path = require("path")
const yaml = require("js-yaml")
const child_process = require("child_process")
const { assert } = require("console")

const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)
const readFile = promisify(fs.readFile)

/** Returns whether an options.yml object has a todo for the given impl */
function hasTodo(options, impl) {
  if (!options[":todo"]) return false
  return options[":todo"].some((item) => item.includes(impl))
}

function hasIgnore(options, impl) {
  if (!options[":ignore_for"]) return false
  return options[":ignore_for"].includes(impl)
}

/**
 * Run through the given directory
 * @param dir the directory to iterate over
 * @param opts the options to run the thing with:
 *    - impl -- the sass implementation to use
 *    - todo -- whether todos should be run
 * @param cb the callback to run on each directory
 */
async function iterateDir(dir, opts, cb) {
  const { impl } = opts
  const files = await readdir(dir)
  // If we find an options.yml file, read it and determine if we should go further
  if (files.includes("options.yml")) {
    const optsFile = path.resolve(dir, "options.yml")
    const options = yaml.safeLoad(
      await readFile(optsFile, { encoding: "utf-8" })
    )
    // FIXME differentiate behavior of todos
    // If the directory should be ignored or is a todo for this impl, do nothing else
    if (hasTodo(options, impl) || hasIgnore(options, impl)) {
      return
    }
  }
  for (const filename of files) {
    const filepath = path.resolve(dir, filename)
    const filestat = await stat(filepath)
    if (filestat.isDirectory()) {
      // If we run into a subdirectory, recurse into it
      await iterateDir(filepath, opts, cb)
    } else if (filename.endsWith(".hrx")) {
      // If HRX, expand it into a directory and recurse into it
      // Delete the directory when we're done
      // TODO cleanup on error
      // FIXME handle .hrx
    } else if (filename === "input.scss" || filename === "input.sass") {
      // If this directory contains an input file, then run the test on it
      await cb(dir, opts)
    }
  }
}

const impl = "dart-sass"

/**
 * Return whether the file should have a successful output
 */
function hasOutputFile(files, impl) {
  return (
    files.includes(`output-${impl}.css`) ||
    (files.includes("output.css") && !files.includes(`error-${impl}`))
  )
}

const bins = {
  "dart-sass": "sass --load-path=spec --no-unicode",
  libsass: `${path.resolve(
    process.cwd(),
    "../libsass/sassc/bin/sassc"
  )} --style expanded --load-path=spec`,
}

function normalizeOutput(output = "") {
  return output.replace(/\r?\n+/g, "\n").trim()
}

function escape(text) {
  return text.replace(/\n/g, "\\n").replace(/\r/g, "\\r")
}

/**
 * Run a sass spec test on the given directory with the given options
 */
async function runTest(dir, opts) {
  const { impl } = opts
  const files = await readdir(dir)
  // determine whether the syntax is indented or not
  const indented = files.includes("input.sass")
  const inputFile = indented ? "input.sass" : "input.scss"

  const bin = bins[impl]
  // TODO does this work when the cwd is the current directory?
  const cmdOpts = [`--load-path=spec`]
  // Pass in the indentend option to the command
  if (indented) {
    cmdOpts.push(impl === "dart-sass" ? "--indented" : "--sass")
  }
  cmdOpts.push(inputFile)
  const cmd = `${bin} ${cmdOpts.join(" ")}`

  // determine whether this test has a valid output or an error
  const isSuccessCase = hasOutputFile(files, impl)

  process.chdir(dir)
  tap.test(dir, async (t) => {
    if (isSuccessCase) {
      // valid case
      const outputFilename = files.includes(`output-${impl}.css`)
        ? `output-${impl}.css`
        : "output.css"
      const expected = await readFile(path.resolve(dir, outputFilename), {
        encoding: "utf-8",
      })
      const actual = child_process.execSync(cmd, { encoding: "utf-8" })
      // console.log(escape(expected))
      // console.log(escape(actual))
      t.equal(normalizeOutput(actual), normalizeOutput(expected), dir)
    } else {
      // error case
    }
  })

  // run the implementation
}

iterateDir("spec", { impl }, runTest)
