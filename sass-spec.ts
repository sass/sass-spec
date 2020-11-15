import path from "path"
import yargs from "yargs/yargs"
import { fromPath } from "./lib-js/spec-path"

import { runSpec } from "./lib-js/spec"
import { DartCompiler, execCompiler } from "./lib-js/compiler"
import { interactiveMode } from "./lib-js/interactive"

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
  .option("cmd-args", {
    description: "Pass args to command or Dart Sass",
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
  })
  .options("interactive", {
    description: "When a test fails, enter into a dialog for how to handle it",
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
    todoMode: argv["run-todo"]
      ? "run"
      : argv["probe-todo"]
      ? "probe"
      : undefined,
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
  args.cmdArgs = implArgs[args.impl]
  if (argv["cmd-args"]) {
    args.cmdArgs = args.cmdArgs.concat(argv["cmd-args"].split(" "))
  }

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

  const testDirs = argv._.map((dir) => path.resolve(process.cwd(), dir))
  await rootDir.forEachTest(testDirs, async (testDir) => {
    if (naughtyDirs.includes(testDir.relPath())) {
      return
    }
    let result = await runSpec(testDir, args)
    if (result.type === "fail" && argv.interactive) {
      result = await interactiveMode(testDir, result)
    }
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
