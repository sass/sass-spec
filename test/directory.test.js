const tap = require("tap")
const { iterateDir } = require("../lib-js/directory")
const path = require("path")

const testDir = path.resolve(__dirname, "./fixtures/iterate")
tap.test("iterateDir", (t) => {
  t.test("success case", async (t) => {
    const directories = {}
    // compile a list of all valid directories
    await iterateDir(testDir, { rootDir: testDir }, (dir, opts) => {
      const relativeDir = path.relative(testDir, dir)
      directories[relativeDir] = opts
    })
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
    t.end()
  })

  t.todo("config.yml", (t) => {
    t.test("works on todo config", (t) => {
      t.end()
    })

    t.test("works on ignore config", (t) => {
      t.end()
    })
    t.end()
  })

  t.todo("works when passed in a subdirectory", (t) => {
    t.end()
  })
  t.end()
})
