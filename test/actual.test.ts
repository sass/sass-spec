import tap from "tap"
import path from "path"
import { getActualResult } from "../lib-js/execute"
import { withArchive } from "../lib-js/hrx"

withArchive(
  path.resolve(__dirname, "./fixtures/actual.hrx"),
  async (baseDir) => {
    await tap.test("getActualResult", async (t) => {
      async function getResults(subdir: string) {
        return getActualResult(path.resolve(baseDir, subdir), {
          rootDir: "",
          impl: "sass-mock",
          bin:
            "node " + path.resolve(__dirname, "./fixtures/sass-exec-mock.js"),
        })
      }
      t.todo("does not print to parent stderr")
      t.hasStrict(
        await getResults("output"),
        {
          output: "OUTPUT",
          isSuccess: true,
        } as any, // FIXME what the heck? why does it want a regex??
        "populates only `output` on successful execution"
      )

      t.hasStrict(
        await getResults("error"),
        {
          error: "ERROR",
          isSuccess: false,
        } as any,
        "populates only `error` on execution failure"
      )
      t.hasStrict(
        await getResults("warning"),
        {
          output: "OUTPUT",
          warning: "WARNING",
          isSuccess: true,
        } as any,
        "populates both `output` and `warning` on execussion success with stderr content"
      )

      t.test("options", (t) => {
        t.todo("passes rootDir correctly")
        t.todo("passes precision argument correctly")
        t.todo("passes indented argument correctly")
        t.todo("passes indented argument correctly for dart-sass/libsass")
        t.end()
      })
      t.end()
    })
  }
)
