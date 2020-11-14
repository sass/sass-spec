import path from "path"
import { fromPath, SpecPath } from "../lib-js/spec-path"
import { getActualResult } from "../lib-js/execute"
import { mockCompiler } from "./fixtures/mock-compiler"

describe("getActualResult", () => {
  let dir: SpecPath

  beforeAll(async () => {
    dir = await fromPath(path.resolve(__dirname, "./fixtures/actual.hrx"))
    await dir.writeToDisk()
  })

  afterAll(async () => {
    await dir.cleanup()
  })

  const opts = {
    rootDir: "",
    impl: "sass-mock",
    compiler: mockCompiler,
    cmdArgs: [],
  }

  async function getResults(subpath: string) {
    const subdir = await dir.atPath(subpath)
    return await getActualResult(subdir, opts)
  }

  it("works for output case", async () => {
    expect(await getResults("output")).toEqual({
      output: "OUTPUT",
      isSuccess: true,
    })
  })

  it("works for error case", async () => {
    expect(await getResults("error")).toEqual({
      error: "ERROR",
      isSuccess: false,
    })
  })

  it("works for warning case", async () => {
    expect(await getResults("warning")).toEqual({
      output: "OUTPUT",
      warning: "WARNING",
      isSuccess: true,
    })
  })

  describe("options", () => {
    it.todo("passes rootDir correctly")
    it.todo("passes precision argument correctly")
    it.todo("passes indented argument correctly")
  })
})
