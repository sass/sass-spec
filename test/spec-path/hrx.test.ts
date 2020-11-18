import { fromContents } from "../../lib-js/spec-path"

describe("SpecPath::toHrx", () => {
  async function expectHrxIdempotent(contents: string) {
    contents = contents.trimStart()
    const dir = await fromContents(contents)
    expect(await dir.toHrx()).toEqual(contents)
  }
  it("works on a normal directory", async () => {
    await expectHrxIdempotent(`
<===> apple
apple
<===> banana
banana
<===> coconut
coconut`)
  })

  it("works on a normal directory with nested blocks", async () => {
    await expectHrxIdempotent(`
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
coconut
<===> vegetables/potato
potato`)
  })
})
