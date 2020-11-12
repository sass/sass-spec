import fs from "fs"
import path from "path"
import tap from "tap"

import { SpecPath, fromPath } from "../lib-js/spec-path"

tap.test("SpecPath", (t) => {
  t.test("options", async (t) => {
    const dir = await fromPath(
      path.resolve(__dirname, "./fixtures/options.hrx")
    )

    async function getOptions(path: string) {
      const subitem = await dir.atPath(path)
      return await subitem.options()
    }

    t.hasStrict(
      await getOptions("basic"),
      {
        todo: ["dart-sass"],
        ignore: ["libsass"],
        precision: 3,
      },
      "works in basic case"
    )

    t.hasStrict(
      await getOptions("override/parent/child"),
      {
        todo: ["dart-sass", "sass-mock"],
        ignore: ["libsass", "dart-sass"],
        todoWarning: ["libsass"],
        precision: 4,
      },
      "overrides parent options correctly"
    )

    t.hasStrict(
      await getOptions("nesting/parent/deep"),
      { precision: 3 },
      "overrides when child doesn't have options.yml"
    )

    t.hasStrict(
      await getOptions("nesting/parent/deep/child"),
      { precision: 4 },
      "overrides more than one layer deep"
    )

    t.end()
  })

  t.test("withRealFiles", async (t) => {
    const dir = await fromPath(path.resolve(__dirname, "./fixtures/basic.hrx"))
    t.test("success case", async (t) => {
      await dir.withRealFiles(async () => {
        t.ok(fs.existsSync(dir.path), "creates the root archive directory")
        t.ok(
          fs.existsSync(path.resolve(dir.path, "input.scss")),
          "creates input file"
        )
        t.ok(
          fs.existsSync(path.resolve(dir.path, "_util.scss")),
          "creates library css file"
        )
        t.notOk(
          fs.existsSync(path.resolve(dir.path, "output.css")),
          "does not create output file"
        )
      })
      t.end()
    })
    t.test("failure case", async (t) => {
      try {
        await dir.withRealFiles(async () => {
          throw new Error("Fail!")
        })
      } catch (e) {}
      t.notOk(fs.existsSync(dir.path), "directory is deleted on error")

      t.todo("deletes the directory if the process exits")
      t.todo("writes files to archive")
      t.end()
    })
    t.end()
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
    t.todo("passed in paths")
    t.end()
  })

  t.end()
})
