import { runAllTests } from "./lib-js/runner"

async function runAndExit() {
  await runAllTests({
    argv: process.argv,
    input: process.stdin,
    output: process.stdout,
  })
  // Exit so that the process doesn't stall
  process.exit(0)
}

runAndExit()
