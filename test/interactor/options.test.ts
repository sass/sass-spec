import { TestCaseArg, optionsFor } from "../../lib-js/interactor"

function mockTestCase(args: any = {}): TestCaseArg {
  return {
    impl: args.impl ?? "sass-mock",
    actual: () => args.actual ?? {},
    result: () => args.result ?? {},
  }
}

describe("Interactor options", () => {
  it.todo("always includes certain choices")

  async function expectOption(key: string, args: any, valid: boolean = true) {
    const options = optionsFor(mockTestCase(args))
    const keys = options.map((o) => o.key)
    if (valid) {
      expect(keys).toContain(key)
    } else {
      expect(keys).not.toContain(key)
    }
  }

  it("does show the 'show output' option when the failure type is `warning_difference", async () => {
    const arg = { result: { failureType: "warning_difference" } }
    await expectOption("o", arg, false)
  })

  it("Shows the 'show error' option only when errors and warnings are available", async () => {
    await expectOption(
      "e",
      { actual: { isSuccess: true, output: "output" } },
      false
    )
    await expectOption("e", {
      actual: { isSuccess: true, output: "output", warning: "warning" },
    })
    await expectOption("e", { actual: { isSuccess: false, error: "error" } })
  })
})
