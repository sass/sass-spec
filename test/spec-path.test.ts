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
