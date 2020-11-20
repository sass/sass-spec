import path from "path"
import yargs from "yargs/yargs"
import { Compiler, DartCompiler, execCompiler } from "./compiler"

interface CliArgs {
  root: string
  verbose: boolean
  impl: string
  compiler: Compiler
  interactive: boolean
  testDirs: string[]
  todoMode?: string
}

const implArgs: Record<string, string[]> = {
  "dart-sass": ["--no-unicode", "--no-color"],
  libsass: ["--style", "expanded"],
}

const usageText = `
Usage: ts-node ./sass-spec.ts [options] [spec_directory...]

This script will search for all files under the spec (or specified) directory
that are named input.scss. It will then run a specified binary and check that
the output matches the expected output.

Make sure the command you provide prints to stdout.
`.trim()

/**
 * Parse command line args into options used by the sass-spec runner.
 */
export async function parseArgs(cliArgs: string[]): Promise<CliArgs> {
  const argv = yargs(cliArgs)
    .usage(usageText)
    .example(
      "npm run ./sass-spec.js -- spec/basic",
      "Run tests only in the spec/basic folder"
    )
    .option("verbose", {
      alias: "v",
      description: "Run verbosely",
      type: "boolean",
    })
    .option("dart", {
      description: "Run Dart Sass, whose repo should be at the given path",
      type: "string",
    })
    .option("command", {
      alias: "c",
      description: "Sets a specific binary to run",
      type: "string",
    })
    .conflicts("dart", "command")
    .check(({ dart, command }) => {
      if (!dart && !command) {
        throw new Error("Must specify --dart or --command")
      } else {
        return true
      }
    })
    .option("cmd-args", {
      description: "Pass args to command or Dart Sass",
      type: "string",
    })
    .option("impl", {
      description: "Sets the name of the implementation being tested.",
      type: "string",
    })
    .options("run-todo", {
      description: "Run any tests marked as todo",
      type: "boolean",
    })
    .options("probe-todo", {
      description: "Run and report tests marked as todo that unexpectedly pass",
      type: "boolean",
    })
    .conflicts("run-todo", "probe-todo")
    .option("root-path", {
      description:
        "The root path to start searching for tests and test configuration, and the path to pass into --load-path",
      type: "string",
      default: "spec",
    })
    .options("interactive", {
      description:
        "When a test fails, enter into a dialog for how to handle it",
      type: "boolean",
      default: false,
    }).argv

  const root = path.resolve(process.cwd(), argv["root-path"])

  const args: Partial<CliArgs> = {
    root,
    verbose: argv.verbose,
    interactive: argv.interactive,
    testDirs: argv._,
    todoMode: argv["run-todo"]
      ? "run"
      : argv["probe-todo"]
      ? "probe"
      : undefined,
  }
  args.impl = argv.dart ? "dart-sass" : argv.impl!
  let cmdArgs = implArgs[args.impl] ?? []
  cmdArgs.push(`--load-path=${root}`)
  if (argv["cmd-args"]) {
    cmdArgs = cmdArgs.concat(argv["cmd-args"].split(" "))
  }

  if (argv.command) {
    args.compiler = execCompiler(
      path.resolve(process.cwd(), argv.command),
      cmdArgs
    )
  }
  if (argv.dart) {
    const repoPath = path.resolve(process.cwd(), argv.dart)
    args.compiler = await DartCompiler.fromRepo(repoPath, cmdArgs)
  }

  return args as CliArgs
}
