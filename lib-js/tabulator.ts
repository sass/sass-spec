import TestCase from "./test-case"
import { Writable } from "stream"

const symbols = {
  pass: ".",
  fail: "F",
  todo: "-",
  skip: "",
}

export default class Tabulator {
  private total = 0
  private counts = { pass: 0, fail: 0, todo: 0, skip: 0 }
  private output: Writable
  private failures: TestCase[] = []
  private todos: TestCase[] = []
  private verbose: boolean

  constructor(output: Writable, verbose = false) {
    this.output = output
    this.verbose = verbose
  }

  /**
   * Append the results of the test case to the total results and print.
   */
  tabulate(test: TestCase) {
    const result = test.result()
    this.total++
    this.counts[result.type]++
    if (result.type === "fail") {
      this.failures.push(test)
    } else if (result.type === "todo") {
      this.todos.push(test)
    }

    if (result.type !== "skip") {
      const symbol = symbols[result.type]
      if (this.verbose) {
        this.writeLine(`${symbol} ${test.dir.relPath()}`)
      } else {
        this.output.write(symbols[result.type])
      }
    }
  }

  writeLine(text: string = "") {
    this.output.write(text + "\n")
  }

  printFailures() {
    for (const failure of this.failures) {
      this.writeLine(`Failure: ${failure.dir.relPath()}`)
      this.writeLine(failure.result().message)
      if (failure.result().diff) {
        this.writeLine(failure.result().diff)
      }
      this.writeLine()
    }
  }

  printTodos() {
    for (const todo of this.todos) {
      this.writeLine(`TODO: ${todo.dir.relPath()}`)
      this.writeLine()
    }
  }

  printResults() {
    this.writeLine()
    this.printFailures()
    if (this.verbose) {
      this.printTodos()
    }
    this.writeLine(
      `${this.total} runs, ${this.counts.pass} passing, ${this.counts.fail} failures, ${this.counts.todo} todo, ${this.counts.skip} ignored`
    )
  }
}
