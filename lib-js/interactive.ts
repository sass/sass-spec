import readline from "readline"
import { SpecPath } from "./spec-path"
import { TestResult, FailTestResult } from "./test-case"
import { SpecResult } from "./execute"

interface InteractiveArgs {
  impl: string
  dir: SpecPath
  result: FailTestResult
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

async function overwriteResult(
  dir: SpecPath,
  result: SpecResult,
  impl?: string
) {
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

const options: InteractorOption[] = [
  {
    key: "t",
    description: "Show me the test case.",
    async resolve({ dir }) {
      console.log(await dir.input())
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
  // T: "Mark spec as todo for [impl]"
  {
    key: "I",
    description: "Migrate copy of test to pass on [impl]",
    async resolve({ impl, dir, result }) {
      await overwriteResult(dir, result.actual, impl)
      return { type: "pass" }
    },
  },
  // G: "Ignore test for [impl] FOREVER",
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

export async function interactiveMode(args: InteractiveArgs) {
  const { dir, result } = args
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
    console.log(result.message)

    // TODO
    const validOptions = options.filter(
      ({ requirement }) => !requirement || requirement(args)
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
    const res = await chosen.resolve(args)
    // If the resolve returns an argument, close the interaction loop and return it
    if (res) {
      rl.close()
      return result
    }
  }
}
