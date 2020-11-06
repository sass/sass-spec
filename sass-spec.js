const tap = require("tap")
const path = require("path")

const { iterateDir } = require("./lib-js/directory")
const { getExpectedResult, getActualResult } = require("./lib-js/execute")

function normalizeOutput(output = "") {
  return (
    output
      .replace(/\r?\n+/g, "\n")
      // Normalize paths
      // TODO what is expected here?
      .replace(/[-_/a-zA-Z0-9]+input\.scss/g, "input.scss")
      .trim()
  )
}

function escape(text) {
  return text.replace(/\n/g, "\\n").replace(/\r/g, "\\r")
}

function getTestFn(mode, t) {
  switch (mode) {
    case "todo":
      return t.todo
    case "ignore":
      return t.skip
    default:
      return t.test
  }
}

function extractErrorMessage(msg, impl) {
  if (impl === "dart-sass") {
    return normalizeOutput(msg)
  }
  return normalizeOutput(msg)
    .split("\n")
    .find((line) => line.startsWith("Error:"))
}

function extractWarningMessages(msg) {
  if (impl === "dart-sass") {
    return normalizeOutput(msg)
  }
  // FIXME this (kinda) replicates behavior in the ruby runner, which is broken right now
  // and only prints out the first warning
  return normalizeOutput(msg)
    .split("\n")
    .find((line) => /^\s*(DEPRECATION )?WARNING/.test(line))
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

async function runTest(dir, opts) {
  const { rootDir, impl, mode, todoWarning } = opts
  // TODO run t.todo, etc. when mode is enabled
  const relPath = path.relative(rootDir, dir)
  const testFn = getTestFn(mode, tap)
  await testFn(relPath, async (t) => {
    const expected = await getExpectedResult(dir, impl)
    const actual = await getActualResult(dir, { ...opts, bin: bins[impl] })
    if (expected.isSuccess) {
      t.ok(actual.isSuccess, `${relPath} expected success`)
      t.equal(
        normalizeOutput(actual.output),
        normalizeOutput(expected.output),
        `${relPath} output should match`
      )

      if (expected.warning && !todoWarning) {
        t.equal(
          extractWarningMessages(actual.warning, impl),
          extractWarningMessages(expected.warning, impl),
          `${relPath} warnings should match`
        )
      }
    } else {
      t.notOk(actual.isSuccess, `${relPath} expected error`)
      t.equal(
        extractErrorMessage(actual.error, impl),
        extractErrorMessage(expected.error, impl),
        `${relPath} errors should match`
      )
    }
    t.end()
  })
}

const impl = "dart-sass"
const rootDir = path.resolve("spec")
const testDir = "spec"
// TODO this might ignore TODOs in a higher directory
iterateDir(testDir, { impl, rootDir }, runTest)

// async function timeTest() {
//   const start = Date.now()
//   await iterateDir(testDir, { impl, rootDir }, executeSpec)
//   const end = Date.now()
//   console.log((end - start) / 1000)
// }

// timeTest()
