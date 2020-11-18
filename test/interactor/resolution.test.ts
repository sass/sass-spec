import { optionsMap } from "../../lib-js/interactor"
import { fromContents } from "../../lib-js/spec-directory"
import { failures } from "../../lib-js/test-case"

function makeHrx(files: Record<string, string>) {
  return Object.entries(files)
    .map(([filename, contents]) => `<===> ${filename}\n${contents}`)
    .join("\n")
}

function fromObject(files: Record<string, string>) {
  return fromContents(makeHrx(files))
}

describe("Interactor option resolution", () => {
  describe("Update expected output and pass test.", () => {
    const updateOutput = optionsMap["O"].resolve
    it("works on normal overrides", async () => {
      const dir = await fromObject({
        "output.css": "OUTPUT",
      })
      const result = failures.OutputDifference({
        isSuccess: true,
        output: "NEW OUTPUT",
      })
      await updateOutput({ impl: "sass-mock", dir, result })
      expect(await dir.readFile("output.css")).toEqual("NEW OUTPUT")
    })
    it("works when changing the type of output", async () => {
      const dir = await fromObject({
        "output.css": "OUTPUT",
      })
      const result = failures.UnexpectedError({
        isSuccess: false,
        error: "ERROR",
      })
      await updateOutput({ impl: "sass-mock", dir, result })
      expect(await dir.readFile("error")).toEqual("ERROR")
      expect(dir.hasFile("output.css")).toBeFalsy()
    })
  })

  describe("Migrate copy of test to pass on [impl]", () => {
    const migrateToImpl = optionsMap["I"].resolve
    it("works when no impl specific files are defined", async () => {
      const dir = await fromObject({
        "output.css": "OUTPUT",
        "output-dart-sass.css": "DART OUTPUT",
      })
      const result = failures.OutputDifference({
        isSuccess: true,
        output: "NEW OUTPUT",
        warning: "WARNING",
      })
      await migrateToImpl({ impl: "sass-mock", dir, result })
      expect(await dir.readFile("output.css")).toEqual("OUTPUT")
      expect(await dir.readFile("output-dart-sass.css")).toEqual("DART OUTPUT")
      expect(await dir.readFile("output-sass-mock.css")).toEqual("NEW OUTPUT")
      expect(await dir.readFile("warning-sass-mock")).toEqual("WARNING")
    })

    it("overrides existing impl-specific files", async () => {
      const dir = await fromObject({
        "output.css": "OUTPUT",
        "output-sass-mock.css": "OTHER OUTPUT",
      })
      const result = failures.OutputDifference({
        isSuccess: true,
        output: "NEW OUTPUT",
        warning: "WARNING",
      })
      await migrateToImpl({ impl: "sass-mock", dir, result })
      expect(await dir.readFile("output.css")).toEqual("OUTPUT")
      expect(await dir.readFile("output-sass-mock.css")).toEqual("NEW OUTPUT")
      expect(await dir.readFile("warning-sass-mock")).toEqual("WARNING")
    })

    it("works when changing output type", async () => {
      const dir = await fromObject({
        "output.css": "OUTPUT",
        "output-sass-mock.css": "OTHER OUTPUT",
      })
      const result = failures.UnexpectedError({
        isSuccess: false,
        error: "ERROR",
      })
      await migrateToImpl({ impl: "sass-mock", dir, result })
      expect(await dir.readFile("output.css")).toEqual("OUTPUT")
      expect(dir.hasFile("output-sass-mock.css")).toBeFalsy()
      expect(await dir.readFile("error-sass-mock")).toEqual("ERROR")
    })

    it("writes an empty warning file if there is no base warning", async () => {
      const dir = await fromObject({
        "output.css": "OUTPUT",
        warning: "WARNING",
      })
      const result = failures.WarningDifference({
        isSuccess: true,
        output: "OUTPUT",
      })
      await migrateToImpl({ impl: "sass-mock", dir, result })
      expect(await dir.readFile("warning")).toEqual("WARNING")
      expect(dir.hasFile("warning-sass-mock")).toBeTruthy()
      expect(await dir.readFile("warning-sass-mock")).toEqual("")
    })
  })

  describe("Mark spec/warning as todo for [impl].", () => {
    const markTodo = optionsMap["T"].resolve
    it("Marks a spec as :warning_todo on warning_difference", async () => {
      const dir = await fromObject({
        "output.css": "OUTPUT",
        warning: "WARNING",
      })
      const result = failures.WarningDifference({
        isSuccess: true,
        output: "OUTPUT",
        warning: "NEW WARNING",
      })
      await markTodo({ impl: "sass-mock", dir, result })
      expect((await dir.options())[":warning_todo"]).toContain("sass-mock")
    })
    it("Marks a spec as :todo on any other failure", async () => {
      const dir = await fromObject({
        "output.css": "OUTPUT",
      })
      const result = failures.OutputDifference({
        isSuccess: true,
        output: "NEW OUTPUT",
      })
      await markTodo({ impl: "sass-mock", dir, result })
      expect((await dir.options())[":todo"]).toContain("sass-mock")
    })
  })

  describe("Ignore spec for [impl] FOREVER", () => {
    const ignoreSpec = optionsMap["G"].resolve
    it("works", async () => {
      const dir = await fromObject({
        "output.css": "OUTPUT",
        warning: "WARNING",
      })
      const result = failures.OutputDifference({
        isSuccess: true,
        output: "NEW OUTPUT",
      })
      await ignoreSpec({ impl: "sass-mock", dir, result })
      expect((await dir.options())[":ignore_for"]).toContain("sass-mock")
    })
  })
})
