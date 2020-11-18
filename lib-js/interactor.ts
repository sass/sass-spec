import readline from "readline"
import { TestResult } from "./test-case/util"
import TestCase from "./test-case"

interface InteractorOption {
  key: string
  description: string | ((args: TestCase) => string)
  /**
   * The predicate to fulfill in order to display this command option.
   * If this is not defined, then this option is always shown.
   */
  requirement?(args: TestCase): boolean
  /**
   * The function to call to resolve this option.
   * If this function returns a value, the interactive mode should quit with that value,
   * otherwise continue.
   */
  resolve(args: TestCase): Promise<string | TestResult | void>
}

const options: InteractorOption[] = [
  {
    key: "t",
    description: "Show me the test case.",
    async resolve(test) {
      return test.input()
    },
  },
  {
    key: "o",
    description: "Show output.",
    requirement(test) {
      if (test.result().failureType === "warning_difference") return false
      return test.actual().isSuccess
    },
    async resolve(test) {
      const actual = test.actual()
      if (!actual.isSuccess) {
        throw new Error(`Trying to list output for non-successful result`)
      }
      return actual.output
    },
  },
  {
    key: "e",
    description(test) {
      return test.actual().isSuccess ? "Show warning." : "Show error."
    },
    requirement(test) {
      const actual = test.actual()
      // show this option if the actual result was a failure or it has a warning
      return !actual.isSuccess || !!actual.warning
    },
    async resolve(test) {
      const actual = test.actual()
      return actual.isSuccess ? actual.warning : actual.error
    },
  },
  {
    key: "d",
    description: "Show diff.",
    requirement: (test) => !!test.result().diff,
    async resolve(test) {
      return test.result().diff
    },
  },
  {
    key: "O",
    description: "Update expected output and pass test",
    async resolve(test) {
      await test.overwrite()
      return { type: "pass" }
    },
  },
  {
    key: "I",
    description: (test) => `Migrate copy of test to pass on ${test.impl}`,
    async resolve(test) {
      await test.migrateImpl()
      return { type: "pass" }
    },
  },
  {
    key: "T",
    description(test) {
      const word =
        test.result().failureType === "warning_difference" ? "warning" : "spec"
      return `Mark ${word} as todo for ${test.impl}`
    },
    async resolve(test) {
      if (test.result().failureType === "warning_difference") {
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
    description: (test) => `Ignore test for ${test.impl} FOREVER`,
    async resolve(test) {
      await test.addOptionForImpl(":ignore_for")
      return { type: "skip" }
    },
  },
  {
    key: "f",
    description: "Mark as failed.",
    async resolve(test) {
      return test.result()
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

export function optionsFor(test: TestCase) {
  const result = []
  for (const option of options) {
    if (!option.requirement || option.requirement(test)) {
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

  private printOptions(options: InteractorOption[], test: TestCase) {
    for (const { key, description } of options) {
      const _description =
        typeof description === "string" ? description : description(test)
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

  async run(test: TestCase): Promise<TestResult> {
    const rl = readline.createInterface(this.input, this.output)

    function question(prompt: string): Promise<string> {
      return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
          resolve(answer)
        })
      })
    }

    const type = test.result().failureType || ''

    // If a repeated choice is chosen for a given failure type, run that choice
    if (this.memory[type]) {
      const choice = this.memory[type]
      // we're guaranteed that the stored chosen option returns a test result
      const newResult = (await choice.resolve(test)) as TestResult
      if (newResult) {
        rl.close()
        return newResult
      }
    }

    while (true) {
      this.printLine(`In test case: ${test.dir.relPath()}`)
      this.printLine(test.result().message)

      const validOptions = optionsFor(test)
      this.printOptions(validOptions, test)
      const [key, repeat = ""] = await question("Please select an option > ")
      const choice = validOptions.find((o) => o.key === key)
      if (!choice) {
        this.printLine(`Invalid option chosen: ${key}`)
        continue
      }
      const newResult = await choice.resolve(test)
      if (!newResult) {
        continue
      }
      if (typeof newResult === "string") {
        this.printContent(newResult)
      } else {
        // If the repeat option is chosen, store the chosen choice
        if (repeat.endsWith("!")) {
          this.memory[type] = choice
        }
        rl.close()
        return newResult
      }
    }
  }
}
