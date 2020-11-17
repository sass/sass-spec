import fs from "fs"
import path from "path"
import { fromPath, fromContents, SpecPath } from "../lib-js/spec-path"

describe("SpecPath", () => {
  describe("options", () => {
    async function getOptions(contents: string) {
      const dir = await fromContents(contents)
      return await dir.options()
    }

    it("works in the basic case", async () => {
      const dir = await fromContents(
        `
<===> options.yml
:todo:
  - dart-sass
:ignore_for:
  - libsass
:precision: 3
`.trimStart()
      )
      expect(await dir.options()).toMatchObject({
        todo: ["dart-sass"],
        ignore: ["libsass"],
        precision: 3,
      })
    })

    it("overrides parent options correctly", async () => {
      const dir = await fromContents(
        `
<===> options.yml
:todo:
  - dart-sass
:ignore_for:
  - libsass
:precision: 3
<===> child/options.yml
:todo:
  - sass-mock
:ignore_for:
  - dart-sass
:warning_todo:
  - libsass
:precision: 4
`.trimStart()
      )
      const childDir = await dir.atPath("child")
      expect(await childDir.options()).toMatchObject({
        todo: ["dart-sass", "sass-mock"],
        ignore: ["libsass", "dart-sass"],
        todoWarning: ["libsass"],
        precision: 4,
      })
    })

    it("overrides more than one layer deep", async () => {
      const dir = await fromContents(
        `
<===> options.yml
:precision: 3
<===> deep/child/options.yml
:precision: 4
`.trimStart()
      )
      const noOptsChild = await dir.atPath("deep")
      expect(await noOptsChild.options()).toMatchObject({ precision: 3 })
      const deepChild = await dir.atPath("deep/child")
      expect(await deepChild.options()).toMatchObject({ precision: 4 })
    })
  })

  describe("writeFile", () => {
    it("replaces the contents of a virtual file", async () => {
      let dir = await fromPath(path.resolve(__dirname, "./fixtures/basic.hrx"))
      await dir.writeFile("output.css", "NEW OUTPUT")
      expect(await dir.contents("output.css")).toEqual("NEW OUTPUT")
      await dir.writeFile("output-libsass.css", "MORE OUTPUT")
      expect(await dir.contents("output-libsass.css")).toEqual("MORE OUTPUT")
      expect(await dir.files()).toContain("output-libsass.css")
    })
  })

  describe("deleteFile", () => {
    it("removes the contents of the virtual file", async () => {
      let dir = await fromPath(path.resolve(__dirname, "./fixtures/basic.hrx"))
      await dir.removeFile("output.css")
      expect(dir.hasFile("output.css")).toBeFalsy()
      expect(await dir.files()).not.toContain("output.css")
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
    it.todo("does not rearrange files when there were no changes made")
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
