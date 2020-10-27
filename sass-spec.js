const tap = require("tap")
const { promisify } = require("util")
const yaml = require("js-yaml")
const fs = require("fs")
const path = require("path")
const { archiveFromStream } = require("node-hrx")
const child_process = require("child_process")

const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)
const mkdtemp = promisify(fs.mkdtemp)
const rmdir = promisify(fs.rmdir)
const writeFile = promisify(fs.writeFile)
const exec = promisify(child_process.exec)

// All possible output files, to be ignored when writing to directory
const outputFiles = [
  "output.css",
  "output-dart-sass.css",
  "output-libsass.css",
  "error",
  "error-dart-sass",
  "error-libsass",
]

function getArchiveTestCases(rootPath, directory) {
  // if the directory contains an input file, it's a single test directory
  if (!directory.contents) {
    return []
  }
  // TODO handle .sass syntax as well
  if (directory.contents["input.scss"]) {
    const test = {
      path: path.resolve(rootPath, directory.path),
      files: {},
      outputs: {},
    }

    for (const [filename, { body }] of Object.entries(directory.contents)) {
      if (filename === "options.yml") {
        test.options = yaml.safeLoad(body)
      } else if (outputFiles.includes(filename)) {
        test.outputs[filename] = body
      } else {
        test.files[filename] = body
      }
    }

    if (test.files["options.yml"]) {
      test.options = yaml.safeLoad(test.files["options.yml"])
    }

    return [test]
  }
  // otherwise, recurse and compile test cases
  let tests = []
  for (const dirname of directory) {
    tests = tests.concat(
      getArchiveTestCases(rootPath, directory.contents[dirname])
    )
  }
  return tests
}

const bins = {
  "dart-sass": "sass --load-path=spec --no-unicode",
  libsass: `${path.resolve(
    process.cwd(),
    "../libsass/sassc/bin/sassc"
  )} --style expanded --load-path=spec`,
}

const impl = "dart-sass"

const bin = bins[impl]

async function getAllTestCases(directory) {
  const list = await readdir(directory)
  let testCases = []
  for (const filename of list) {
    const file = path.resolve(directory, filename)
    const fileStat = await stat(file)
    if (fileStat.isDirectory()) {
      const newTestCases = await getAllTestCases(file)
      testCases = testCases.concat(newTestCases)
    } else if (file.endsWith(".hrx")) {
      const archive = await archiveFromStream(
        fs.createReadStream(file, "utf-8")
      )
      const newTestCases = await getArchiveTestCases(
        file.replace(".hrx", ""),
        archive
      )
      testCases = testCases.concat(newTestCases)
    } // TODO handle raw .sass files
  }
  return testCases
}

let testCases

function normalizeOutput(output) {
  return output.replace(/\n+/g, "\n").trim()
}

function normalizeError(error) {
  return error.replace(/\r\n/g, "\n")
}

/**
 * Writes the given file contents to a temporary directory
 */
async function writeToDisk(dir, files) {
  for (const [filename, contents] of Object.entries(files)) {
    await writeFile(path.resolve(dir, filename), contents)
  }
}

function escape(text) {
  return text.replace(/\n/g, "\\n").replace(/\r/g, "\\r")
}

async function runner() {
  testCases = await getAllTestCases("spec")
  for (const test of testCases) {
    const { path, options = {}, files, outputs } = test
    const input = files["input.scss"]
    const output = outputs["output.css"]
    const error = outputs["error"]
    tap.test(path, async (t) => {
      // FIXME handle imports
      if (input.includes("@use") || input.includes("@import")) {
        return t.end()
      }
      const testDir = await mkdtemp("archive-")
      await writeToDisk(testDir, files)
      const inputPath = `${testDir}/input.scss`
      if (options[":ignore_for"] && options[":ignore_for"].includes(impl)) {
        return t.end()
      }
      // Ignore if it's a todo for this implementation
      if (
        options[":todo"] &&
        options[":todo"].some((item) => item.includes(impl))
      ) {
        return t.end()
      }
      if (output) {
        if (outputs[`error-${impl}`]) {
          return t.end()
        }
        // write the test files to the directory

        const actual = child_process.execSync(`${bin} ${inputPath}`, {
          encoding: "utf-8",
        })
        const realOutput = outputs[`output-${impl}.css`] || output
        // FIXME proper way to handle this?
        t.equal(normalizeOutput(actual), normalizeOutput(realOutput), path)
        await rmdir(testDir, { recursive: true, force: true })
      } else if (error) {
        const realError = outputs[`error-${impl}`] || error
        try {
          // FIXME test that it doesn't pass
          process.chdir(testDir)
          child_process.execSync(`${bin} input.scss`, {
            encoding: "utf-8",
          })
          // FIXME fail if it doesn't throw
        } catch (e) {
          const actual = normalizeError(e.stderr)
          t.equal(actual, realError, path)
        }
        process.chdir("..")
        await rmdir(testDir, { recursive: true, force: true })
      }
      t.end()
    })
  }
  // TODO delete even if cancelled
}

runner()
