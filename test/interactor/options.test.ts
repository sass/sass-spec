import { optionsFor } from "../../lib-js/interactor"

describe("Interactor options", () => {
  it.todo("always includes certain choices")

  async function expectOption(key: string, valid: boolean = true) {
    const options = optionsFor(null as any)
    const keys = options.map((o) => o.key)
    if (valid) {
      expect(keys).toContain(key)
    } else {
      expect(keys).not.toContain(key)
    }
  }

  it("does show the 'show output' option when the failure type is `warning_difference", async () => {
    await expectOption("o", false)
  })

  it("Shows the 'show error' option only when errors and warnings are available", async () => {
    await expectOption("e", false)
    await expectOption("e")
    await expectOption("e")
  })
})
