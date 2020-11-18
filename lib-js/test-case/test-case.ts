import yaml from "js-yaml"
import type { SpecDirectory } from "../spec-directory"
import { RunOption, RunOptions, optionsForImpl } from "../options"
import { Compiler } from "../compiler"
import {
  failures,
  getExpectedFiles,
  compareResults,
  SassResult,
  TestResult,
} from "./util"

/**
 * A wrapper around a SpecDirectory that represents a sass-spec test case.
 *
 * Contains methods for running the test and updating the underlying directory
 * based on the results.
 */
export default class TestCase {
  dir: SpecDirectory
  impl: string
  compiler: Compiler
  todoMode?: string
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
  isIndented() {
    return this.dir.hasFile("input.sass")
  }

  /** Return the name of the input file of this test directory. */
  inputFile() {
    return this.isIndented() ? "input.sass" : "input.scss"
  }

  /** Get the contents of the input file for this test directory. */
  async input() {
    const inputFile = this.isIndented() ? "input.sass" : "input.scss"
    return await this.dir.readFile(inputFile)
  }

  /** Get the precision for this test directory */
  async precision() {
    return (await this.dir.options())[":precision"]
  }

  /** Add the given option for the given impl */
  async addOptionForImpl(option: RunOption) {
    const options = await this.dir.directOptions()
    const newOption = [...(options[option] ?? []), this.impl]
    const newOptions: RunOptions = { ...options, [option]: newOption }
    await this.dir.writeFile("options.yml", yaml.safeDump(newOptions))
  }

  expectsSuccess() {
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

  /**
   * Get the actual result of running the given compiler and implementation
   * on this test case.
   */
  private async getActualResult(): Promise<SassResult> {
    const precision = await this.precision()

    const cmdArgs = []
    // Pass in the indentend option to the command
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
    const { mode, todoWarning } = optionsForImpl(
      await this.dir.options(),
      this.impl
    )
    // FIXME how should we set things if this is todo
    if (mode === "ignore") {
      return { type: "skip" }
    }

    if (mode === "todo" && !this.todoMode) {
      return { type: "todo" }
    }

    const [expected, actual] = await Promise.all([
      this.expected(),
      this.getActualResult(),
    ])

    const skipWarning = todoWarning && !this.todoMode
    const trimErrors = this.impl !== "dart-sass"
    const testResult = compareResults(expected, actual, trimErrors, skipWarning)
    // If we're probing todos
    if (mode === "todo" && this.todoMode === "probe") {
      if (testResult.type === "pass") {
        return failures.UnnecessaryTodo()
      } else {
        return { type: "todo" }
      }
    }
    this._actual = actual
    this._result = testResult
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

  // Overwrite the set of results to be equal to the provided result
  private async overwriteResults(impl?: string) {
    const [outputFile, warningFile, errorFile] = getExpectedFiles(impl)
    const actual = this.actual()
    if (actual.isSuccess) {
      await Promise.all([
        this.dir.writeFile(outputFile, actual.output),
        actual.warning
          ? this.dir.writeFile(warningFile, actual.warning)
          : this.dir.removeFile(warningFile),
        this.dir.removeFile(errorFile),
      ])
    } else {
      await Promise.all([
        this.dir.writeFile(errorFile, actual.error),
        this.dir.removeFile(outputFile),
        this.dir.removeFile(warningFile),
      ])
    }
  }

  /**
   * Overwrite the base results with the actual results
   */
  async overwrite() {
    // overwrite the contents of the base files
    await this.overwriteResults()
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
    await this.overwriteResults(this.impl)
    // If a nonempty base warning exists, but the actual result yields no warning,
    // create a warning file
    if (
      this.dir.hasFile("warning") &&
      !!this.dir.readFile("warning") &&
      actual.isSuccess &&
      !actual.warning
    ) {
      await this.dir.writeFile(`warning-${this.impl}`, "")
    }
    this._result = { type: "pass" }
  }
}
