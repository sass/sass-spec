import path from "path"
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

// FIXME These files contain invalid utf8 sequences and fail the dart compiler right now
const naughtyDirs = [
  "libsass-todo-issues/issue_221267",
  "libsass-todo-issues/issue_221286",
]

const symbols = {
  pass: ".",
  fail: "F",
  todo: "-",
  skip: "",
}

const ROOT_DIR = "spec"

async function runAllTests() {
  const args = await getArgs()

  const start = Date.now()
  const counts = { total: 0, pass: 0, fail: 0, skip: 0, todo: 0 }
  const rootDir = await fromPath(path.resolve(process.cwd(), ROOT_DIR))
  const failures: any[] = []
  await rootDir.forEachTest(args.testDirs, async (testDir) => {
    if (naughtyDirs.includes(testDir.relPath())) {
      return
    }
    const result = await runSpec(testDir, args)
    counts.total++
    counts[result.type]++
    process.stdout.write(symbols[result.type])
    if (result.type === "fail") {
      failures.push({
        path: testDir.relPath(),
        error: result.error,
      })
    }
  })

  const end = Date.now()
  const time = (end - start) / 1000

  // clear the line
  process.stdout.write("\n")

  for (const failure of failures) {
    console.log("Failure:", failure.path)
    console.log(failure.error.message)
    // TODO better formatting of this
    if (failure.error.diff) console.log(failure.error.diff)
    console.log()
  }

  // TODO there's a better way to tally this
  console.log(
    `${counts.total} runs, ${counts.pass} passing, ${counts.fail} failures, ${counts.todo} todo, ${counts.skip} skips`
  )
  // TODO how to just access this from the test object
  console.log(`Finished in ${time}s`)
  process.exit(0)
}

runAllTests()
