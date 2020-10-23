const fs = require('fs')
const { archiveFromStream } = require('node-hrx')
const { execSync } = require("child_process")

// get the binary to execute
const bin = process.argv[2]

const input = `
.button {
  color black;
}
`

function getTestCases(directory) {
  // if the directory contains an input file, it's a single test directory
  if (!directory.contents) {
    return []
  }
  if (directory.contents['input.scss']) {
    const test = {
      input: directory.contents['input.scss'].body
    }
    if (directory.contents['output.css'])
    test.output = directory.contents[`output.css`].body
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

async function readHrx() {
  const archive = await archiveFromStream(fs.createReadStream('tests/fixtures/basic/basic.hrx', 'utf-8'))
  // const archive = await archiveFromStream(fs.createReadStream('spec/css/comment.hrx', 'utf-8'))
  return getTestCases(archive)
}

function runTest(testCase) {
  const { input, output } = testCase
  const actual = execSync(`${bin} -s -t expanded`, { input, encoding: "utf-8" })
  if (output !== actual) {
    console.error(`Expected ${output}\n\nGot: ${actual}`)
  }
}

async function runAll() {
  const testCases = await readHrx()
  for (const testCase of testCases) {
    if (testCase.output) {
      runTest(testCase)
    }
  }
}

runAll()

// TODO lol this is probably unsafe
// console.log(execSync(`${bin} -s`, { input, encoding: "utf-8" }))