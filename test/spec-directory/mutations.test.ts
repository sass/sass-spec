import path from "path"
import { fromPath } from "../../lib-js/spec-directory"

// Tests for methods on SpecDirectory that mutate its contents
describe("SpecDirectory mutations", () => {
  describe("writeFile", () => {
    it("replaces the contents of a virtual file", async () => {
      let dir = await fromPath(path.resolve(__dirname, "./fixtures/basic.hrx"))
      await dir.writeFile("output.css", "NEW OUTPUT")
      expect(await dir.readFile("output.css")).toEqual("NEW OUTPUT")
      await dir.writeFile("output-libsass.css", "MORE OUTPUT")
      expect(await dir.readFile("output-libsass.css")).toEqual("MORE OUTPUT")
      expect(await dir.listFiles()).toContain("output-libsass.css")
    })
  })

  describe("deleteFile", () => {
    it("removes the contents of the virtual file", async () => {
      let dir = await fromPath(path.resolve(__dirname, "./fixtures/basic.hrx"))
      await dir.removeFile("output.css")
      expect(dir.hasFile("output.css")).toBeFalsy()
      expect(await dir.listFiles()).not.toContain("output.css")
    })
  })
})
