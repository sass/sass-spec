import yaml from "js-yaml"
import { promises as fs } from "fs"
import path from "path"

import { withArchive } from "./hrx"

interface YamlOptions {
  ":todo"?: string[]
  ":ignore_for"?: string[]
  ":warning_todo"?: string[]
  ":precision"?: number
}

function hasOptionForImpl(option: string[] | undefined, impl: string) {
  if (!option || !(option instanceof Array)) return false
  return option.some((item) => item.includes(impl))
}

interface OverrideOptions {
  todoWarning?: boolean
  mode?: "ignore" | "todo"
  precision?: number
}

function getOptionOverrides(options: YamlOptions, impl: string) {
  const opts: OverrideOptions = {}
  if (hasOptionForImpl(options[":warning_todo"], impl)) {
    opts.todoWarning = true
  }
  if (hasOptionForImpl(options[":ignore_for"], impl)) {
    opts.mode = "ignore"
  }
  if (hasOptionForImpl(options[":todo"], impl)) {
    opts.mode = "todo"
  }
  if (options[":precision"]) {
    opts.precision = options[":precision"]
  }
  return opts
}

interface DirOptions {
  impl: string
  bin: string
  rootDir: string
  testDir: string
  // TODO guarantee that this is `run` or `probe`
  todoMode?: string
}

type AllOptions = DirOptions & OverrideOptions

type DirIteratee = (dir: string, options: AllOptions) => Promise<void>

/**
 * Run through the given directory
 * @param dir the directory to iterate over
 * @param opts the options to run the thing with:
 *    - impl -- the sass implementation to use
 * @param iteratee the callback to run on each directory.
 * Called with the directory, and all options along with:
 *   - mode: null | todo | warning | ignore
 */
export async function iterateDir(
  dir: string,
  opts: DirOptions,
  iteratee: DirIteratee
) {
  const { impl } = opts
  const files = await fs.readdir(dir)
  // If we find an options.yml file, read it and determine if we should go further
  let overrides
  if (files.includes("options.yml")) {
    const optsFile = path.resolve(dir, "options.yml")
    const options = yaml.safeLoad(
      await fs.readFile(optsFile, { encoding: "utf-8" })
    )
    if (!options || typeof options === "string") {
      throw new Error(`${dir}: Ran into invalid YAML options`)
    }
    overrides = getOptionOverrides(options as YamlOptions, impl)
  }
  // Override the mode of options passed in
  const _opts = { ...opts, ...overrides }

  for (const filename of files) {
    const filepath = path.resolve(dir, filename)
    const filestat = await fs.stat(filepath)
    if (filestat.isDirectory()) {
      // If we run into a subdirectory, recurse into it
      await iterateDir(filepath, _opts, iteratee)
    } else if (filename.endsWith(".hrx")) {
      // If HRX, expand it into a directory and recurse into it
      await withArchive(filepath, async (unarchivedDir: string) => {
        await iterateDir(unarchivedDir, _opts, iteratee)
      })
    } else if (filename === "input.scss" || filename === "input.sass") {
      // If this directory contains an input file, then run the test on it
      await iteratee(dir, _opts)
    }
  }
}
