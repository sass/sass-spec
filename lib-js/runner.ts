import { fromPath } from "./spec-directory"
import { Interactor } from "./interactor"
import { parseArgs } from "./cli-args"
import TestCase from "./test-case"
import Tabulator from "./tabulator"

// FIXME These files contain invalid utf8 sequences and fail the dart compiler right now
const naughtyDirs = [
  "spec/libsass-todo-issues/issue_221267",
  "spec/libsass-todo-issues/issue_221286",
]

interface RunnerArgs {
  argv: string[]
  input: NodeJS.ReadStream
  output: NodeJS.WriteStream
}

/**
 * Run all sass specs as defined by the command line arguments, using the given input and output,
 * and print all results to the output.
 */
export async function runAllTests({ argv, input, output }: RunnerArgs) {
  const interactor = new Interactor(input, output)
  const start = Date.now()
  const args = await parseArgs(argv.slice(2))
  const rootPath = args.root
  const rootDir = await fromPath(rootPath)
  const tabulator = new Tabulator(output, args.verbose)

  await rootDir.forEachTest(args.testDirs, async (testDir) => {
    if (naughtyDirs.includes(testDir.relPath())) {
      return
    }
    const test = await TestCase.create(
      testDir,
      args.impl,
      args.compiler,
      args.todoMode
    )
    if (test.result().type === "fail" && args.interactive) {
      await interactor.prompt(test)
    }
    tabulator.tabulate(test)
  })

  const end = Date.now()
  const time = (end - start) / 1000

  tabulator.printResults()
  output.write(`Finished in ${time}s\n`)
}
