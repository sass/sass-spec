const path = require("path")
const tap = require("tap")
const { getExpectedResult, getActualResult } = require("./execute")
const {
  normalizeOutput,
  extractErrorMessage,
  extractWarningMessages,
} = require("./normalize")

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

async function runSpec(dir, opts) {
  const { rootDir, impl, mode, todoWarning } = opts
  // TODO run t.todo, etc. when mode is enabled
  const relPath = path.relative(rootDir, dir)
  // TODO pass tap in as an option so specs can theoretically be run as subtest
  const testFn = getTestFn(mode, tap)
  await testFn(relPath, async (t) => {
    const expected = await getExpectedResult(dir, impl)
    const actual = await getActualResult(dir, opts)
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

module.exports = {
  runSpec,
}
