import path from "path"
import tap from "tap"
import { execCompiler } from "../lib-js/compiler"
import { runSpec } from "../lib-js/spec"
import { fromPath } from "../lib-js/spec-path"

const baseOpts = {
  impl: "sass-mock",
  compiler: execCompiler("node"),
  cmdOpts: [`${path.resolve(__dirname, "fixtures/sass-exec-mock.js")}`],
  rootDir: path.resolve(__dirname, "fixtures"),
}

tap.test("executeSpec", async (t) => {
  const dir = await fromPath(path.resolve(__dirname, "fixtures/spec.hrx"))
  await dir.withRealFiles(async () => {
    async function expectResultType(
      t: any,
      subpath: string,
      opts: any,
      expected: string,
      message: string
    ) {
      // Create a new `Test` object so it won't be run as part of the suite
      const subdir = await dir.atPath(subpath)
      const result = await runSpec(subdir, { ...baseOpts, ...opts })
      t.equal(result.type, expected, message)
    }
    // TODO there's gotta be a better way to tally this
    t.test("output cases", async (t) => {
      await expectResultType(
        t,
        "output/pass",
        {},
        "pass",
        "passes if the outputs match"
      )
      await expectResultType(
        t,
        "output/fail-mismatch",
        {},
        "fail",
        "fails if the outputs are mismatched"
      )
      await expectResultType(
        t,
        "output/fail-error",
        {},
        "fail",
        "fails if the spec throws an error"
      )
      t.end()
    })
    t.test("error cases", async (t) => {
      await expectResultType(
        t,
        "error/pass",
        {},
        "pass",
        "passes when the errors match"
      )
      await expectResultType(
        t,
        "error/fail-mismatch",
        {},
        "fail",
        "fails on mismatched errors"
      )
      await expectResultType(
        t,
        "error/fail-output",
        {},
        "fail",
        "fails if the spec passes"
      )
      t.end()
    })

    t.test("warning cases", async (t) => {
      await expectResultType(t, "warning/pass", {}, "pass", "success case")
      await expectResultType(
        t,
        "warning/mismatch",
        {},
        "fail",
        "fail when warnings are different"
      )
      await expectResultType(
        t,
        "warning/missing",
        {},
        "fail",
        "fail when warning is missing"
      )
      await expectResultType(
        t,
        "warning/extraneous",
        {},
        "fail",
        "fail when extraneous warning is present"
      )
      await expectResultType(
        t,
        "warning/todo",
        {},
        "pass",
        "skip warning checks if `:warning_todo` option enabled"
      )
      await expectResultType(
        t,
        "warning/todo",
        { todoMode: "run" },
        "fail",
        "run warning checks if `:warning_todo` option enabled but --run-todo is picked"
      )
      t.end()
    })

    t.test("ignore", async (t) => {
      await expectResultType(
        t,
        "ignore",
        {},
        "skip",
        "marks a test as `skip` when `:ignore_for` option is set"
      )
      t.end()
    })

    t.test("todo", async (t) => {
      await expectResultType(
        t,
        "todo",
        {},
        "todo",
        "marks a test as `todo` when the `:todo` option is set"
      )
      await expectResultType(
        t,
        "todo",
        { todoMode: "run" },
        "fail",
        "runs todos if --run-todo is set"
      )
      t.todo("fails on success if probeTodo is passed as input")
      t.end()
    })
  })
  t.end()
})
