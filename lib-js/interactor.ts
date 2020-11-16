import readline from "readline"
import { SpecPath } from "./spec-path"
import { TestResult, FailTestResult } from "./test-case"
import { SpecResult } from "./execute"

interface InteractiveArgs {
  impl: string
  dir: SpecPath
  result: FailTestResult
}

async function overwriteResult(
  dir: SpecPath,
  result: SpecResult,
  impl?: string
) {
  // FIXME what to do if the spec already has an implementation-specific output?
  const [outputFile, warningFile, errorFile] = impl
    ? [`output-${impl}.css`, `warning-${impl}`, `error-${impl}`]
    : ["output.css", "warning", "error"]
  if (result.isSuccess) {
    await Promise.all([
      dir.writeFile(outputFile, result.output),
      result.warning
        ? dir.writeFile(warningFile, result.warning)
        : dir.removeFile(warningFile),
      dir.removeFile(errorFile),
    ])
  } else {
    await Promise.all([
      dir.writeFile(errorFile, result.error),
      dir.removeFile(outputFile),
      dir.removeFile(warningFile),
    ])
  }
}

interface InteractorOption {
  key: string
  description: string
  /**
   * The predicate to fulfill in order to display this command option.
   * If this is not defined, then this option is always shown.
   */
  requirement?(args: InteractiveArgs): boolean
  /**
   * The function to call to resolve this option.
   * If this function returns a value, the interactive mode should quit with that value,
   * otherwise continue.
   */
  resolve(args: InteractiveArgs): Promise<TestResult | void>
}

// FIXME how to handle options that have the same key
const options: InteractorOption[] = [
  {
    key: "t",
    description: "Show me the test case.",
    async resolve({ dir }) {
      console.log(await dir.input())
    },
  },
  {
    key: "e",
    description: "Show error.",
    requirement({ result }) {
      return !result.actual.isSuccess
    },
    async resolve({ result }) {
      if (result.actual.isSuccess) {
        throw new Error(`Trying to list error for successful result`)
      }
      console.log(result.actual.error)
    },
  },
  {
    key: "o",
    description: "Show output.",
    requirement({ result }) {
      // TODO don't list this option if only the errors are failing
      return result.actual.isSuccess
    },
    async resolve({ result }) {
      if (!result.actual.isSuccess) {
        throw new Error(`Trying to list output for non-successful result`)
      }
      console.log(result.actual.output)
    },
  },
  {
    // TODO this has the same key as `Show error` in the ruby version
    key: "w",
    description: "Show warning.",
    requirement({ result }) {
      return result.actual.isSuccess && !!result.actual.warning
    },
    async resolve({ result }) {
      if (!result.actual.isSuccess) {
        throw new Error(`Trying to list warning for non-successful result`)
      }
      console.log(result.actual.warning)
    },
  },
  {
    key: "d",
    description: "Show diff.",
    requirement({ result }) {
      return !!result.diff
    },
    async resolve({ result }) {
      console.log(result.diff)
    },
  },
  {
    key: "O",
    description: "Update expected output and pass test",
    async resolve({ dir, result }) {
      await overwriteResult(dir, result.actual)
      return { type: "pass" }
    },
  },
  {
    key: "T",
    // FIXME reference the actual impl name in the description
    description: "Mark spec as todo for [impl]",
    async resolve({ impl, dir }) {
      await dir.addOptionForImpl(":todo", impl)
      return { type: "todo" }
    },
  },
  {
    // FIXME this has the same option `T` in ruby
    key: "W",
    description: "Mark warning as todo for [impl]",
    // FIXME only show the description if there is a warning failure
    async resolve({ impl, dir }) {
      await dir.addOptionForImpl(":warning_todo", impl)
      return { type: "pass" }
    },
  },
  {
    key: "I",
    description: "Migrate copy of test to pass on [impl]",
    async resolve({ impl, dir, result }) {
      await overwriteResult(dir, result.actual, impl)
      return { type: "pass" }
    },
  },
  {
    key: "G",
    // FIXME reference the actual impl name in the description
    description: "Ignore test for [impl] FOREVER",
    async resolve({ impl, dir }) {
      await dir.addOptionForImpl(":ignore_for", impl)
      return { type: "skip" }
    },
  },
  {
    key: "f",
    description: "Mark as failed.",
    async resolve({ result }) {
      return result
    },
  },
  {
    key: "X",
    description: "Exit testing.",
    async resolve() {
      process.exit(0)
    },
  },
]

export class Interactor {
  private memory: Record<string, InteractorOption> = {}
  private input: NodeJS.ReadableStream
  private output: NodeJS.WritableStream

  // TODO constructor should pass in an input/output
  constructor(input: NodeJS.ReadableStream, output: NodeJS.WritableStream) {
    this.input = input
    this.output = output
  }

  async run(args: InteractiveArgs) {
    const { dir, result } = args
    // TODO can I just keep this as part of the class?
    const rl = readline.createInterface(this.input, this.output)

    function question(prompt: string): Promise<string> {
      return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
          resolve(answer)
        })
      })
    }

    // If a repeated choice is chosen for a given failure type, run that choice
    if (this.memory[result.failureType]) {
      const choice = this.memory[result.failureType]
      const newResult = await choice.resolve(args)
      if (newResult) {
        rl.close()
        return newResult
      }
    }

    while (true) {
      this.output.write(`In test case: ${dir.relPath()}\n`)
      this.output.write(result.message + "\n")

      const validOptions = options.filter(
        ({ requirement }) => !requirement || requirement(args)
      )
      for (const { key, description } of validOptions) {
        this.output.write(`${key}. ${description}\n`)
      }
      const [key, repeat] = await question("Please select an option > ")
      const choice = validOptions.find((o) => o.key === key)
      if (!choice) {
        this.output.write(`Invalid option chosen: ${key}\n`)
        continue
      }
      // If the repeat option is chosen, store the chosen choice
      if (repeat.endsWith("!")) {
        this.memory[result.failureType] = choice
      }
      const newResult = await choice.resolve(args)
      // If the resolve returns an argument, close the interaction loop and return it
      if (newResult) {
        rl.close()
        return result
      }
    }
  }
}
