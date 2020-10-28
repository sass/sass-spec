const { promisify } = require("util")
const fs = require("fs")
const path = require("path")
const yaml = require("js-yaml")

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
      await cb(dir)
    }
  }
}

iterateDir("spec", { impl: "dart-sass" }, (dir) => {
  console.log(dir)
})
