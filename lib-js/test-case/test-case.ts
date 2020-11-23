import yaml from "js-yaml"
import type { SpecDirectory } from "../spec-directory"
import { RunOption, RunOptions, optionsForImpl } from "../options"
import { Compiler } from "../compiler"
import {
  failures,
  TestResult,
  getExpectedFiles,
  overwriteResults,
  SassResult,
} from "./util"
import { compareResults } from "./compare"

/**
 * A wrapper around a SpecDirectory that represents a sass-spec test case.
 *
 * Contains methods for running the test and updating the underlying directory
 * based on the results.
 */
export default class TestCase {
  readonly dir: SpecDirectory
  readonly impl: string
  private compiler: Compiler
  private todoMode?: string
  private _actual?: SassResult
  private _result?: TestResult

  constructor(
    dir: SpecDirectory,
    impl: string,
    compiler: Compiler,
    todoMode?: string
  ) {
    this.dir = dir
    this.impl = impl
    this.compiler = compiler
    this.todoMode = todoMode
  }

  /** Return whether this test directory has an indented sass file */
  private isIndented() {
    return this.dir.hasFile("input.sass")
  }

  /** Return the name of the input file of this test directory. */
  private inputFile() {
    return this.isIndented() ? "input.sass" : "input.scss"
  }

  /** Get the contents of the input file for this test directory. */
  async input() {
    const inputFile = this.isIndented() ? "input.sass" : "input.scss"
    return await this.dir.readFile(inputFile)
  }

  /** Get the precision for this test directory */
  private async precision() {
    return (await this.dir.options())[":precision"] ?? 10
  }

  private expectsSuccess() {
    return (
      this.dir.hasFile(`output-${this.impl}.css`) ||
      (this.dir.hasFile("output.css") &&
        !this.dir.hasFile(`error-${this.impl}`))
    )
  }

  private getResultFile(type: "output" | "warning" | "error") {
    const ext = type === "output" ? ".css" : ""
    const overrideFile = `${type}-${this.impl}${ext}`
    return this.dir.hasFile(overrideFile) ? overrideFile : `${type}${ext}`
  }

  async expected(): Promise<SassResult> {
    const isSuccessCase = this.expectsSuccess()
    const resultFilename = this.getResultFile(
      isSuccessCase ? "output" : "error"
    )

    let warning
    // check if there's a warning
    const warningFilename = this.getResultFile("warning")
    if (this.dir.hasFile(warningFilename)) {
      warning = await this.dir.readFile(warningFilename)
    }

    const expected = await this.dir.readFile(resultFilename)

    if (isSuccessCase) {
      return { isSuccess: true, output: expected, warning }
    } else {
      return { isSuccess: false, error: expected }
    }
  }

  // Run the compiler and calculate the actual result
  private async calcActualResult(): Promise<SassResult> {
    const precision = await this.precision()

    const cmdArgs = []
    // Pass in the indented option to the command
    if (this.isIndented()) {
      cmdArgs.push(this.impl === "dart-sass" ? "--indented" : "--sass")
    }
    if (precision) {
      cmdArgs.push(`--precision`)
      cmdArgs.push(`${precision}`)
    }
    cmdArgs.push(this.inputFile())

    const { stdout, stderr, status } = await this.compiler.compile(
      this.dir.path,
      cmdArgs
    )
    if (status === 0) {
      return { isSuccess: true, output: stdout, warning: stderr }
    } else {
      return { isSuccess: false, error: stderr }
    }
  }

  async run(): Promise<TestResult> {
    if (this._result) {
      throw new Error(`Test case ${this.dir.relPath()} has already been run`)
    }
    // Remember to cache the results of the run, regardless of result
    this._result = await this.doRun()
    return this._result
  }

  // Do the test run, storing the actual output if there is one, and return the test result
  private async doRun(): Promise<TestResult> {
    const { mode, todoWarning } = optionsForImpl(
      await this.dir.options(),
      this.impl
    )

    if (mode === "ignore") {
      return { type: "skip" }
    }
    if (mode === "todo" && !this.todoMode) {
      return { type: "todo" }
    }

    const [expected, actual] = await Promise.all([
      this.expected(),
      this.calcActualResult(),
    ])
    this._actual = actual

    const testResult = compareResults(expected, actual, {
      // Compare the full error only for dart-sass
      trimErrors: this.impl !== "dart-sass",
      // Skip warning checks :warning_todo is enabled and we're not running todos
      skipWarning: todoWarning && !this.todoMode,
    })
    // If we're probing todo
    if (this.todoMode === "probe") {
      if (mode === "todo") {
        if (testResult.type === "pass") {
          return failures.UnnecessaryTodo()
        } else {
          return { type: "todo" }
        }
      }
      if (todoWarning) {
        if (testResult.type === "pass") {
          return failures.UnnecessaryTodo()
        } else {
          return { type: "pass" }
        }
      }
    }
    return testResult
  }

  actual() {
    if (!this._actual) {
      throw new Error(`Test case ${this.dir.relPath()} has not yet run.`)
    }
    return this._actual
  }

  result() {
    if (!this._result) {
      throw new Error(`Test case ${this.dir.relPath()} has not yet run.`)
    }
    return this._result
  }

  // Mutations

  /** Add the given option for the given impl */
  async addOptionForImpl(option: RunOption) {
    const options = await this.dir.directOptions()
    const newOption = [...(options[option] ?? []), this.impl]
    const newOptions: RunOptions = { ...options, [option]: newOption }
    await this.dir.writeFile("options.yml", yaml.safeDump(newOptions))
  }

  /**
   * Overwrite the base results with the actual results
   */
  async overwrite() {
    // overwrite the contents of the base files
    await overwriteResults(this.dir, this.actual())
    // delete any override files for this impl
    await Promise.all(
      getExpectedFiles(this.impl).map((filename) =>
        this.dir.removeFile(filename)
      )
    )
    this._result = { type: "pass" }
  }

  /**
   * Migrate a copy of the expected results to pass on impl
   */
  async migrateImpl() {
    const actual = this.actual()
    await overwriteResults(this.dir, this.actual(), this.impl)
    // If a nonempty base warning exists, but the actual result yields no warning,
    // create a warning file
    if (
      this.dir.hasFile("warning") &&
      this.dir.readFile("warning") &&
      actual.isSuccess &&
      !actual.warning
    ) {
      await this.dir.writeFile(`warning-${this.impl}`, "")
    }
    this._result = { type: "pass" }
  }

  /** Mark this test (or its warning) as TODO */
  async markTodo() {
    if (this.result().failureType === "warning_difference") {
      await this.addOptionForImpl(":warning_todo")
      this._result = { type: "pass" }
    } else {
      await this.addOptionForImpl(":todo")
      this._result = { type: "todo" }
    }
  }

  /** Mark this test as ignored for the current implementation */
  async markIgnore() {
    await this.addOptionForImpl(":ignore_for")
    this._result = { type: "skip" }
  }
}
