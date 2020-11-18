import path from "path"
import { Interactor } from "../../lib-js/interactor"
import { Readable, Writable } from "stream"
import { fromPath } from "../../lib-js/spec-directory"
import { failures } from "../../lib-js/test-case"

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

describe("Interactor loop", () => {
  it("displays an input prompt with options", async () => {
    const input = Readable.from(["f\n"])
    const output = new MemoryWritable()
    const interactor = new Interactor(input, output)
    const dir = await fromPath(path.resolve(__dirname, "../fixtures/basic.hrx"))
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
    const dir = await fromPath(path.resolve(__dirname, "../fixtures/basic.hrx"))
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
    const dir = await fromPath(path.resolve(__dirname, "../fixtures/basic.hrx"))
    const result = failures.UnexpectedError({
      isSuccess: false,
      error: "THIS IS ERROR",
    })
    const newResult = await interactor.run({ impl: "sass-mock", dir, result })
    expect(newResult).toEqual({ type: "pass" })
    expect(await dir.readFile("error-sass-mock")).toEqual("THIS IS ERROR")
  })

  it("prompts again if an invalid option was chosen", async () => {
    const input = Readable.from(["$\n", "f\n"])
    const output = new MemoryWritable()
    const interactor = new Interactor(input, output)
    const dir = await fromPath(path.resolve(__dirname, "../fixtures/basic.hrx"))
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
    const dir = await fromPath(path.resolve(__dirname, "../fixtures/basic.hrx"))
    const result = failures.UnexpectedError({
      isSuccess: false,
      error: "THIS IS ERROR",
    })
    const newResult = await interactor.run({ impl: "sass-mock", dir, result })
    expect(newResult).toEqual(result)
    expect(output.contents()).toContain("Invalid option chosen")
  })

  describe("repeat", () => {
    it.todo("keeps track of chosen options")

    it.todo("only allows repeating modification options")
  })
})
