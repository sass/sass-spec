import path from "path"
import { fromPath } from "./lib-js/spec-directory"

import { Interactor } from "./lib-js/interactor"
import { parseArgs } from "./lib-js/cli-args"
import TestCase from "./lib-js/test-case"
import Tabulator from "./lib-js/tabulator"

// FIXME These files contain invalid utf8 sequences and fail the dart compiler right now
const naughtyDirs = [
  "spec/libsass-todo-issues/issue_221267",
  "spec/libsass-todo-issues/issue_221286",
]

async function runAllTests() {
  const interactor = new Interactor(process.stdin, process.stdout)
  const start = Date.now()
  const args = await parseArgs(process.argv.slice(2))
  const rootPath = args.root
  const rootDir = await fromPath(rootPath)
  const tabulator = new Tabulator(process.stdout, args.verbose)

  await rootDir.forEachTest(args.testDirs, async (testDir) => {
    if (naughtyDirs.includes(testDir.relPath())) {
      return
    }
    const test = new TestCase(testDir, args.impl, args.compiler, args.todoMode)
    const result = await test.run()
    if (result.type === "fail" && args.interactive) {
      // TODO make it so that we don't need this result
      await interactor.prompt(test)
    }
    tabulator.tabulate(test)
  })

  const end = Date.now()
  const time = (end - start) / 1000

  tabulator.printResults()
  console.log(`Finished in ${time}s`)
  process.exit(0)
}

runAllTests()
