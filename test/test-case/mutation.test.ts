import { fromContents } from "../../lib-js/spec-directory"
import TestCase from "../../lib-js/test-case"
import { mockCompiler } from "../fixtures/mock-compiler"

function makeHrx(files: Record<string, string>) {
  return Object.entries(files)
    .map(([filename, contents]) => `<===> ${filename}\n${contents}`)
    .join("\n")
}

function fromObject(files: Record<string, string>) {
  return fromContents(makeHrx(files))
}

describe("TestCase mutation functions", () => {
  describe("Update expected output and pass test.", () => {
    it("works on normal overrides", async () => {
      const dir = await fromObject({
        "input.scss": "stdout: NEW OUTPUT\nstatus: 0",
        "output.css": "OUTPUT",
      })
      const test = new TestCase(dir, "sass-mock", mockCompiler(dir))
      await test.run()
      await test.overwrite()
      expect(await test.dir.readFile("output.css")).toEqual("NEW OUTPUT")
    })
    it("works when changing the type of output", async () => {
      const dir = await fromObject({
        "input.scss": "stderr: ERROR\nstatus: 1",
        "output.css": "OUTPUT",
      })
      const test = new TestCase(dir, "sass-mock", mockCompiler(dir))
      await test.run()
      await test.overwrite()
      expect(await dir.readFile("error")).toEqual("ERROR")
      expect(dir.hasFile("output.css")).toBeFalsy()
    })
  })

  describe("Migrate copy of test to pass on [impl]", () => {
    it("works when no impl specific files are defined", async () => {
      const dir = await fromObject({
        "input.scss": "stdout: NEW OUTPUT\nstderr: WARNING\nstatus: 0",
        "output.css": "OUTPUT",
        "output-dart-sass.css": "DART OUTPUT",
      })
      const test = new TestCase(dir, "sass-mock", mockCompiler(dir))
      await test.run()
      await test.migrateImpl()
      expect(await dir.readFile("output.css")).toEqual("OUTPUT")
      expect(await dir.readFile("output-dart-sass.css")).toEqual("DART OUTPUT")
      expect(await dir.readFile("output-sass-mock.css")).toEqual("NEW OUTPUT")
      expect(await dir.readFile("warning-sass-mock")).toEqual("WARNING")
    })

    it("overrides existing impl-specific files", async () => {
      const dir = await fromObject({
        "input.scss": "stdout: NEW OUTPUT\nstderr: WARNING\nstatus: 0",
        "output.css": "OUTPUT",
        "output-sass-mock.css": "OTHER OUTPUT",
      })
      const test = new TestCase(dir, "sass-mock", mockCompiler(dir))
      await test.run()
      await test.migrateImpl()
      expect(await dir.readFile("output.css")).toEqual("OUTPUT")
      expect(await dir.readFile("output-sass-mock.css")).toEqual("NEW OUTPUT")
      expect(await dir.readFile("warning-sass-mock")).toEqual("WARNING")
    })

    it("works when changing output type", async () => {
      const dir = await fromObject({
        "input.scss": "stderr: ERROR\nstatus: 1",
        "output.css": "OUTPUT",
        "output-sass-mock.css": "OTHER OUTPUT",
      })
      const test = new TestCase(dir, "sass-mock", mockCompiler(dir))
      await test.run()
      await test.migrateImpl()
      expect(await dir.readFile("output.css")).toEqual("OUTPUT")
      expect(dir.hasFile("output-sass-mock.css")).toBeFalsy()
      expect(await dir.readFile("error-sass-mock")).toEqual("ERROR")
    })

    it("writes an empty warning file if there is no base warning", async () => {
      const dir = await fromObject({
        "input.scss": "stdout: OUTPUT\nstatus: 0",
        "output.css": "OUTPUT",
        warning: "WARNING",
      })
      const test = new TestCase(dir, "sass-mock", mockCompiler(dir))
      await test.run()
      await test.migrateImpl()
      expect(await dir.readFile("warning")).toEqual("WARNING")
      expect(dir.hasFile("warning-sass-mock")).toBeTruthy()
      expect(await dir.readFile("warning-sass-mock")).toEqual("")
    })
  })

  describe("Mark spec/warning as todo for [impl].", () => {
    it("Marks a spec as :warning_todo on warning_difference", async () => {
      const dir = await fromObject({
        "input.scss": "stdout: OUTPUT\nstderr: OLD WARNING\nstatus: 0",
        "output.css": "OUTPUT",
        warning: "WARNING",
      })
      const test = new TestCase(dir, "sass-mock", mockCompiler(dir))
      await test.run()
      await test.markTodo()
      expect((await dir.options())[":warning_todo"]).toContain("sass-mock")
    })
    it("Marks a spec as :todo on any other failure", async () => {
      const dir = await fromObject({
        "input.scss": "stdout: OLD OUTPUT\nstatus: 0",
        "output.css": "OUTPUT",
      })
      const test = new TestCase(dir, "sass-mock", mockCompiler(dir))
      await test.run()
      await test.markTodo()
      expect((await dir.options())[":todo"]).toContain("sass-mock")
    })
  })

  describe("Ignore spec for [impl] FOREVER", () => {
    it("works", async () => {
      const dir = await fromObject({
        "input.scss": "stdout: OLD OUTPUT\nstatus: 0",
        "output.css": "OUTPUT",
        warning: "WARNING",
      })
      const test = new TestCase(dir, "sass-mock", mockCompiler(dir))
      await test.run()
      await test.markIgnore()
      expect((await dir.options())[":ignore_for"]).toContain("sass-mock")
    })
  })
})
