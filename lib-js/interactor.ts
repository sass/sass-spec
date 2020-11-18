import readline from "readline"
import { TestResult, FailTestResult } from "./test-case/util"
import TestCase from "./test-case"

interface InteractiveArgs {
  test: TestCase
  result: FailTestResult
}

interface InteractorOption {
  key: string
  description: string | ((args: InteractiveArgs) => Promise<string>)
  /**
   * The predicate to fulfill in order to display this command option.
   * If this is not defined, then this option is always shown.
   */
  requirement?(args: InteractiveArgs): Promise<boolean>
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
    async resolve({ test: dir }) {
      return dir.input()
    },
  },
  {
    key: "o",
    description: "Show output.",
    async requirement({ test, result }) {
      if (result.failureType === "warning_difference") return false
      return (await test.actualResult()).isSuccess
    },
    async resolve({ test }) {
      const result = await test.actualResult()
      if (!result.isSuccess) {
        throw new Error(`Trying to list output for non-successful result`)
      }
      return result.output
    },
  },
  {
    key: "e",
    async description({ test }) {
      const result = await test.actualResult()
      return result.isSuccess ? "Show warning." : "Show error."
    },
    async requirement({ test }) {
      const result = await test.actualResult()
      // show this option if the actual result was a failure or it has a warning
      return !result.isSuccess || !!result.warning
    },
    async resolve({ test }) {
      const result = await test.actualResult()
      return result.isSuccess ? result.warning : result.error
    },
  },
  {
    key: "d",
    description: "Show diff.",
    async requirement({ result }) {
      return !!result.diff
    },
    async resolve({ result }) {
      return result.diff
    },
  },
  {
    key: "O",
    description: "Update expected output and pass test",
    async resolve({ test }) {
      await test.overwrite()
      return { type: "pass" }
    },
  },
  {
    key: "I",
    async description({ test }) {
      return `Migrate copy of test to pass on ${test.impl}`
    },
    async resolve({ test }) {
      await test.migrateImpl()
      return { type: "pass" }
    },
  },
  {
    key: "T",
    async description({ test, result }) {
      const word =
        result.failureType === "warning_difference" ? "warning" : "spec"
      return `Mark ${word} as todo for ${test.impl}`
    },
    async resolve({ test, result }) {
      if (result.failureType === "warning_difference") {
        await test.addOptionForImpl(":warning_todo")
        return { type: "pass" }
      } else {
        await test.addOptionForImpl(":todo")
        return { type: "todo" }
      }
    },
  },
  {
    key: "G",
    async description({ test }) {
      return `Ignore test for ${test.impl} FOREVER`
    },
    async resolve({ test }) {
      await test.addOptionForImpl(":ignore_for")
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

export async function optionsFor(args: InteractiveArgs) {
  const result = []
  for (const option of options) {
    if (!option.requirement || (await option.requirement(args))) {
      result.push(option)
    }
  }
  return result
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

  private async printOptions(
    options: InteractorOption[],
    args: InteractiveArgs
  ) {
    for (const { key, description } of options) {
      const _description =
        typeof description === "string" ? description : await description(args)
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
    const { test, result } = args
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
      this.printLine(`In test case: ${test.dir.relPath()}`)
      this.printLine(result.message)

      const validOptions = await optionsFor(args)
      await this.printOptions(validOptions, args)
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
