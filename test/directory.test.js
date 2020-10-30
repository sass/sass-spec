const tap = require("tap")
const { iterateDir } = require("../lib-js/directory")
const path = require("path")

const testDir = path.resolve(__dirname, "./fixtures/iterate")
tap.test("iterateDir", (t) => {
  t.test("basic case", async (t) => {
    const directories = {}
    // compile a list of all valid directories
    await iterateDir(
      testDir,
      { rootDir: testDir, impl: "sass-mock" },
      (dir, opts) => {
        const relativeDir = path.relative(testDir, dir)
        directories[relativeDir] = opts
      }
    )
    t.ok(directories["physical"], "iterates through physical directories")
    t.ok(directories["archive/scss"], "iterates through archived directories")
    t.ok(
      directories["archive/indented"],
      "iterates through directories with input.sass"
    )
    t.notOk(
      directories["no-input"],
      "does not iterate through directories without an input file"
    )
    t.test("options", (t) => {
      t.equal(
        directories["options/todo-plain"].mode,
        "todo",
        "marks :todo when given an implementation name"
      )
      t.equal(
        directories["options/todo-issue"].mode,
        "todo",
        "marks :todo when given a github issue"
      )
      t.equal(directories["options/ignore"].mode, "ignore", "marks :ignore_for")

      t.equal(
        directories["options/nested/subdir"].mode,
        "ignore",
        "marks options in parent directory"
      )

      t.notOk(
        directories["options/other-impl"].mode,
        "does not mark options when another implementation is specified"
      )
      t.end()
    })
    t.end()
  })

  t.todo("works when passed in a subdirectory", (t) => {
    t.end()
  })
  t.end()
})
