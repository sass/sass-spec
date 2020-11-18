import { fromContents } from "../../lib-js/spec-directory"
import { mockCompiler } from "../fixtures/mock-compiler-2"
import TestCase from "../../lib-js/test-case"

describe("TestCase::actualResult()", () => {
  async function getResults(contents: string) {
    const dir = await fromContents(contents.trim())
    const test = new TestCase(dir, "sass-mock", mockCompiler(dir))
    await test.run()
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

  describe("options", () => {
    it.todo("passes precision argument correctly")
    it.todo("passes indented argument correctly")
  })
})
