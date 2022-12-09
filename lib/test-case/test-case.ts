import type {SpecDirectory, OptionKey} from '../spec-directory';
import {Compiler} from '../compiler';
import {
  failures,
  TestResult,
  getExpectedFiles,
  overwriteResults,
  SassResult,
} from './util';
import {compareResults} from './compare';
import {getExpectedResult} from './expected';

/**
 * A wrapper around a SpecDirectory that represents a sass-spec test case.
 *
 * Contains methods for running the test and updating the underlying directory
 * based on the results.
 */
export default class TestCase {
  readonly dir: SpecDirectory;
  readonly impl: string;
  private compiler: Compiler;
  private todoMode?: string;
  private _actual?: SassResult;
  private _result?: TestResult;

  // Private constructor that instantiates properties.
  // The only way to create a test case is through the async factory below
  private constructor(
    dir: SpecDirectory,
    impl: string,
    compiler: Compiler,
    todoMode?: string
  ) {
    this.dir = dir;
    this.impl = impl;
    this.compiler = compiler;
    this.todoMode = todoMode;
  }

  /**
   * Run the spec at the given directory and return a TestCase object representing it
   */
  static async create(
    dir: SpecDirectory,
    impl: string,
    compiler: Compiler,
    todoMode?: string
  ): Promise<TestCase> {
    const testCase = new TestCase(dir, impl, compiler, todoMode);
    try {
      testCase._result = await testCase.run();
    } catch (caught) {
      const error = caught instanceof Error ? caught : new Error(`${caught}`);
      testCase._actual = {isSuccess: false, error: error.toString()};
      testCase._result = {type: 'error', error};
    }
    return testCase;
  }

  /** Return the name of the input file of this test directory. */
  private inputFile(): string {
    if (this.dir.hasFile('input.sass') && this.dir.hasFile('input.scss')) {
      throw new Error(`Multiple input files found in ${this.dir.relPath()}`);
    }
    return this.dir.hasFile('input.sass') ? 'input.sass' : 'input.scss';
  }

  /** Get the contents of the input file for this test directory. */
  async input(): Promise<string> {
    return await this.dir.readFile(this.inputFile());
  }

  // Run the compiler and calculate the actual result
  private async calcActualResult(): Promise<SassResult> {
    const precision = (await this.dir.options()).precision();

    const cmdArgs = [];
    // Pass in the indented option to the command
    if (precision) {
      cmdArgs.push('--precision');
      cmdArgs.push(`${precision}`);
    }
    cmdArgs.push(this.inputFile());

    const {stdout, stderr, status} = await this.compiler.compile(
      this.dir.path,
      cmdArgs
    );

    // stderr can contain extra trailing newlines which just clog up the HRX
    // files without any particular purpose.
    const normalizedStderr = stderr.replace(/(\r?\n)+$/, '\n');

    if (status === 0) {
      return {isSuccess: true, output: stdout, warning: normalizedStderr};
    } else {
      return {isSuccess: false, error: normalizedStderr};
    }
  }

  // Do the test run, storing the actual output if there is one, and return the test result
  private async run(): Promise<TestResult> {
    const options = await this.dir.options();
    const mode = options.getMode(this.impl);
    const warningTodo = options.isWarningTodo(this.impl);

    if (mode === 'ignore') {
      return {type: 'skip'};
    }
    if (mode === 'todo' && !this.todoMode) {
      return {type: 'todo'};
    }

    const [expected, actual] = await Promise.all([
      getExpectedResult(this.dir, this.impl),
      this.calcActualResult(),
    ]);
    this._actual = actual;

    const testResult = compareResults(expected, actual, {
      // Compare the full error only for dart-sass
      trimErrors: this.impl !== 'dart-sass',
      // Skip warning checks :warning_todo is enabled and we're not running todos
      skipWarning: warningTodo && !this.todoMode,
    });
    // If we're probing todo
    if (this.todoMode === 'probe') {
      if (mode === 'todo') {
        if (testResult.type === 'pass') {
          return failures.UnnecessaryTodo();
        } else {
          return {type: 'todo'};
        }
      }
      if (warningTodo) {
        if (testResult.type === 'pass') {
          return failures.UnnecessaryTodo();
        } else {
          return {type: 'pass'};
        }
      }
    }
    return testResult;
  }

  actual(): SassResult {
    if (!this._actual) {
      throw new Error(`Test case ${this.dir.relPath()} has not yet run.`);
    }
    return this._actual;
  }

  result(): TestResult {
    if (!this._result) {
      throw new Error(`Test case ${this.dir.relPath()} has not yet run.`);
    }
    return this._result;
  }

  // Mutations

  /** Add the given option for the given impl */
  async addOptionForImpl(option: OptionKey): Promise<void> {
    const options = await this.dir.directOptions();
    const updatedOptions = options.addImpl(this.impl, option);
    await this.dir.writeFile('options.yml', updatedOptions.toYaml());
  }

  /**
   * Overwrite the base results with the actual results
   */
  async overwrite(): Promise<void> {
    // overwrite the contents of the base files
    await overwriteResults(this.dir, this.actual());
    // delete any override files for this impl
    await Promise.all(
      getExpectedFiles(this.impl).map(filename => this.dir.removeFile(filename))
    );
    this._result = {type: 'pass'};
  }

  /**
   * Migrate a copy of the expected results to pass on impl
   */
  async migrateImpl(): Promise<void> {
    const actual = this.actual();
    await overwriteResults(this.dir, this.actual(), this.impl);
    // If a nonempty base warning exists, but the actual result yields no warning,
    // create a warning file
    if (
      this.dir.hasFile('warning') &&
      this.dir.readFile('warning') &&
      actual.isSuccess &&
      !actual.warning
    ) {
      await this.dir.writeFile(`warning-${this.impl}`, '');
    }
    this._result = {type: 'pass'};
  }

  /** Mark this test (or its warning) as TODO */
  async markTodo(): Promise<void> {
    if (this.result().failureType === 'warning_difference') {
      await this.addOptionForImpl(':warning_todo');
      this._result = {type: 'pass'};
    } else {
      await this.addOptionForImpl(':todo');
      this._result = {type: 'todo'};
    }
  }

  /** Mark this test as ignored for the current implementation */
  async markIgnore(): Promise<void> {
    await this.addOptionForImpl(':ignore_for');
    this._result = {type: 'skip'};
  }
}
