import path from "path"
import tap from "tap"

import { SpecPath, fromPath } from "../lib-js/spec-path"

tap.test("SpecPath", (t) => {
  t.test("options", async (t) => {
    const dir = await fromPath(
      path.resolve(__dirname, "./fixtures/options.hrx")
    )
    t.todo("merges parent options")
    t.todo("overrides precision")
    t.todo("merges for grandchildren")
  })

  t.test("forEachTest", (t) => {
    t.test("basic case", async (t) => {
      const dir = await fromPath(path.resolve(__dirname, "./fixtures/iterate"))

      const directories: Record<string, SpecPath> = {}
      await dir.forEachTest([], async (subdir) => {
        directories[subdir.relPath()] = subdir
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
    })
    t.end()
  })

  t.end()
})
