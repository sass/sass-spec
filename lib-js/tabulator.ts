import TestCase from "./test-case"
import { Writable } from "stream"

const symbols = {
  pass: ".",
  fail: "F",
  todo: "-",
  skip: "",
}

export default class Tabulator {
  total = 0
  counts = { pass: 0, fail: 0, todo: 0, skip: 0 }
  output: Writable
  failures: TestCase[] = []

  constructor(output: Writable) {
    this.output = output
  }

  tabulate(test: TestCase) {
    const result = test.result()
    this.total++
    this.counts[result.type]++
    this.output.write(symbols[result.type])
    if (result.type === "fail") {
      this.failures.push(test)
    }
  }

  writeLine(text: string = "") {
    this.output.write(text + "\n")
  }

  printResults() {
    this.writeLine()

    for (const failure of this.failures) {
      this.writeLine(`Failure: ${failure.dir.relPath()}`)
      this.writeLine(failure.result().message)
      if (failure.result().diff) {
        this.writeLine(failure.result().diff)
      }
      this.writeLine()
    }

    this.writeLine(
      `${this.total} runs, ${this.counts.pass} passing, ${this.counts.fail} failures, ${this.counts.todo} todo, ${this.counts.skip} skips`
    )
  }
}
