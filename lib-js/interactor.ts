import readline from "readline"
import { SpecDirectory } from "./spec-directory"
import { TestResult, FailTestResult } from "./test-case"
import { SpecResult } from "./execute"

interface InteractiveArgs {
  impl: string
  dir: SpecDirectory
  result: FailTestResult
}

function getExpectedFiles(impl?: string) {
  return impl
    ? [`output-${impl}.css`, `warning-${impl}`, `error-${impl}`]
    : ["output.css", "warning", "error"]
}

async function overwriteResult(
  dir: SpecDirectory,
  result: SpecResult,
  impl?: string
) {
  const [outputFile, warningFile, errorFile] = getExpectedFiles(impl)
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
  description: string | ((args: InteractiveArgs) => string)
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
  resolve(args: InteractiveArgs): Promise<string | TestResult | void>
}

const options: InteractorOption[] = [
  {
    key: "t",
    description: "Show me the test case.",
    async resolve({ dir }) {
      return dir.input()
    },
  },
  {
    key: "o",
    description: "Show output.",
    requirement({ result }) {
      if (result.failureType === "warning_difference") return false
      return result.actual.isSuccess
    },
    async resolve({ result }) {
      if (!result.actual.isSuccess) {
        throw new Error(`Trying to list output for non-successful result`)
      }
      return result.actual.output
    },
  },
  {
    key: "e",
    description: ({ result }) =>
      result.actual.isSuccess ? "Show warning." : "Show error.",
    requirement({ result }) {
      // show this option if the actual result was a failure or it has a warning
      return !result.actual.isSuccess || !!result.actual.warning
    },
    async resolve({ result }) {
      if (result.actual.isSuccess) {
        return result.actual.warning
      } else {
        return result.actual.error
      }
    },
  },
  {
    key: "d",
    description: "Show diff.",
    requirement({ result }) {
      return !!result.diff
    },
    async resolve({ result }) {
      return result.diff
    },
  },
  {
    key: "O",
    description: "Update expected output and pass test",
    async resolve({ impl, dir, result }) {
      // overwrite the contents of the base files
      await overwriteResult(dir, result.actual)
      // delete any override files for this impl
      await Promise.all(
        getExpectedFiles(impl).map((filename) => dir.removeFile(filename))
      )
      return { type: "pass" }
    },
  },
  {
    key: "I",
    description: ({ impl }) => `Migrate copy of test to pass on ${impl}`,
    async resolve({ impl, dir, result }) {
      await overwriteResult(dir, result.actual, impl)
      // If a nonempty base warning exists, but the actual result yields no warning,
      // create a warning file
      if (
        dir.hasFile("warning") &&
        !!dir.readFile("warning") &&
        result.actual.isSuccess &&
        !result.actual.warning
      ) {
        await dir.writeFile(`warning-${impl}`, "")
      }
      return { type: "pass" }
    },
  },
  {
    key: "T",
    description({ impl, result }) {
      const word =
        result.failureType === "warning_difference" ? "warning" : "spec"
      return `Mark ${word} as todo for ${impl}`
    },
    async resolve({ impl, dir, result }) {
      if (result.failureType === "warning_difference") {
        await dir.addOptionForImpl(":warning_todo", impl)
        return { type: "pass" }
      } else {
        await dir.addOptionForImpl(":todo", impl)
        return { type: "todo" }
      }
    },
  },
  {
    key: "G",
    description: ({ impl }) => `Ignore test for ${impl} FOREVER`,
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
      process.kill(process.pid, "SIGINT")
    },
  },
]
export const optionsMap = (() => {
  const optionsMap: Record<string, InteractorOption> = {}
  for (const option of options) {
    optionsMap[option.key] = option
  }
  return optionsMap
})()

export function optionsFor(args: InteractiveArgs) {
  return options.filter(({ requirement }) => !requirement || requirement(args))
}

export class Interactor {
  private memory: Record<string, InteractorOption> = {}
  private input: NodeJS.ReadableStream
  private output: NodeJS.WritableStream

  constructor(input: NodeJS.ReadableStream, output: NodeJS.WritableStream) {
    this.input = input
    this.output = output
  }

  private printLine(line: string = "") {
    this.output.write(`${line}\n`)
  }

  private printOptions(options: InteractorOption[], args: InteractiveArgs) {
    for (const { key, description } of options) {
      const _description =
        typeof description === "string" ? description : description(args)
      this.output.write(`${key}. ${_description}\n`)
    }
  }

  // Prints content bounded by a delimiter
  private printContent(content: string) {
    const width = Math.max(...content.split("\n").map((l) => l.length))
    const delimiter = Array(width).fill("*").join("")
    this.printLine()
    this.printLine(delimiter)
    this.printLine(content)
    this.printLine(delimiter)
    this.printLine()
  }

  async run(args: InteractiveArgs): Promise<TestResult> {
    const { dir, result } = args
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
      // we're guaranteed that the stored chosen option returns a test result
      const newResult = (await choice.resolve(args)) as TestResult
      if (newResult) {
        rl.close()
        return newResult
      }
    }

    while (true) {
      this.printLine(`In test case: ${dir.relPath()}`)
      this.printLine(result.message)

      const validOptions = optionsFor(args)
      this.printOptions(validOptions, args)
      const [key, repeat = ""] = await question("Please select an option > ")
      const choice = validOptions.find((o) => o.key === key)
      if (!choice) {
        this.printLine(`Invalid option chosen: ${key}`)
        continue
      }
      const newResult = await choice.resolve(args)
      if (!newResult) {
        continue
      }
      if (typeof newResult === "string") {
        this.printContent(newResult)
      } else {
        // If the repeat option is chosen, store the chosen choice
        if (repeat.endsWith("!")) {
          this.memory[result.failureType] = choice
        }
        rl.close()
        return newResult
      }
    }
  }
}
