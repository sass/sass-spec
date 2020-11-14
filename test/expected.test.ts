import path from "path"

import { getExpectedResult } from "../lib-js/execute"
import { SpecPath, fromPath } from "../lib-js/spec-path"

describe("getExpectedResult", () => {
  let dir: SpecPath
  beforeAll(async () => {
    dir = await fromPath(path.resolve(__dirname, "./fixtures/expected.hrx"))
  })

  describe("output", () => {
    const expected = {
      isSuccess: true,
      output: "OUTPUT",
      warning: undefined,
      error: undefined,
    }

    async function expectOutput(subpath: string) {
      const subdir = await dir.atPath(subpath)
      const result = await getExpectedResult(subdir, "sass-mock")
      expect(result).toEqual(expected)
    }

    it("returns contents of `output.css` when there are no overrides", async () => {
      await expectOutput("output-cases/basic")
    })
    it("returns `output-[impl].css` contents when there is an impl-specific override", async () => {
      await expectOutput("output-cases/override")
    })
    it("returns original `output.css` contents when another impl is overridden", async () => {
      await expectOutput("output-cases/override-other")
    })
  })

  describe("error", () => {
    const expected = {
      isSuccess: false,
      output: undefined,
      error: "ERROR",
      warning: undefined,
    }
    async function expectError(subpath: string) {
      const subdir = await dir.atPath(subpath)
      const result = await getExpectedResult(subdir, "sass-mock")
      expect(result).toEqual(expected)
    }

    it("returns contents of `error` when there are no overrides", async () => {
      await expectError("error-cases/basic")
    })
    it("returns contents of `error-[impl]` when impl-specific error file is specified", async () => {
      await expectError("error-cases/override")
    })
    it("returns the base error when an impl-specific error file is defined for another impl", async () => {
      await expectError("error-cases/override-other")
    })
    it("returns impl-specific error file when a base output file anda an impl-specific error file are defined", async () => {
      await expectError("error-cases/override-output")
    })
  })

  describe("warning", () => {
    const expected = {
      isSuccess: true,
      output: "OUTPUT",
      error: undefined,
      warning: "WARNING",
    }
    async function expectWarning(subpath: string) {
      const subdir = await dir.atPath(subpath)
      const result = await getExpectedResult(subdir, "sass-mock")
      expect(result).toEqual(expected)
    }
    it("returns the contents of `warning` when a warning file is defined", async () => {
      await expectWarning("warning-cases/basic")
    })
    it("returns overridden warning message if `warning-[impl]` file is defined", async () => {
      await expectWarning("warning-cases/override")
    })
    it("returns overridden warning message if `warning-[impl]` file defined without a base `warning` file", async () => {
      await expectWarning("warning-cases/override-no-base")
    })
  })

  it.todo("throws an exception if neither `output.css` nor `error` is found")
})
