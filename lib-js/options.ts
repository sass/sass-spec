import yaml from "js-yaml"

export interface RunOptions {
  ":ignore_for"?: string[]
  ":todo"?: string[]
  ":warning_todo"?: string[]
  ":precision"?: number
}

export function mergeOptions(base: RunOptions, ext: RunOptions): RunOptions {
  function mergeOption(option: ":ignore_for" | ":todo" | ":warning_todo") {
    return [...(base[option] ?? []), ...(ext[option] ?? [])]
  }
  return {
    ":ignore_for": mergeOption(":ignore_for"),
    ":todo": mergeOption(":todo"),
    ":warning_todo": mergeOption(":warning_todo"),
    ":precision": ext[":precision"] ?? base[":precision"],
  }
}

export function optsFromYaml(items: string): RunOptions {
  const rawOpts: any = yaml.safeLoad(items)
  if (typeof rawOpts !== "object") {
    return {
      ":ignore_for": [],
      ":todo": [],
      ":warning_todo": [],
    }
  }
  // TODO validate options
  return rawOpts
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
