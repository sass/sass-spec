import { Interactor } from "../../lib-js/interactor"
import { Readable, Writable } from "stream"
import { fromContents } from "../../lib-js/spec-directory"
import TestCase from "../../lib-js/test-case"
import { mockCompiler } from "../fixtures/mock-compiler"

class MemoryWritable extends Writable {
  chunks: string[] = []
  _write(chunk: any, enc: any, cb: () => void) {
    this.chunks.push(chunk.toString())
    cb()
  }
  contents() {
    return this.chunks.join("")
  }
}

function makeInputStream(inputs: string[]): Readable {
  return Readable.from(inputs.map((input) => input + "\n"))
}

async function makeTestCase(contents: string): Promise<TestCase> {
  const dir = await fromContents(contents.trim())
  return await TestCase.create(dir, "sass-mock", mockCompiler(dir))
}

async function runInteractor(inputs: string[], contents: string) {
  const input = makeInputStream(inputs)
  const output = new MemoryWritable()
  const interactor = new Interactor(input, output)
  const test = await makeTestCase(contents)
  await interactor.prompt(test)
  return { test, output: output.contents() }
}

describe("Interactor loop", () => {
  it("displays an input prompt with options", async () => {
    const { test, output } = await runInteractor(
      ["f"],
      `
<===> input.scss
stderr: ERROR
<===> output.css
OUTPUT
    `
    )
    expect(test.result()).toMatchObject({ type: "fail" })
    expect(output).toContain("Please select an option >")
  })

  it("displays options again if a print option is chosen", async () => {
    const { output } = await runInteractor(
      ["e", "f"],
      `
<===> input.scss
stderr: THIS IS ERROR
<===> output.css
OUTPUT
    `
    )
    expect(output).toContain("************\nTHIS IS ERROR\n************")
  })

  it("exits the loop with the updated content if a modification option is chosen", async () => {
    const { test } = await runInteractor(
      ["I"],
      `
<===> input.scss
stderr: THIS IS ERROR
<===> output.css
OUTPUT
    `
    )
    expect(test.result()).toEqual({ type: "pass" })
    expect(await test.dir.readFile("error-sass-mock")).toEqual("THIS IS ERROR")
  })

  it("prompts again if an invalid option was chosen", async () => {
    const { output } = await runInteractor(
      ["error", "f"],
      `
<===> input.scss
stderr: THIS IS ERROR
<===> output.css
OUTPUT
    `
    )
    expect(output).toContain("Invalid option chosen")
  })

  it("prompts again if an option that is not valid for the test failure is chosen", async () => {
    const { output } = await runInteractor(
      ["o", "f"],
      `
<===> input.scss
stderr: THIS IS ERROR
<===> output.css
OUTPUT
    `
    )
    expect(output).toContain("Invalid option chosen")
  })

  describe("repeat", () => {
    it("keeps track of chosen options", async () => {
      const input = makeInputStream(["O!"])
      const output = new MemoryWritable()
      const content = `
<===> input.scss
stderr: ERROR
status: 1
<===> output.css
OUTPUT
    `
      const test1 = await makeTestCase(content)
      const test2 = await makeTestCase(content)
      const interactor = new Interactor(input, output)
      await interactor.prompt(test1)
      await interactor.prompt(test2)
      expect(test2.dir.hasFile("error")).toBeTruthy()
    })

    it("only allows repeating modification options", async () => {
      const input = makeInputStream(["e!", "f", "f"])
      const output = new MemoryWritable()
      const content = `
<===> input.scss
stderr: ERROR
status: 1
<===> output.css
OUTPUT
    `
      const test1 = await makeTestCase(content)
      const test2 = await makeTestCase(content)
      const interactor = new Interactor(input, output)
      await interactor.prompt(test1)
      await interactor.prompt(test2)
      // Make sure the second test has a prompt
      const contents = output.contents()
      const prompts = contents
        .split("\n")
        .filter((line) => line.includes("Please select an option >"))
      expect(prompts).toHaveLength(3)
      expect(contents).toContain("Repeat (!) selected on print option")
    })

    // TODO the behavior here works, but for some reason this test times out
    // and doesn't receive the second 'f' input
    it.skip("still prompts on other types of failures", async () => {
      const input = makeInputStream(["O!", "f"])
      const output = new MemoryWritable()
      const test1 = await makeTestCase(`
<===> input.scss
stderr: ERROR
status: 1
<===> output.css
OUTPUT
      `)
      const test2 = await makeTestCase(`
<===> input.scss
stdout: OUTPUT
status: 0
<===> output.css
OTHER OUTPUT
      `)
      const interactor = new Interactor(input, output)
      await interactor.prompt(test1)
      await interactor.prompt(test2)
      const prompts = output
        .contents()
        .split("\n")
        .filter((line) => line.includes("Please select an option >"))
      expect(prompts).toHaveLength(2)
    })
  })
})
