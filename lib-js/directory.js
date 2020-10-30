const yaml = require("js-yaml")
const { promises: fs } = require("fs")
const path = require("path")

const { withArchive } = require("./hrx")

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
 * @param iteratee the callback to run on each directory.
 * Called with the directory, and all options along with:
 *   - mode: null | todo | warning | ignore
 */
async function iterateDir(dir, opts, iteratee) {
  const { impl } = opts
  const files = await fs.readdir(dir)
  // If we find an options.yml file, read it and determine if we should go further
  let mode
  if (files.includes("options.yml")) {
    const optsFile = path.resolve(dir, "options.yml")
    const options = yaml.safeLoad(
      await fs.readFile(optsFile, { encoding: "utf-8" })
    )
    if (hasTodo(options, impl)) {
      mode = "todo"
    } else if (hasIgnore(options, impl)) {
      mode = "ignore"
    }
  }
  // Override the mode of options passed in
  const _opts = mode ? { ...opts, mode } : opts

  for (const filename of files) {
    const filepath = path.resolve(dir, filename)
    const filestat = await fs.stat(filepath)
    if (filestat.isDirectory()) {
      // If we run into a subdirectory, recurse into it
      await iterateDir(filepath, _opts, iteratee)
    } else if (filename.endsWith(".hrx")) {
      // If HRX, expand it into a directory and recurse into it
      await withArchive(filepath, async (unarchivedDir) => {
        await iterateDir(unarchivedDir, _opts, iteratee)
      })
    } else if (filename === "input.scss" || filename === "input.sass") {
      // If this directory contains an input file, then run the test on it
      await iteratee(dir, _opts)
    }
  }
}

module.exports = { iterateDir }
