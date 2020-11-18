import { Interactor } from "../../lib-js/interactor"
import { Readable, Writable } from "stream"
import { fromContents } from "../../lib-js/spec-directory"
import TestCase from "../../lib-js/test-case"
import { mockCompiler } from "../fixtures/mock-compiler-2"

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
    const contents = `
<===> input.scss
stderr: ERROR
<===> output.css
OUTPUT
`.trim()
    const dir = await fromContents(contents)
    const test = new TestCase(dir, "sass-mock", mockCompiler(dir))
    const result = (await test.testResult()) as any
    const newResult = await interactor.run({ test, result })
    expect(newResult).toEqual(result)
    expect(output.contents()).toContain("Please select an option >")
  })

  it("displays options again if a print option is chosen", async () => {
    const input = Readable.from(["e\n", "f\n"])
    const output = new MemoryWritable()
    const interactor = new Interactor(input, output)
    const contents = `
<===> input.scss
stderr: THIS IS ERROR
<===> output.css
OUTPUT
`.trim()
    const dir = await fromContents(contents)
    const test = new TestCase(dir, "sass-mock", mockCompiler(dir))
    const result = (await test.testResult()) as any
    const newResult = await interactor.run({ test, result })
    expect(newResult).toEqual(result)
    expect(output.contents()).toContain(
      "************\nTHIS IS ERROR\n************"
    )
  })

  it("exits the loop with the updated content if a modification option is chosen", async () => {
    const input = Readable.from(["I\n"])
    const output = new MemoryWritable()
    const interactor = new Interactor(input, output)
    const contents = `
<===> input.scss
stderr: THIS IS ERROR
<===> output.css
OUTPUT
`.trim()
    const dir = await fromContents(contents)
    const test = new TestCase(dir, "sass-mock", mockCompiler(dir))
    const result = (await test.testResult()) as any
    const newResult = await interactor.run({ test, result })
    expect(newResult).toEqual({ type: "pass" })
    expect(await test.dir.readFile("error-sass-mock")).toEqual("THIS IS ERROR")
  })

  it("prompts again if an invalid option was chosen", async () => {
    const input = Readable.from(["$\n", "f\n"])
    const output = new MemoryWritable()
    const interactor = new Interactor(input, output)
    const contents = `
<===> input.scss
stderr: THIS IS ERROR
<===> output.css
OUTPUT
`.trim()
    const dir = await fromContents(contents)
    const test = new TestCase(dir, "sass-mock", mockCompiler(dir))
    const result = (await test.testResult()) as any
    const newResult = await interactor.run({ test, result })
    expect(newResult).toEqual(result)
    expect(output.contents()).toContain("Invalid option chosen")
  })

  it("prompts again if an option that is not valid for the test failure is chosen", async () => {
    const input = Readable.from(["o\n", "f\n"])
    const output = new MemoryWritable()
    const interactor = new Interactor(input, output)
    const contents = `
<===> input.scss
stderr: THIS IS ERROR
<===> output.css
OUTPUT
`.trim()
    const dir = await fromContents(contents)
    const test = new TestCase(dir, "sass-mock", mockCompiler(dir))
    const result = (await test.testResult()) as any
    const newResult = await interactor.run({ test, result })
    expect(newResult).toEqual(result)
    expect(output.contents()).toContain("Invalid option chosen")
  })

  describe("repeat", () => {
    it.todo("keeps track of chosen options")

    it.todo("only allows repeating modification options")
  })
})
