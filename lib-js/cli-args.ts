import path from "path"
import yargs from "yargs/yargs"
import { DartCompiler, execCompiler } from "./compiler"
import { TestCaseOptions } from "./test-case"

interface CliArgs extends TestCaseOptions {
  interactive: boolean
  testDirs: string[]
}

const implArgs: Record<string, string[]> = {
  "dart-sass": ["--no-unicode", "--no-color"],
  libsass: ["--style", "expanded"],
}

const usageText = `
Usage: ts-node ./sass-spec.ts [options] [spec_directory...]

This script will search for all files under the spec (or specified) directory
that are named input.scss. It will then run a specified binary and check that
the output matches the expected output. If you want set up your own test suite,
follow a similar hierarchy as described in the initial comment of this script
for your test hierarchy.

Make sure the command you provide prints to stdout.
`.trim()
// FIXME make sure these are actually required
/**
 * Get command line args
 */
export async function getArgs(
  loadPath: string,
  cliArgs: string[],
  exitOnFailure = true
) {
  const argv = yargs(cliArgs)
    .usage(usageText)
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
      description:
        "When a test fails, enter into a dialog for how to handle it",
      type: "boolean",
      default: false,
    })
    .check(({ dart, command }) => {
      if (!dart && !command) {
        throw new Error("Must specify --dart or --command")
      } else {
        return true
      }
    })
    .exitProcess(exitOnFailure)
    .conflicts("dart", "command")
    .conflicts("run-todo", "probe-todo").argv

  const args: Partial<CliArgs> = {
    interactive: argv.interactive,
    testDirs: argv._,
    todoMode: argv["run-todo"]
      ? "run"
      : argv["probe-todo"]
      ? "probe"
      : undefined,
  }
  if (argv.command) {
    args.compiler = execCompiler(path.resolve(process.cwd(), argv.command))
    args.impl = argv.impl!
  }
  if (argv.dart) {
    const repoPath = path.resolve(process.cwd(), argv.dart)
    args.compiler = await DartCompiler.fromRepo(repoPath)
    args.impl = "dart-sass"
  }
  args.cmdArgs = implArgs[args.impl!] ?? []
  args.cmdArgs.push(`--load-path=${loadPath}`)
  if (argv["cmd-args"]) {
    args.cmdArgs = args.cmdArgs.concat(argv["cmd-args"].split(" "))
  }

  return args as CliArgs
}
