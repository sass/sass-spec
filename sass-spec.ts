import path from "path"
import tap from "tap"
import yargs from "yargs/yargs"

import { iterateDir } from "./lib-js/directory"
import { runSpec } from "./lib-js/spec"

const argv = yargs(process.argv.slice(2))
  .example(
    "npm run ./sass-spec.js -- spec/basic",
    "Run tests only in the spec/basic folder"
  )
  .option("command", {
    alias: "c",
    description: "Sets a specific binary to run",
    type: "string",
  })
  .option("impl", {
    description: "Sets the name of the implementation being tested.",
    type: "string",
  })
  .options("run-todo", {
    description: "Run any tests marked as todo",
    type: "boolean",
    default: false,
  })
  .options("probe-todo", {
    description: "Run and report tests marked as todo that unexpectedly pass",
    type: "boolean",
    default: false,
  }).argv

const implArgs: Record<string, string> = {
  "dart-sass": "--no-unicode",
  libsass: "--style expanded",
}
const args = {
  impl: argv.impl!,
  bin: `${path.resolve(process.cwd(), argv.command!)} ${implArgs[argv.impl!]}`,
  rootDir: path.resolve("spec"),
  testDir: "spec",
  todoMode: argv.runTodo ? "run" : undefined,
}

function printResult(counts: any) {
  if (counts.fail > 0) {
    process.stdout.write("X")
  } else if (counts.todo > 0) {
    process.stdout.write("-")
  } else if (counts.skip > 0) {
    // do nothing
  } else {
    process.stdout.write(".")
  }
}
// TODO this might ignore TODOs in a higher directory
async function runAllTests() {
  // FIXME need to override the type definition
  const t: any = new tap.Test()

  const start = Date.now()
  await iterateDir(args.testDir, args, async (dir, opts) => {
    const res = await runSpec(t, dir, opts)
    printResult(res!.counts)
  })
  const end = Date.now()
  const time = (end - start) / 1000
  console.log(t.counts)
  // TODO how to just access this from the test object
  console.log(`Finished in ${time}s`)
}

runAllTests()
