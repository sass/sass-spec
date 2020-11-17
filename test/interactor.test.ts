import path from "path"
import { optionsFor, Interactor } from "../lib-js/interactor"
import { Readable, Writable } from "stream"
import { fromPath } from "../lib-js/spec-path"
import { FailTestResult } from "../lib-js/test-case"

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

    it("does not allow showing output when the failure type is `warning_difference", () => {
      const result: FailTestResult = {
        type: "fail",
        failureType: "warning_difference",
        message: "warning difference",
        actual: {
          isSuccess: true,
          output: "OUTPUT",
          warning: "WARNING",
        },
      }
      const options = optionsFor({
        impl: "sass-mock",
        dir: null as any,
        result,
      })
      const keys = options.map((o) => o.key)
      expect(keys).not.toContain("o")
    })
  })

  describe("option resolution", () => {
    describe("Update expected output and pass test.", async () => {
      it.todo("works when there are no overrides")
      it.todo("works when there are overrides")
    })

    describe("Migrate copy of test to pass on [impl]", async () => {
      it.todo("works on success cases")
      it.todo("works on error cases")
    })
  })

  it.todo("handles each option correctly")

  describe("loop", () => {
    it("displays an input prompt with options", async () => {
      const input = Readable.from(["f\n"])
      const output = new MemoryWritable()
      const interactor = new Interactor(input, output)
      const dir = await fromPath(
        path.resolve(__dirname, "./fixtures/basic.hrx")
      )
      const result: FailTestResult = {
        type: "fail",
        failureType: "unexpected_error",
        message: "Test case should succeed but it did not",
        actual: {
          isSuccess: false,
          error: "error",
        },
      }
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
      const result: FailTestResult = {
        type: "fail",
        failureType: "unexpected_error",
        message: "Test case should succeed but it did not",
        actual: {
          isSuccess: false,
          error: "THIS IS ERROR",
        },
      }
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
      const result: FailTestResult = {
        type: "fail",
        failureType: "unexpected_error",
        message: "Test case should succeed but it did not",
        actual: {
          isSuccess: false,
          error: "THIS IS ERROR",
        },
      }
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
      const result: FailTestResult = {
        type: "fail",
        failureType: "unexpected_error",
        message: "Test case should succeed but it did not",
        actual: {
          isSuccess: false,
          error: "THIS IS ERROR",
        },
      }
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
      const result: FailTestResult = {
        type: "fail",
        failureType: "unexpected_error",
        message: "Test case should succeed but it did not",
        actual: {
          isSuccess: false,
          error: "THIS IS ERROR",
        },
      }
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
