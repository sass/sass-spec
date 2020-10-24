const fs = require('fs')
const { archiveFromStream } = require('node-hrx')
const { execSync } = require("child_process")
const { error } = require('console')

function getTestCases(directory) {
  // if the directory contains an input file, it's a single test directory
  if (!directory.contents) {
    return []
  }
  // TODO handle .sass syntax as well
  if (directory.contents['input.scss']) {
    const test = {
      path: directory.path,
      input: directory.contents['input.scss'].body,
    }
    if (directory.contents['output.css']) {
      test.output = directory.contents[`output.css`].body
    }
    if (directory.contents['error']) {
      test.error = directory.contents['error'].body
    }
    return [test]
    // TODO errors and file specific stuff
  }
  // otherwise, recurse and compile test cases
  let tests = []
  for (const dirname of directory) {
    tests = tests.concat(getTestCases(directory.contents[dirname]))
  }
  return tests
}

const specPath = 'spec/css/plain/null.hrx'

async function readHrx(path) {
  const archive = await archiveFromStream(fs.createReadStream(path, 'utf-8'))
  return getTestCases(archive)
}

const DART_PATH = "sass --stdin"
const LIBSASS_PATH = "../libsass/sassc/bin/sassc --stdin --style expanded"

const bin = DART_PATH

function runTest(basePath, testCase) {
  const { input, output, path } = testCase
  if (input.includes('@import')) {
    console.warn("@import non supported")
    return
  }
  const fullPath = `${basePath}/${path}`
  if (output) {
    const actual = execSync(bin, { input, encoding: "utf-8" })
    if (output.trim() !== actual.trim()) {
      console.error(`${fullPath}\nExpected:\n${output}\n\nGot:\n${actual}`)
    }
  } else if (error) {
    try {
      execSync(bin, { input, encoding: "utf-8" })
      console.error(`Expected an error, but passed`)
    } catch (e) {
      const actual = e.stderr 
      if (error.trim() !== actual.trim()) {
        console.error(`${fullPath}\nExpected:\n${error}\n\nGot:\n${actual}`)
      }
    }
  }
}

async function runHrx(path) {
  const testCases = await readHrx(path)
  for (const testCase of testCases) {
    if (testCase.output) {
      runTest(path, testCase)
    }
  }
}

/**
 * Run HRX tests on all paths in the given directory.
 */
async function runDirectory(directory) {
  
}

runHrx(specPath)