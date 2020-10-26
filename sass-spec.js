const tap = require("tap")
const { promisify } = require("util")
const yaml = require("js-yaml")
const fs = require("fs")
const path = require("path")
const { archiveFromStream } = require("node-hrx")
const { execSync } = require("child_process")

const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)

// List of the possible supported spec output files
const outputs = {
  "output.css": "output",
  "output-dart-sass.css": "outputDartSass",
  "output-libsass.css": "outputLibSass",
  error: "error",
  "error-dart-sass": "errorDartSass",
  "error-libsass": "errorLibSass",
}

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
    }

    for (const [filename, { body }] of Object.entries(directory.contents)) {
      test.files[filename] = body
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

const DART_PATH = "sass --stdin"
const LIBSASS_PATH = "../libsass/sassc/bin/sassc --stdin --style expanded"

const bin = DART_PATH

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

async function runner() {
  testCases = await getAllTestCases("spec")
  for (const test of testCases) {
    // const { path, input, output, error, options = {} } = test
    // console.log(test)
    // continue
    const { path, options = {}, files } = test
    const input = files["input.scss"]
    const output = files["output.css"]
    tap.test(path, (t) => {
      // FIXME handle imports
      if (input.includes("@use") || input.includes("@import")) {
        return t.end()
      }
      if (output) {
        if (
          options[":ignore_for"] &&
          options[":ignore_for"].includes("dart-sass")
        ) {
          return t.end()
        }
        // Ignore if it's a todo for this implementation
        if (
          options[":todo"] &&
          options[":todo"].some((item) => item.includes("dart-sass"))
        ) {
          return t.end()
        }
        if (test.files["error-dart-sass"]) {
          return t.end()
        }
        const actual = execSync(bin, { input, encoding: "utf-8" })
        const realOutput = test.files["output-dart-sass.css"] || output
        // FIXME proper way to handle this?
        t.equal(normalizeOutput(actual), normalizeOutput(realOutput), path)
        // } else if (error) {
        // try {
        //   // FIXME use .toThrow
        //   execSync(bin, { input, encoding: "utf-8" })
        //   // FIXME fail if it doesn't throw
        // } catch (e) {
        //   const actual = e.stderr
        //   t.equal(actual, error.replace("input.scss", "-"), path)
        // }
      }
      t.end()
    })
  }
}

runner()
