import { optionsFor } from "../../lib-js/interactor"
import { failures, FailTestResult } from "../../lib-js/runner"

describe("Interactor options", () => {
  it.todo("always includes certain choices")

  function expectOption(
    result: FailTestResult,
    key: string,
    valid: boolean = true
  ) {
    const options = optionsFor({
      impl: "sass-mock",
      test: null as any,
      result,
    })
    const keys = options.map((o) => o.key)
    if (valid) {
      expect(keys).toContain(key)
    } else {
      expect(keys).not.toContain(key)
    }
  }

  it("does show the 'show output' option when the failure type is `warning_difference", () => {
    const result = failures.WarningDifference({
      isSuccess: true,
      output: "OUTPUT",
      warning: "WARNING",
    })
    expectOption(result, "o", false)
  })

  it("Shows the 'show error' option only when errors and warnings are available", () => {
    const outputResult = failures.OutputDifference({
      isSuccess: true,
      output: "OUTPUT",
    })
    expectOption(outputResult, "e", false)
    const warningResult = failures.WarningDifference({
      isSuccess: true,
      output: "OUTPUT",
      warning: "WARNING",
    })
    expectOption(warningResult, "e")
    const errorResult = failures.ErrorDifference({
      isSuccess: false,
      error: "ERROR",
    })
    expectOption(errorResult, "e")
  })
})
