import path from "path"
import { fromPath, SpecDirectory } from "../../lib-js/spec-directory"

describe("SpecDirectory iteration", () => {
  describe("forEachTest", () => {
    let dir: SpecDirectory
    beforeAll(async () => {
      dir = await fromPath(path.resolve(__dirname, "./fixtures/iterate"))
    })

    it("iterates through all test directories", async () => {
      const testCases: string[] = []
      await dir.forEachTest([], async (subdir) => {
        testCases.push(subdir.relPath())
      })
      expect(testCases).toContain("iterate/physical")
      expect(testCases).toContain("iterate/archive/scss")
      // counts directories with input.sass as valid
      expect(testCases).toContain("iterate/archive/indented")
      // does not iterate through directories without an input file
      expect(testCases).not.toContain("iterate/archive/no-input")
    })

    it.todo("works when passed in path arguments")
  })
})
