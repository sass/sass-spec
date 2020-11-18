import { optionsFor } from "../../lib-js/interactor"
import { failures, FailTestResult } from "../../lib-js/test-case/util"

describe("Interactor options", () => {
  it.todo("always includes certain choices")

  async function expectOption(
    result: FailTestResult,
    key: string,
    valid: boolean = true
  ) {
    const options = await optionsFor({ test: null as any, result })
    const keys = options.map((o) => o.key)
    if (valid) {
      expect(keys).toContain(key)
    } else {
      expect(keys).not.toContain(key)
    }
  }

  it("does show the 'show output' option when the failure type is `warning_difference", async () => {
    const result = failures.WarningDifference()
    await expectOption(result, "o", false)
  })

  it("Shows the 'show error' option only when errors and warnings are available", async () => {
    const outputResult = failures.OutputDifference()
    await expectOption(outputResult, "e", false)
    const warningResult = failures.WarningDifference()
    await expectOption(warningResult, "e")
    const errorResult = failures.ErrorDifference()
    await expectOption(errorResult, "e")
  })
})
