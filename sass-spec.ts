import path from "path"
import { fromPath } from "./lib-js/spec-directory"

import { FailTestResult, runTestCase } from "./lib-js/runner"
import { Interactor } from "./lib-js/interactor"
import { getArgs } from "./lib-js/cli-args"

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
  const failures: { path: string; result: FailTestResult }[] = []

  const testDirs = args.testDirs.map((dir) => path.resolve(process.cwd(), dir))
  await rootDir.forEachTest(testDirs, async (testDir) => {
    if (naughtyDirs.includes(testDir.relPath())) {
      return
    }
    let result = await runTestCase(testDir, args)
    if (result.type === "fail" && args.interactive) {
      result = await interactor.run({ impl: args.impl, dir: testDir, result })
    }
    counts.total++
    counts[result.type]++
    process.stdout.write(symbols[result.type])
    if (result.type === "fail") {
      failures.push({ path: testDir.relPath(), result })
    }
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
