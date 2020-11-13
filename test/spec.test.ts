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
    async function runWithOpts(subpath: string, opts?: any) {
      // Create a new `Test` object so it won't be run as part of the suite
      const t = new tap.Test()
      const subdir = await dir.atPath(subpath)
      await runSpec(t, subdir, { ...baseOpts, ...opts })
      t.end()
      // console.log(subdir, t.counts)
      return t
    }
    // TODO there's gotta be a better way to tally this
    t.test("output cases", async (t) => {
      t.equal(
        (await runWithOpts("output/pass")).counts.fail,
        0,
        "passes if the outputs match"
      )
      t.notEqual(
        (await runWithOpts("output/fail-mismatch")).counts.fail,
        0,
        "fails if the outputs are mismatched"
      )
      t.notEqual(
        (await runWithOpts("output/fail-error")).counts.fail,
        0,
        "fails if the spec throws an error"
      )
      t.end()
    })
    t.test("error cases", async (t) => {
      t.equal(
        (await runWithOpts("error/pass")).counts.fail,
        0,
        "passes when errors match"
      )
      t.notEqual(
        (await runWithOpts("error/fail-mismatch")).counts.fail,
        0,
        "fails on mismatched errors"
      )
      t.notEqual(
        (await runWithOpts("error/fail-output")).counts.fail,
        0,
        "fails if the spec passes"
      )
      t.end()
    })

    t.test("warning cases", async (t) => {
      t.equal(
        (await runWithOpts("warning/pass")).counts.fail,
        0,
        "success case"
      )

      t.notEqual(
        (await runWithOpts("warning/mismatch")).counts.fail,
        0,
        "fail when warnings are different"
      )

      t.notEqual(
        (await runWithOpts("warning/missing")).counts.fail,
        0,
        "fail when warning is missing"
      )

      t.notEqual(
        (await runWithOpts("warning/extraneous")).counts.fail,
        0,
        "fail when extraneous warning is present"
      )

      t.equal(
        (await runWithOpts("warning/todo")).counts.fail,
        0,
        "skip warning checks if `todoWarning` option enabled"
      )
      t.todo("handle todoWarning")
      t.end()
    })

    t.test("ignore", async (t) => {
      t.equal(
        (await runWithOpts("ignore")).counts.skip,
        1,
        "marks a test as a `skip` when the `:ignore_for` option is set in options.yml"
      )
      t.end()
    })

    t.test("todo", async (t) => {
      t.equal(
        (await runWithOpts("todo")).counts.todo,
        1,
        "marks a test as a `todo` when the `:todo` option is set in options.yml"
      )
      t.equal(
        (await runWithOpts("todo", { todoMode: "run" })).counts.todo,
        0,
        "runs todos if `todoMode` is set to `run`"
      )
      t.todo("fails on success if probeTodo is passed as input")
      t.end()
    })
  })
  t.end()
})
