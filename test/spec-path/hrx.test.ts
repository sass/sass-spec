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
    await expectHrx(input)
  })

  it("splits nested directories into sections", async () => {
    const input = `
<===> mushrooms/morel
morel
<===> banana
banana
<===> vegetables/potato
potato
<===> apple
apple
<===> mushrooms/shiitake
shiitake
<===> vegetables/carrot
carrot
`
    const expected = `
<===> banana
banana
<===> apple
apple
<===>
================================================================================
<===> mushrooms/morel
morel
<===> mushrooms/shiitake
shiitake
<===>
================================================================================
<===> vegetables/potato
potato
<===> vegetables/carrot
carrot
`
    await expectHrx(input, expected)
  })

  it("doesn't print extra sections on deeply nested directories", async () => {
    const input = `
<===> a/b/c/README.md
this is a deep file
`
    await expectHrx(input)
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
<===> subdir/input.scss
MORE UTIL
<===> options.yml
OPTIONS
<===> input.scss
INPUT
<===> warning
WARNING
`
    const expected = `
<===> options.yml
OPTIONS
<===> input.scss
INPUT
<===> _util.scss
UTIL
<===> subdir/input.scss
MORE UTIL
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
