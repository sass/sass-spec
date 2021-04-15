import { fromContents } from "../../lib-js/spec-directory"
import { mockCompiler } from "../fixtures/mock-compiler"
import TestCase from "../../lib-js/test-case"
import { SassResult } from "../../lib-js/test-case/util"

describe("TestCase::actual()", () => {
  async function getResults(contents: string): Promise<SassResult> {
    const dir = await fromContents(contents.trim())
    const test = await TestCase.create(dir, "sass-mock", mockCompiler(dir))
    return test.actual()
  }

  it("works for output case", async () => {
    const contents = `
<===> input.scss
stdout: OUTPUT
status: 0
<===> output.css
OUTPUT
`
    expect(await getResults(contents)).toEqual({
      output: "OUTPUT",
      isSuccess: true,
    })
  })

  it("works for error case", async () => {
    const contents = `
<===> input.scss
stderr: ERROR
status: 1
<===> output.css
OUTPUT
`
    expect(await getResults(contents)).toEqual({
      error: "ERROR",
      isSuccess: false,
    })
  })

  it("works for warning case", async () => {
    const contents = `
<===> input.scss
stdout: OUTPUT
stderr: WARNING
status: 0
<===> output.css
OUTPUT
`
    expect(await getResults(contents)).toEqual({
      output: "OUTPUT",
      warning: "WARNING",
      isSuccess: true,
    })
  })

  it("errors if multiple inputs defined in the directory", async () => {
    const contents = `
<===> input.scss
stdout: OUTPUT
status: 0
<===> input.sass
stdout: OUTPUT
status: 0
<===> output.css
OUTPUT
`
    expect(() => getResults(contents)).rejects.toThrow()
  })

  describe("command args", () => {
    it("passes precision argument to the compiler", async () => {
      const contents = `
<===> options.yml
:precision: 6
<===> input.scss
stdout: OUTPUT
stderr: WARNING
status: 0
<===> output.css
OUTPUT
`.trim()
      const compile = jest.fn(async () => ({
        stdout: "",
        stderr: "",
        status: 0,
      }))
      const compiler = { compile, shutdown() {} }
      const dir = await fromContents(contents.trim())
      await TestCase.create(dir, "sass-mock", compiler)
      expect(compile).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining(["--precision", "6"])
      )
    })
  })
})
