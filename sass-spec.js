const { promisify } = require("util")
const yaml = require("js-yaml")
const fs = require("fs")
const path = require("path")
const { archiveFromStream } = require("node-hrx")
const { execSync } = require("child_process")
const { error } = require("console")

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
      input: directory.contents["input.scss"].body,
    }

    for (const [filename, outputProp] of Object.entries(outputs)) {
      if (directory.contents[filename]) {
        test[outputProp] = directory.contents[filename].body
      }
    }

    if (directory.contents["options.yml"]) {
      test.options = yaml.safeLoad(directory.contents["options.yml"].body)
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

function runTest(basePath, testCase) {
  const { input, output, path } = testCase
  if (input.includes("@import")) {
    console.warn("@import non supported, skipping")
    return
  }
  const fullPath = `${basePath}/${path}`
  if (output) {
    const actual = execSync(bin, { input, encoding: "utf-8" })
    if (output.trim() !== actual.trim()) {
      console.error(`${fullPath}\nExpected:\n${output}\n\nGot:\n${actual}`)
    } else {
      // console.log(`${fullPath} ✅`)
    }
  } else if (error) {
    try {
      execSync(bin, { input, encoding: "utf-8" })
      console.error(`Expected an error, but passed`)
    } catch (e) {
      const actual = e.stderr
      if (error.trim() !== actual.trim()) {
        console.error(`${fullPath}\nExpected:\n${error}\n\nGot:\n${actual}`)
      } else {
        // console.log(`${fullPath} ✅`)
      }
    }
  }
}

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

async function runner() {
  const testCases = await getAllTestCases("spec")
  for (const testCase of testCases) {
    console.log(testCase)
  }
}

runner()
