import path from "path"
import tap, { Counts } from "tap"
import yargs from "yargs/yargs"
import { fromPath, getTestDirs } from "./newdirs"

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

// FIXME make sure these are actually required
const args = {
  impl: argv.impl!,
  bin: `${path.resolve(process.cwd(), argv.command!)} ${implArgs[argv.impl!]}`,
  rootDir: path.resolve("spec"),
  testDir: argv._[0] || "spec",
  todoMode: argv.runTodo ? "run" : undefined,
}

function printResult(counts: Counts) {
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
  const t = new tap.Test()

  const start = Date.now()
  const specPath = fromPath(path.resolve(process.cwd(), args.testDir))
  const testCases = await getTestDirs(specPath)
  for (const test of testCases) {
    const res: any = await runSpec(t, test, args)
    printResult(res.counts)
  }

  t.end()
  const end = Date.now()
  const time = (end - start) / 1000
  // TODO there's a better way to tally this
  console.log(t.counts)
  for (const failure of t.lists.fail) {
    console.log("FAILED", failure.name)
    // TODO better formatting of this
    console.log(failure.diag)
  }
  // TODO how to just access this from the test object
  console.log(`Finished in ${time}s`)
}

runAllTests()
