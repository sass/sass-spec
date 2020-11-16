import readline from "readline"
import { SpecPath } from "./spec-path"
import { FailTestResult } from "./test-case"

// TODO more options
const options = {
  t: "Show me the test case.",
  // d: "Show diff",
  // O: "Update expected output and pass test",
  // I: "Migrate copy of test to pass on [impl]",
  // G: "Ignore test for [impl] FOREVER",
  f: "Mark as failed",
  X: "Exit testing",
}

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
    for (const [option, description] of Object.entries(options)) {
      console.log(`${option}. ${description}`)
    }
    // TODO show prompts
    const [option, repeat] = await question("Please select an option > ")
    switch (option) {
      // Show me the test case
      case "t": {
        console.log(await dir.input())
        break
      }
      // Mark as failed
      case "f": {
        // FIXME are there cases where you the thing changes to success?
        setTimeout(() => rl.close())
        return result
      }
      // Exit testing
      case "X": {
        setTimeout(() => rl.close())
        process.exit(0)
      }
      default: {
        console.log(`Invalid option chosen: ${option}`)
      }
    }
  }
}
