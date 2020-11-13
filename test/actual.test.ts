import tap from "tap"
import path from "path"
import { getActualResult } from "../lib-js/execute"
import { fromPath } from "../lib-js/spec-path"
import { execCompiler } from "../lib-js/compiler"

tap.test("getActualResult", async (t) => {
  const dir = await fromPath(path.resolve(__dirname, "./fixtures/actual.hrx"))
  await dir.withRealFiles(async () => {
    async function getResults(subpath: string) {
      const subdir = await dir.atPath(subpath)
      return getActualResult(subdir, {
        rootDir: "",
        impl: "sass-mock",
        compiler: execCompiler("node"),
        cmdOpts: [path.resolve(__dirname, "./fixtures/sass-exec-mock.js")],
      })
    }
    t.todo("does not print to parent stderr")
    t.hasStrict(
      await getResults("output"),
      {
        output: "OUTPUT",
        isSuccess: true,
      },
      "populates only `output` on successful execution"
    )

    t.hasStrict(
      await getResults("error"),
      {
        error: "ERROR",
        isSuccess: false,
      },
      "populates only `error` on execution failure"
    )
    t.hasStrict(
      await getResults("warning"),
      {
        output: "OUTPUT",
        warning: "WARNING",
        isSuccess: true,
      },
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
})
