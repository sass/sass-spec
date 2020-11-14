import readline from "readline"
import { SpecPath } from "./spec-path"
import { FailTestResult } from "./spec"

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

export async function interactorLoop(dir: SpecPath, result: FailTestResult) {
  while (true) {
    console.log(`In test case: ${dir.relPath()}`)
    console.log(result.error.message)
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
        return result
      }
      default: {
        console.log(`Invalid option chosen: ${option}`)
      }
    }
  }
}
