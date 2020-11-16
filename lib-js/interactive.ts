import readline from "readline"
import { SpecPath } from "./spec-path"
import { TestResult, FailTestResult } from "./test-case"

interface InteractorOption {
  key: string
  description: string
  /**
   * The predicate to fulfill in order to display this command option.
   * If this is not defined, then this option is always shown.
   */
  requirement?(dir: SpecPath, result: FailTestResult): boolean
  /**
   * The function to call to resolve this option.
   * If this function returns a value, the interactive mode should quit with that value,
   * otherwise continue.
   */
  resolve(dir: SpecPath, result: FailTestResult): Promise<TestResult | void>
}

const options: InteractorOption[] = [
  {
    key: "t",
    description: "Show me the test case.",
    async resolve(dir) {
      console.log(await dir.input())
    },
  },
  {
    key: "d",
    description: "Show diff.",
    requirement(dir, result) {
      return !!result.error.diff
    },
    async resolve(dir, result) {
      console.log(result.error.diff)
    },
  },
  // O: "Update expected output and pass test",
  // T: "Mark spec as todo for [impl]"
  // I: "Migrate copy of test to pass on [impl]",
  // G: "Ignore test for [impl] FOREVER",
  {
    key: "f",
    description: "Mark as failed.",
    async resolve(_, result) {
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

export async function interactiveMode(dir: SpecPath, result: FailTestResult) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer)
      })
    })
  }

  while (true) {
    console.log(`In test case: ${dir.relPath()}`)
    console.log(result.error.message)

    // TODO
    const validOptions = options.filter(
      ({ requirement }) => !requirement || requirement(dir, result)
    )
    for (const { key, description } of validOptions) {
      console.log(`${key}. ${description}`)
    }
    // TODO show prompts
    const [key, repeat] = await question("Please select an option > ")
    const chosen = validOptions.find((o) => o.key === key)
    if (!chosen) {
      console.log(`Invalid option chosen: ${key}`)
      continue
    }
    const res = await chosen.resolve(dir, result)
    // If the resolve returns an argument, close the interaction loop and return it
    if (res) {
      rl.close()
      return result
    }
  }
}
