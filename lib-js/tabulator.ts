import TestCase from "./test-case"
import { Writable } from "stream"

const symbols = {
  pass: ".",
  fail: "F",
  todo: "-",
  skip: "",
  error: "E",
}

/**
 * Tabulates test result data and provides functionality for pretty printing it.
 */
export default class Tabulator {
  private total = 0
  private counts = { pass: 0, fail: 0, todo: 0, skip: 0, error: 0 }
  private output: Writable
  private failures: TestCase[] = []
  private todos: TestCase[] = []
  private verbose: boolean

  /**
   * @param output the output stream to print the results to
   * @param verbose whether the output should be printed verbosely
   */
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
    if (result.type === "fail" || result.type === "error") {
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

  /**
   * Print the accumulated results of all tabulated tests.
   */
  printResults() {
    this.writeLine()
    this.printFailuresAndErrors()
    if (this.verbose) {
      this.printTodos()
    }
    this.writeLine(
      `${this.total} runs, ${this.counts.pass} passing, ${this.counts.fail} failures, ${this.counts.todo} todo, ${this.counts.skip} ignored, ${this.counts.error} errors`
    )
  }

  private writeLine(text: string = "") {
    this.output.write(text + "\n")
  }

  private printFailuresAndErrors() {
    for (const failure of this.failures) {
      const result = failure.result()
      if (result.type === "fail") {
        // If it's a test failure (a mismatch between expected and actual output),
        // log the message and diff (if available)
        this.writeLine(`Failure: ${failure.dir.relPath()}`)
        this.writeLine(result.message)
        if (result.diff) {
          this.writeLine(result.diff)
        }
      } else {
        // Otherwise it's an error (thrown due to invalid specs or other reasons),
        // so print the stacktrace
        this.writeLine(`Error: ${failure.dir.relPath()}`)
        this.writeLine(result.error?.stack)
      }
      this.writeLine()
    }
  }

  private printTodos() {
    for (const todo of this.todos) {
      this.writeLine(`TODO: ${todo.dir.relPath()}`)
      this.writeLine()
    }
  }
}
