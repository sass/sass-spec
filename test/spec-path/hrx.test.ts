import { fromContents } from "../../lib-js/spec-path"

describe("SpecPath::toHrx", () => {
  async function expectHrx(input: string, expected: string = input) {
    input = input.trim()
    expected = expected.trim()
    const dir = await fromContents(input)
    expect(await dir.toHrx()).toEqual(expected)
  }
  it("writes contents of a normal directory in alphabetical order", async () => {
    const input = `
<===> apple
apple
<===> coconut
coconut
<===> banana
banana
`
    const expected = `
<===> apple
apple
<===> banana
banana
<===> coconut
coconut
`
    await expectHrx(input, expected)
  })

  it("splits nested directories into sections", async () => {
    const input = `
<===> mushrooms/morel
morel
<===> vegetables/carrot
carrot
<===> banana
banana
<===> vegetables/potato
potato
<===> apple
apple
<===> mushrooms/shiitake
shiitake
`
    const expected = `
<===> apple
apple
<===> banana
banana
<===>
================================================================================
<===> mushrooms/morel
morel
<===> mushrooms/shiitake
shiitake
<===>
================================================================================
<===> vegetables/carrot
carrot
<===> vegetables/potato
potato
`
    await expectHrx(input, expected)
  })

  it("overwrite test directories in style-guide order", async () => {
    const input = `
<===> output.css
OUTPUT
<===> _util.scss
UTIL
<===> output-dart-sass.css
IMPL OUTPUT
<===> warning-libsass
IMPL WARNING
<===> input.scss
INPUT
<===> warning
WARNING
`
    const expected = `
<===> input.scss
INPUT
<===> _util.scss
UTIL
<===> output.css
OUTPUT
<===> output-dart-sass.css
IMPL OUTPUT
<===> warning
WARNING
<===> warning-libsass
IMPL WARNING
`
    await expectHrx(input, expected)
  })

  it.todo("processes multiple test directories in a single archive correctly")
})
