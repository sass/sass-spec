const tap = require("tap")
const path = require("path")
const { getExpectedResult } = require("../lib-js/execute")
const { withArchive } = require("../lib-js/hrx")

tap.test("getExpectedResult", async (t) => {
  await withArchive(
    path.resolve(__dirname, "./fixtures/execute.hrx"),
    async (baseDir) => {
      await t.test("success cases", async (t) => {
        const expectedSuccess = {
          output: "OUTPUT",
          error: undefined,
          warning: undefined,
        }
        async function testDir(subdir, msg) {
          const result = await getExpectedResult(
            path.resolve(baseDir, subdir),
            "sass-mock"
          )
          t.hasStrict(result, expectedSuccess, msg)
        }
        await testDir(
          "output-cases/basic",
          "Base case returns output.css contents"
        )
        await testDir(
          "output-cases/override",
          "Return output-[impl].css contents when overridden"
        )
        await testDir(
          "output-cases/override-other",
          "Return original output.css when another impl has override"
        )
        t.end()
      })
      await t.test("error cases", async (t) => {
        const expected = {
          output: undefined,
          error: "ERROR",
          warning: undefined,
        }
        async function testDir(subdir, msg) {
          const result = await getExpectedResult(
            path.resolve(baseDir, subdir),
            "sass-mock"
          )
          t.hasStrict(result, expected, msg)
        }
        await testDir(
          "error-cases/basic",
          "returns error when an error file is defined"
        )
        await testDir(
          "error-cases/override",
          "returns overridden error file when impl-specific error file is defined"
        )
        await testDir(
          "error-cases/override-other",
          "returns base error file when impl-specific error file is defined for another impl"
        )
        await testDir(
          "error-cases/override-output",
          "returns error file when base output file defined but impl-specific error file defined"
        )
        t.end()
      })

      await t.test("warning cases", async (t) => {
        const expected = {
          output: "OUTPUT",
          error: undefined,
          warning: "WARNING",
        }
        async function testDir(subdir, msg) {
          const result = await getExpectedResult(
            path.resolve(baseDir, subdir),
            "sass-mock"
          )
          t.hasStrict(result, expected, msg)
        }
        await testDir(
          "warning-cases/basic",
          "returns warning message when `warning` file is defined"
        )
        await testDir(
          "warning-cases/override",
          "returns overridden warning message if `warning-[impl]` file defined"
        )
        await testDir(
          "warning-cases/override-no-base",
          "returns overridden warning message if `warning-[impl]` file defined without base `warning` file"
        )
        t.end()
      })
    }
  )
  t.todo("throws error if neither input nor error found")
  t.end()
})
