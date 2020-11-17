export interface RunOptions {
  ":ignore_for"?: string[]
  ":todo"?: string[]
  ":warning_todo"?: string[]
  ":precision"?: number
}

export type RunOption = ":ignore_for" | ":todo" | ":warning_todo"

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
  if (!option || !(option instanceof Array)) return false
  return option.some((item) => item.includes(impl))
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
