import path from "path"
import tap, { Counts } from "tap"
import yargs from "yargs/yargs"
import { fromPath } from "./lib-js/spec-path"

import { runSpec } from "./lib-js/spec"
import { DartCompiler, execCompiler } from "./lib-js/compiler"

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
  .option("dart", {
    description: "Run Dart Sass, whose repo should be at the given path",
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

const implArgs: Record<string, string[]> = {
  "dart-sass": ["--no-unicode", "--no-color"],
  libsass: ["--style", "expanded"],
}

// FIXME make sure these are actually required
async function getArgs() {
  const args: any = {
    rootDir: path.resolve("spec"),
    testDirs: argv._.map((p) => path.resolve(process.cwd(), p)),
    todoMode: argv.runTodo ? "run" : undefined,
  }
  if (argv.command) {
    args.compiler = execCompiler(path.resolve(process.cwd(), argv.command))
    args.impl = argv.impl!
  } else if (argv.dart) {
    const repoPath = path.resolve(process.cwd(), argv.dart)
    args.compiler = await DartCompiler.fromRepo(repoPath)
    args.impl = "dart-sass"
  } else {
    throw new Error("Must specify --dart or --command")
  }
  args.cmdOpts = implArgs[args.impl]

  return args
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

// FIXME These files contain invalid utf8 sequences and fail the dart compiler right now
const naughtyDirs = [
  "libsass-todo-issues/issue_221267",
  "libsass-todo-issues/issue_221286",
]

async function runAllTests() {
  const args = await getArgs()
  const t = new tap.Test()

  const start = Date.now()
  // TODO support calling from within an .hrx file
  const rootDir = await fromPath(path.resolve(process.cwd(), "spec"))
  await rootDir.forEachTest(args.testDirs, async (testDir) => {
    if (naughtyDirs.includes(testDir.relPath())) {
      return
    }
    // process.stdout.write(".")
    const res: any = await runSpec(t, testDir, args)
    printResult(res.counts)
  })

  t.end()
  const end = Date.now()
  const time = (end - start) / 1000
  // TODO there's a better way to tally this
  for (const failure of t.lists.fail) {
    console.log("FAILED", failure.name)
    // TODO better formatting of this
    console.log(failure.diag)
  }
  console.log(t.counts)
  // TODO how to just access this from the test object
  console.log(`Finished in ${time}s`)
  process.exit(0)
}

runAllTests()
