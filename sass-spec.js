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

/**
 * Writes the HRX item (file or directory) to disk as physical files at the given archive base path.
 */
async function writeToDisk(basePath, item) {
  const fullPath = path.resolve(basePath, item.path)
  if (item.isDirectory()) {
    // If a directory, make the directory and recurse
    await fs.mkdir(fullPath)
    for (const subitem of item) {
      await writeToDisk(basePath, item.contents[subitem])
    }
  } else {
    // We're a file, so write to it
    await fs.writeFile(fullPath, item.body, { encoding: "utf-8" })
  }
}

/**
 * Unarchives the given HRX archive into the filesystem
 */
async function unarchive(filepath) {
  const { dir, name } = path.parse(filepath)
  // make a directory for the archive in the given directory
  const dirPath = path.resolve(dir, name)

  // Unarchive and read the contents
  const archive = await archiveFromStream(
    createReadStream(filepath, { encoding: "utf-8" })
  )
  await writeToDisk(dirPath, archive)
}

/**
 * Run the given callback on the HRX archive at the given path
 */
async function withArchive(filepath, callback) {
  await unarchive(filepath)
  const unarchivedDir = filepath.replace(".hrx", "")
  await callback(unarchivedDir)

  // Delete the directory when we're done
  await fs.rmdir(unarchivedDir, { recursive: true, force: true })
  // TODO handle errors and process exit
}

/**
 * Run through the given directory
 * @param dir the directory to iterate over
 * @param opts the options to run the thing with:
 *    - impl -- the sass implementation to use
 *    - todo -- whether todos should be run
 * @param iteratee the callback to run on each directory
 */
async function iterateDir(dir, opts, iteratee) {
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
      await iterateDir(filepath, opts, iteratee)
    } else if (filename.endsWith(".hrx")) {
      // If HRX, expand it into a directory and recurse into it
      await withArchive(filepath, async (unarchivedDir) => {
        await iterateDir(unarchivedDir, opts, iteratee)
      })
    } else if (filename === "input.scss" || filename === "input.sass") {
      // If this directory contains an input file, then run the test on it
      await iteratee(dir, opts)
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
  "dart-sass": `${path.resolve(
    process.cwd(),
    "../dart-sass/bin/sass.exe"
  )} --no-unicode`,
  libsass: `${path.resolve(
    process.cwd(),
    "../libsass/sassc/bin/sassc"
  )} --style expanded`,
}

function normalizeOutput(output = "") {
  return output.replace(/\r?\n+/g, "\n").trim()
}

function escape(text) {
  return text.replace(/\n/g, "\\n").replace(/\r/g, "\\r")
}

/**
 * Executes the spec at `dir` and return an object representing the test results of that spec.
 */
async function executeSpec(dir, opts) {
  const { rootDir, impl } = opts
  const files = await fs.readdir(dir)
  const indented = files.includes("input.sass")
  const inputFile = indented ? "input.sass" : "input.scss"

  const bin = bins[impl]
  const cmdOpts = [`--load-path=${rootDir}`]
  // Pass in the indentend option to the command
  if (indented) {
    cmdOpts.push(impl === "dart-sass" ? "--indented" : "--sass")
  }
  cmdOpts.push(inputFile)
  const cmd = `${bin} ${cmdOpts.join(" ")}`

  const isSuccessCase = hasOutputFile(files, impl)
  let expectedFilename

  if (isSuccessCase) {
    expectedFilename = files.includes(`output-${impl}.css`)
      ? `output-${impl}.css`
      : "output.css"
  } else {
    expectedFilename = files.includes(`error-${impl}`)
      ? `error-${impl}`
      : "error"
  }
  const expected = await fs.readFile(path.resolve(dir, expectedFilename), {
    encoding: "utf-8",
  })
  let actual, resultType
  try {
    actual = child_process.execSync(cmd, {
      cwd: dir,
      encoding: "utf-8",
      stdio: "pipe",
    })
    resultType = "success"
  } catch (e) {
    resultType = "error"
    actual = e.stderr
  }

  return {
    expected,
    actual,
    expectedType: isSuccessCase ? "success" : "error",
    actualType: resultType,
  }
}

async function runTest(dir, opts) {
  const { rootDir } = opts
  const relPath = path.relative(rootDir, dir)
  await tap.test(relPath, async (t) => {
    const { expected, actual, expectedType, actualType } = await executeSpec(
      dir,
      opts
    )
    t.equal(
      actualType,
      expectedType,
      `${relPath} expected ${expectedType} but got ${actualType}`
    )
    t.equal(
      normalizeOutput(actual),
      normalizeOutput(expected),
      `${relPath} output differs`
    )
    t.end()
  })
}

const impl = "dart-sass"
const rootDir = path.resolve("spec")
const testDir = "spec"
// TODO this might ignore TODOs in a higher directory
iterateDir(testDir, { impl, rootDir }, runTest)
