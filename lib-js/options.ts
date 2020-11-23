import { Z_DATA_ERROR } from "zlib"

export interface RunOptions {
  ":ignore_for"?: string[]
  ":todo"?: string[]
  ":warning_todo"?: string[]
  ":precision"?: number
}

export type RunOption = ":ignore_for" | ":todo" | ":warning_todo"

/**
 * Merge two instances of options.yml config objects, creating a new config
 * that is also a valid options.yml.
 */
export function mergeOptions(base: RunOptions, ext: RunOptions): RunOptions {
  function mergeOption(option: RunOption) {
    return [...(base[option] ?? []), ...(ext[option] ?? [])]
  }
  return {
    ":ignore_for": mergeOption(":ignore_for"),
    ":todo": mergeOption(":todo"),
    ":warning_todo": mergeOption(":warning_todo"),
    ":precision": ext[":precision"] ?? base[":precision"],
  }
}

function hasOptionForImpl(option: string[] | undefined, impl: string) {
  return !!option?.some((item) => item.includes(impl))
}

interface ImplOptions {
  mode?: string
  todoWarning?: boolean
  precision?: number
}

export function optionsForImpl(options: RunOptions, impl: string) {
  const opts: ImplOptions = {}
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

/**
 * Class representing the possible options of a given spec
 */
export default class SpecOptions {
  private data: RunOptions
  constructor(data: RunOptions) {
    this.data = data
  }

  static fromYaml(content: string) {
    // TODO return
  }

  merge(other: SpecOptions): SpecOptions {
    // return the result of these options merged with other options
    throw new Error("Not implemented")
  }

  /** Get the run mode of the given implementation */
  getMode(impl: string): "todo" | "ignore" | undefined {
    throw new Error("Not implemented")
  }

  isWarningTodo(impl: string): boolean {
    throw new Error("Not implemented")
  }

  precision(): number {
    return this.data[":precision"] ?? 10
  }
}
