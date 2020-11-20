import readline from "readline"
import TestCase from "./test-case"

// Select properties of the test case that can be used in requirements
export type TestCaseArg = Pick<TestCase, "impl" | "actual" | "result">

interface InteractorOption {
  key: string
  description: string | ((args: TestCaseArg) => string)
  /**
   * The predicate to fulfill in order to display this command option.
   * If this is not defined, then this option is always shown.
   */
  requirement?(args: TestCaseArg): boolean
  /**
   * The function to call to resolve this option.
   * If the option returns a string, print that string and prompt again.
   * Otherwise, quit the loop.
   */
  resolve(args: TestCase): string | Promise<string | void>
}

const options: InteractorOption[] = [
  {
    key: "t",
    description: "Show me the test case.",
    resolve: (test) => test.dir.asArchive(),
  },
  {
    key: "o",
    description: "Show output.",
    requirement(test) {
      if (test.result().failureType === "warning_difference") return false
      return test.actual().isSuccess
    },
    resolve(test) {
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
    resolve(test) {
      const actual = test.actual()
      return actual.isSuccess ? actual.warning ?? "" : actual.error
    },
  },
  {
    key: "d",
    description: "Show diff.",
    requirement: (test) => !!test.result().diff,
    resolve: (test) => test.result().diff!,
  },
  {
    key: "O",
    description: "Update expected output and pass test",
    requirement: (test) => test.result().failureType !== "unnecessary_todo",
    resolve: (test) => test.overwrite(),
  },
  {
    key: "I",
    description: (test) => `Migrate copy of test to pass on ${test.impl}`,
    requirement: (test) => test.result().failureType !== "unnecessary_todo",
    resolve: (test) => test.migrateImpl(),
  },
  {
    key: "T",
    description(test) {
      const word =
        test.result().failureType === "warning_difference" ? "warning" : "spec"
      return `Mark ${word} as todo for ${test.impl}`
    },
    requirement: (test) => test.result().failureType !== "unnecessary_todo",
    resolve: (test) => test.markTodo(),
  },
  {
    key: "G",
    description: (test) => `Ignore test for ${test.impl} FOREVER`,
    requirement: (test) => test.result().failureType !== "unnecessary_todo",
    resolve: (test) => test.markIgnore(),
  },
  {
    key: "f",
    description: "Mark as failed.",
    async resolve() {},
  },
  {
    key: "X",
    description: "Exit testing.",
    async resolve() {
      process.kill(process.pid, "SIGINT")
    },
  },
]

export function optionsFor(test: TestCaseArg) {
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

  /**
   * Run the interactor prompt on the given test case.
   */
  async prompt(test: TestCase): Promise<void> {
    const rl = readline.createInterface(this.input, this.output)

    function question(prompt: string): Promise<string> {
      return new Promise((resolve) => {
        rl.question(prompt, resolve)
      })
    }

    const type = test.result().failureType || ""

    // If a repeated choice is chosen for a given failure type, run that choice
    if (this.memory[type]) {
      const choice = this.memory[type]
      await choice.resolve(test)
      rl.close()
      return
    }

    while (true) {
      this.printLine()
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
      if (typeof newResult === "string") {
        this.printContent(newResult)
      } else {
        // If the repeat option is chosen, store the chosen choice
        if (repeat.endsWith("!")) {
          this.memory[type] = choice
        }
        rl.close()
        return
      }
    }
  }
}
