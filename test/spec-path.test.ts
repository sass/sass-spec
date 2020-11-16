import fs from "fs"
import path from "path"
import { fromPath, SpecPath } from "../lib-js/spec-path"

describe("SpecPath", () => {
  describe("options", () => {
    let dir: SpecPath

    beforeAll(async () => {
      dir = await fromPath(path.resolve(__dirname, "./fixtures/options.hrx"))
    })

    async function getOptions(path: string) {
      const subitem = await dir.atPath(path)
      return await subitem.options()
    }

    it("works in the basic case", async () => {
      expect(await getOptions("basic")).toMatchObject({
        todo: ["dart-sass"],
        ignore: ["libsass"],
        precision: 3,
      })
    })

    it("overrides parent options correctly", async () => {
      expect(await getOptions("override/parent/child")).toMatchObject({
        todo: ["dart-sass", "sass-mock"],
        ignore: ["libsass", "dart-sass"],
        todoWarning: ["libsass"],
        precision: 4,
      })
    })

    it("overrides when child doesn't have options.yml", async () => {
      expect(await getOptions("nesting/parent/deep")).toMatchObject({
        precision: 3,
      })
    })

    it("overrides more than one layer deep", async () => {
      expect(await getOptions("nesting/parent/deep/child")).toMatchObject({
        precision: 4,
      })
    })
  })

  describe("writeFile", () => {
    it("replaces the contents of a virtual file", async () => {
      let dir = await fromPath(path.resolve(__dirname, "./fixtures/basic.hrx"))
      await dir.writeFile("output.css", "NEW OUTPUT")
      expect(await dir.contents("output.css")).toEqual("NEW OUTPUT")
      await dir.writeFile("output-libsass.css", "MORE OUTPUT")
      expect(await dir.contents("output-libsass.css")).toEqual("MORE OUTPUT")
      expect(await dir.list()).toContain("output-libsass.css")
    })
  })

  describe("deleteFile", () => {
    it("removes the contents of the virtual file", async () => {
      let dir = await fromPath(path.resolve(__dirname, "./fixtures/basic.hrx"))
      await dir.removeFile("output.css")
      expect(dir.has("output.css")).toBeFalsy()
      expect(await dir.list()).not.toContain("output.css")
    })
  })

  describe("withRealFiles", () => {
    let dir: SpecPath

    beforeAll(async () => {
      dir = await fromPath(path.resolve(__dirname, "./fixtures/basic.hrx"))
    })

    it("creates the archive directory and writes input scss files", async () => {
      await dir.withRealFiles(async () => {
        expect(fs.existsSync(dir.path)).toBeTruthy()
        expect(fs.existsSync(path.resolve(dir.path, "input.scss"))).toBeTruthy()
        expect(fs.existsSync(path.resolve(dir.path, "_util.scss"))).toBeTruthy()
        // Does not write output.css files or non-CSS/Sass files
        expect(fs.existsSync(path.resolve(dir.path, "output.css"))).toBeFalsy()
        expect(fs.existsSync(path.resolve(dir.path, "warning"))).toBeFalsy()
      })
    })

    it("deletes the directory on error", async () => {
      try {
        await dir.withRealFiles(async () => {
          throw new Error("Fail!")
        })
      } catch (e) {}
      expect(fs.existsSync(dir.path)).toBeFalsy()
    })

    it.todo("deletes the directory if the process exits")
    it.todo("writes files to archive if option is enabled")
  })

  describe("forEachTest", () => {
    let dir: SpecPath
    beforeAll(async () => {
      dir = await fromPath(path.resolve(__dirname, "./fixtures/iterate"))
    })

    it("iterates through all test directories", async () => {
      const testCases: string[] = []
      await dir.forEachTest([], async (subdir) => {
        testCases.push(subdir.relPath())
      })
      expect(testCases).toContain("physical")
      expect(testCases).toContain("archive/scss")
      // counts directories with input.sass as valid
      expect(testCases).toContain("archive/indented")
      // does not iterate through directories without an input file
      expect(testCases).not.toContain("archive/no-input")
    })

    it.todo("works when passed in path arguments")
  })
})
