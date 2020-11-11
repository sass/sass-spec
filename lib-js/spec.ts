import path from "path"
import { Test } from "tap"
import { getExpectedResult, getActualResult } from "./execute"
import { SpecPath } from "../newdirs"
import {
  normalizeOutput,
  extractErrorMessage,
  extractWarningMessages,
} from "./normalize"

function getTestFn(
  t: Test,
  mode: string | undefined,
  todoMode: string | undefined
) {
  switch (mode) {
    case "todo":
      return !todoMode ? t.todo : t.test
    case "ignore":
      return t.skip
    default:
      return t.test
  }
}

interface Options {
  rootDir: string
  impl: string
  bin: string
  mode?: string
  todoMode?: string
  todoWarning?: boolean
}

export async function runSpec(tap: Test, dir: SpecPath, opts: Options) {
  const { rootDir, impl, todoMode } = opts
  const { mode, todoWarning } = await dir.getOptions(impl)
  const relPath = path.relative(rootDir, dir.path)
  const testFn = getTestFn(tap, mode, todoMode)

  let childTest: Test
  await testFn(relPath, async (t) => {
    childTest = t
    await dir.withRealFiles(async () => {
      const expected = await getExpectedResult(dir, impl)
      const actual = await getActualResult(dir.path, opts)
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
            extractWarningMessages(expected.warning!, impl),
            `${relPath} warnings should match`
          )
        }
      } else {
        t.notOk(actual.isSuccess, `${relPath} expected error`)
        t.equal(
          extractErrorMessage(actual.error, impl),
          extractErrorMessage(expected.error!, impl),
          `${relPath} errors should match`
        )
      }
      t.end()
    })
  })
  // TAP doesn't actually create a child test object when skipping
  // so mock one out for diagnostics
  if (mode === "todo" && !todoMode) {
    return { counts: { total: 1, todo: 1 } }
  }
  if (mode === "ignore") {
    return { counts: { total: 1, skip: 1 } }
  }
  // TODO instead of returning the entire test, why not just return the result?
  // e.g. `todo`, `fail`, `pass`?
  return childTest!
}
