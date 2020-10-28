const { archiveFromStream } = require("node-hrx")
const tap = require("tap")
const { promises: fs, createReadStream, rmdir } = require("fs")
const path = require("path")
const yaml = require("js-yaml")
const child_process = require("child_process")

/** Returns whether an options.yml object has a todo for the given impl */
function hasTodo(options, impl) {
  if (!options[":todo"]) return false
  return options[":todo"].some((item) => item.includes(impl))
}

function hasIgnore(options, impl) {
  if (!options[":ignore_for"]) return false
  return options[":ignore_for"].includes(impl)
}

async function writeArchive(basePath, item) {
  const fullPath = path.resolve(basePath, item.path)
  if (item.isDirectory()) {
    // If a directory, make the directory and recurse
    await fs.mkdir(fullPath)
    for (const subitem of item) {
      await writeArchive(basePath, item.contents[subitem])
    }
  } else {
    // We're a file, so write to it
    await fs.writeFile(fullPath, item.body, { encoding: "utf-8" })
  }
}

/**
 * Unarchives the given HRX archive into the filesystem
 */
async function unarchive(parentDir, archiveName) {
  // make a directory for the archive in the given directory
  const dirName = archiveName.replace(".hrx", "")
  const dirPath = path.resolve(parentDir, dirName)
  // await fs.mkdir(dirPath)

  // Unarchive and read the contents
  const archivePath = path.resolve(parentDir, archiveName)
  const archive = await archiveFromStream(
    createReadStream(archivePath, { encoding: "utf-8" })
  )
  await writeArchive(dirPath, archive)
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
  // console.log(dir)
  const { impl } = opts
  const files = await fs.readdir(dir)
  // If we find an options.yml file, read it and determine if we should go further
  if (files.includes("options.yml")) {
    const optsFile = path.resolve(dir, "options.yml")
    const options = yaml.safeLoad(
      await fs.readFile(optsFile, { encoding: "utf-8" })
    )
    // FIXME differentiate behavior of todos
    // If the directory should be ignored or is a todo for this impl, do nothing else
    if (hasTodo(options, impl) || hasIgnore(options, impl)) {
      return
    }
  }
  for (const filename of files) {
    const filepath = path.resolve(dir, filename)
    const filestat = await fs.stat(filepath)
    if (filestat.isDirectory()) {
      // If we run into a subdirectory, recurse into it
      await iterateDir(filepath, opts, cb)
    } else if (filename.endsWith(".hrx")) {
      // If HRX, expand it into a directory and recurse into it
      await unarchive(dir, filename)
      const unarchivedDir = filepath.replace(".hrx", "")
      await iterateDir(unarchivedDir, opts, cb)

      // Delete the directory when we're done
      await fs.rmdir(unarchivedDir, { recursive: true, force: true })
      // TODO cleanup on error
    } else if (filename === "input.scss" || filename === "input.sass") {
      // If this directory contains an input file, then run the test on it
      await cb(dir, opts)
    }
  }
}

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

function normalizeError(error) {
  return error.replace(/\r\n/g, "\n")
}

function escape(text) {
  return text.replace(/\n/g, "\\n").replace(/\r/g, "\\r")
}

/**
 * Run a sass spec test on the given directory with the given options
 */
async function runTest(dir, opts) {
  const { rootDir, impl } = opts
  const relPath = path.relative(rootDir, dir)
  const files = await fs.readdir(dir)
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

  tap.test(relPath, async (t) => {
    if (isSuccessCase) {
      // valid case
      const outputFilename = files.includes(`output-${impl}.css`)
        ? `output-${impl}.css`
        : "output.css"
      const expected = await fs.readFile(path.resolve(dir, outputFilename), {
        encoding: "utf-8",
      })
      const actual = child_process.execSync(cmd, {
        cwd: dir,
        encoding: "utf-8",
      })
      t.equal(normalizeOutput(actual), normalizeOutput(expected), relPath)
    } else {
      // error case
      const errorFilename = files.includes(`error-${impl}`)
        ? `error-${impl}`
        : "error"
      const expected = await fs.readFile(path.resolve(dir, errorFilename), {
        encoding: "utf-8",
      })
      try {
        child_process.execSync(cmd, {
          cwd: dir,
          encoding: "utf-8",
        })
        // TODO fail if the command executes
      } catch (e) {
        const actual = normalizeError(e.stderr)
        t.equal(actual, expected, relPath)
      }
    }
  })

  // run the implementation
}

async function fake(dir) {
  console.log(dir)
}

const impl = "dart-sass"
const rootDir = path.resolve("spec/libsass/base-level-parent/imported")
iterateDir(rootDir, { impl, rootDir }, runTest)
