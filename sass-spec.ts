import path from "path"
import { fromPath } from "./lib-js/spec-directory"

import { Interactor } from "./lib-js/interactor"
import { getArgs } from "./lib-js/cli-args"
import TestCase from "./lib-js/test-case"
import { TestResult } from "./lib-js/test-case"

// FIXME These files contain invalid utf8 sequences and fail the dart compiler right now
const naughtyDirs = [
  "spec/libsass-todo-issues/issue_221267",
  "spec/libsass-todo-issues/issue_221286",
]

const symbols = {
  pass: ".",
  fail: "F",
  todo: "-",
  skip: "",
}

const ROOT_DIR = "spec"

async function runAllTests() {
  const interactor = new Interactor(process.stdin, process.stdout)
  const start = Date.now()
  const counts = { total: 0, pass: 0, fail: 0, skip: 0, todo: 0 }
  const rootPath = path.resolve(process.cwd(), ROOT_DIR)
  const args = await getArgs(rootPath, process.argv.slice(2))
  const rootDir = await fromPath(rootPath)
  const failures: { path: string; result: TestResult }[] = []

  function tabulate(test: TestCase) {
    const result = test.result()
    counts.total++
    counts[result.type]++
    process.stdout.write(symbols[result.type])
    if (result.type === "fail") {
      failures.push({ path: test.dir.relPath(), result })
    }
  }

  const testDirs = args.testDirs.map((dir) => path.resolve(process.cwd(), dir))
  await rootDir.forEachTest(testDirs, async (testDir) => {
    if (naughtyDirs.includes(testDir.relPath())) {
      return
    }
    const test = new TestCase(testDir, args.impl, args.compiler, args.todoMode)
    const result = await test.run()
    if (result.type === "fail" && args.interactive) {
      // TODO make it so that we don't need this result
      await interactor.run(test)
    }
    tabulate(test)
  })

  const end = Date.now()
  const time = (end - start) / 1000

  // clear the line
  process.stdout.write("\n")

  for (const failure of failures) {
    console.log("Failure:", failure.path)
    console.log(failure.result.message)
    if (failure.result.diff) console.log(failure.result.diff)
    console.log()
  }

  console.log(
    `${counts.total} runs, ${counts.pass} passing, ${counts.fail} failures, ${counts.todo} todo, ${counts.skip} skips`
  )
  console.log(`Finished in ${time}s`)
  process.exit(0)
}

runAllTests()
