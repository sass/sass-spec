import path from "path"
import { optionsMap, optionsFor, Interactor } from "../lib-js/interactor"
import { Readable, Writable } from "stream"
import { fromPath, fromContents } from "../lib-js/spec-path"
import { failures, FailTestResult } from "../lib-js/test-case"

function makeHrx(files: Record<string, string>) {
  return Object.entries(files)
    .map(([filename, contents]) => `<===> ${filename}\n${contents}`)
    .join("\n")
}

function fromObject(files: Record<string, string>) {
  return fromContents(makeHrx(files))
}

class MemoryWritable extends Writable {
  chunks: string[] = []
  _write(chunk: string, enc: any, cb: () => void) {
    this.chunks.push(chunk.toString())
    cb()
  }
  contents() {
    return this.chunks.join("")
  }
}

describe("Interactor", () => {
  describe("option displays", () => {
    it.todo("always includes certain choices")

    function expectOption(
      result: FailTestResult,
      key: string,
      valid: boolean = true
    ) {
      const options = optionsFor({
        impl: "sass-mock",
        dir: null as any,
        result,
      })
      const keys = options.map((o) => o.key)
      if (valid) {
        expect(keys).toContain(key)
      } else {
        expect(keys).not.toContain(key)
      }
    }

    it("does show the 'show output' option when the failure type is `warning_difference", () => {
      const result = failures.WarningDifference({
        isSuccess: true,
        output: "OUTPUT",
        warning: "WARNING",
      })
      expectOption(result, "o", false)
    })

    it("Shows the 'show error' option only when errors and warnings are available", () => {
      const outputResult = failures.OutputDifference({
        isSuccess: true,
        output: "OUTPUT",
      })
      expectOption(outputResult, "e", false)
      const warningResult = failures.WarningDifference({
        isSuccess: true,
        output: "OUTPUT",
        warning: "WARNING",
      })
      expectOption(warningResult, "e")
      const errorResult = failures.ErrorDifference({
        isSuccess: false,
        error: "ERROR",
      })
      expectOption(errorResult, "e")
    })
  })

  describe("option resolution", () => {
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
        expect(await dir.contents("output.css")).toEqual("NEW OUTPUT")
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
        expect(await dir.contents("error")).toEqual("ERROR")
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
        expect(await dir.contents("output.css")).toEqual("OUTPUT")
        expect(await dir.contents("output-dart-sass.css")).toEqual(
          "DART OUTPUT"
        )
        expect(await dir.contents("output-sass-mock.css")).toEqual("NEW OUTPUT")
        expect(await dir.contents("warning-sass-mock")).toEqual("WARNING")
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
        expect(await dir.contents("output.css")).toEqual("OUTPUT")
        expect(await dir.contents("output-sass-mock.css")).toEqual("NEW OUTPUT")
        expect(await dir.contents("warning-sass-mock")).toEqual("WARNING")
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
        expect(await dir.contents("output.css")).toEqual("OUTPUT")
        expect(dir.hasFile("output-sass-mock.css")).toBeFalsy()
        expect(await dir.contents("error-sass-mock")).toEqual("ERROR")
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
        expect(await dir.contents("warning")).toEqual("WARNING")
        expect(dir.hasFile("warning-sass-mock")).toBeTruthy()
        expect(await dir.contents("warning-sass-mock")).toEqual("")
      })
    })

    describe("Mark test as todo for [impl].", () => {
      it.todo("works")
    })
  })

  describe("loop", () => {
    it("displays an input prompt with options", async () => {
      const input = Readable.from(["f\n"])
      const output = new MemoryWritable()
      const interactor = new Interactor(input, output)
      const dir = await fromPath(
        path.resolve(__dirname, "./fixtures/basic.hrx")
      )
      const result = failures.UnexpectedError({
        isSuccess: false,
        error: "error",
      })
      const newResult = await interactor.run({ impl: "sass-mock", dir, result })
      expect(newResult).toEqual(result)
      expect(output.contents()).toContain("Please select an option >")
    })

    it("displays options again if a print option is chosen", async () => {
      const input = Readable.from(["e\n", "f\n"])
      const output = new MemoryWritable()
      const interactor = new Interactor(input, output)
      const dir = await fromPath(
        path.resolve(__dirname, "./fixtures/basic.hrx")
      )
      const result = failures.UnexpectedError({
        isSuccess: false,
        error: "THIS IS ERROR",
      })
      const newResult = await interactor.run({ impl: "sass-mock", dir, result })
      expect(newResult).toEqual(result)
      expect(output.contents()).toContain(
        "************\nTHIS IS ERROR\n************"
      )
    })

    it("exits the loop with the updated content if a modification option is chosen", async () => {
      const input = Readable.from(["I\n"])
      const output = new MemoryWritable()
      const interactor = new Interactor(input, output)
      const dir = await fromPath(
        path.resolve(__dirname, "./fixtures/basic.hrx")
      )
      const result = failures.UnexpectedError({
        isSuccess: false,
        error: "THIS IS ERROR",
      })
      const newResult = await interactor.run({ impl: "sass-mock", dir, result })
      expect(newResult).toEqual({ type: "pass" })
      expect(await dir.contents("error-sass-mock")).toEqual("THIS IS ERROR")
    })

    it("prompts again if an invalid option was chosen", async () => {
      const input = Readable.from(["$\n", "f\n"])
      const output = new MemoryWritable()
      const interactor = new Interactor(input, output)
      const dir = await fromPath(
        path.resolve(__dirname, "./fixtures/basic.hrx")
      )
      const result = failures.UnexpectedError({
        isSuccess: false,
        error: "THIS IS ERROR",
      })
      const newResult = await interactor.run({ impl: "sass-mock", dir, result })
      expect(newResult).toEqual(result)
      expect(output.contents()).toContain("Invalid option chosen")
    })

    it("prompts again if an option that is not valid for the test failure is chosen", async () => {
      const input = Readable.from(["o\n", "f\n"])
      const output = new MemoryWritable()
      const interactor = new Interactor(input, output)
      const dir = await fromPath(
        path.resolve(__dirname, "./fixtures/basic.hrx")
      )
      const result = failures.UnexpectedError({
        isSuccess: false,
        error: "THIS IS ERROR",
      })
      const newResult = await interactor.run({ impl: "sass-mock", dir, result })
      expect(newResult).toEqual(result)
      expect(output.contents()).toContain("Invalid option chosen")
    })
  })

  describe("repeat", () => {
    it.todo("keeps track of chosen options")

    it.todo("only allows repeating modification options")
  })
})
