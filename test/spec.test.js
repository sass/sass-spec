const path = require("path")
const tap = require("tap")
const { runSpec } = require("../lib-js/spec")
const { withArchive } = require("../lib-js/hrx")

const baseOpts = {
  impl: "sass-mock",
  bin: `node ${path.resolve(__dirname, "fixtures/sass-exec-mock.js")}`,
  rootDir: path.resolve(__dirname, "fixtures"),
}
withArchive(path.resolve(__dirname, "fixtures/spec.hrx"), async (dir) => {
  await tap.test("executeSpec", async (t) => {
    // TODO how to run the spec without it being "counted" and without it failing?
    async function runWithOpts(subdir, opts) {
      return await runSpec(new tap.Test(), path.resolve(dir, subdir), {
        ...baseOpts,
        ...opts,
      })
    }
    t.equal(
      (await runWithOpts("output")).counts.fail,
      0,
      "basic output success case"
    )
    t.notEqual(
      (await runWithOpts("output-fail")).counts.fail,
      0,
      "expected output failure case"
    )
    t.equal(
      (await runWithOpts("error")).counts.fail,
      0,
      "basic error success case"
    )
    t.notEqual(
      (await runWithOpts("error-fail")).counts.fail,
      0,
      "expected error failure case"
    )

    t.todo("warning cases", async (t) => {
      t.equal(
        (await runWithOpts("warning")).counts.fail,
        0,
        "expected warning success case"
      )

      t.todo("warning success case")
      t.todo("handle warning failure case")
      t.todo("handle todoWarning")
      t.end()
    })
    t.todo("todo", async (t) => {
      t.equal(
        (await runWithOpts("output", { mode: "todo" })).counts.todo,
        1,
        "runs todos normally when the option is set"
      )
      t.todo("does not run todos normally")
      t.todo("runs todos if option is configured")
      t.todo("fails on success if probeTodo is passed as input")
      t.end()
    })
    t.end()
  })
})
