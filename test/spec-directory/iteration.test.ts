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

    it("works when passed in a single path arguments", async () => {
      const testCases: string[] = []
      await dir.forEachTest(["iterate/archive"], async (subdir) => {
        testCases.push(subdir.relPath())
      })
      expect(testCases).not.toContain("iterate/physical")
      expect(testCases).toContain("iterate/archive/scss")
      expect(testCases).toContain("iterate/archive/indented")
    })

    it("works when passed in multiple path arguments", async () => {
      const testCases: string[] = []
      await dir.forEachTest(
        ["iterate/physical", "iterate/archive/scss"],
        async (subdir) => {
          testCases.push(subdir.relPath())
        }
      )
      expect(testCases).toContain("iterate/physical")
      expect(testCases).toContain("iterate/archive/scss")
      expect(testCases).not.toContain("iterate/archive/indented")
    })

    it("works when one path is under another", async () => {
      const testCases: string[] = []
      await dir.forEachTest(
        ["iterate/archive", "iterate/archive/scss"],
        async (subdir) => {
          testCases.push(subdir.relPath())
        }
      )
      expect(testCases).not.toContain("iterate/physical")
      expect(testCases).toContain("iterate/archive/scss")
      expect(testCases).toContain("iterate/archive/indented")
    })
  })
})
