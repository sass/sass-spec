const path = require("path")
// const tap = require("tap")
const { getExpectedResult, getActualResult } = require("./execute")
const {
  normalizeOutput,
  extractErrorMessage,
  extractWarningMessages,
} = require("./normalize")

function getTestFn(t, mode, todo) {
  switch (mode) {
    case "todo":
      return !todo ? t.todo : t.test
    case "ignore":
      return t.skip
    default:
      return t.test
  }
}

async function runSpec(tap, dir, opts) {
  const { rootDir, impl, mode, todo, todoWarning } = opts
  // TODO run t.todo, etc. when mode is enabled
  const relPath = path.relative(rootDir, dir)
  const testFn = getTestFn(tap, mode, todo)

  let childTest
  await testFn(relPath, async (t) => {
    childTest = t
    const expected = await getExpectedResult(dir, impl)
    const actual = await getActualResult(dir, opts)
    if (expected.isSuccess) {
      t.ok(actual.isSuccess, `${relPath} expected success`)
      t.equal(
        normalizeOutput(actual.output),
        normalizeOutput(expected.output),
        `${relPath} output should match`
      )

      if ((expected.warning || actual.warning) && !todoWarning) {
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
  // TAP doesn't actually create a child test object when skipping
  // so mock one out for diagnostics
  if (mode === "todo") {
    return { counts: { total: 1, todo: 1 } }
  }
  if (mode === "ignore") {
    return { counts: { total: 1, skip: 1 } }
  }
  return childTest
}

module.exports = {
  runSpec,
}
