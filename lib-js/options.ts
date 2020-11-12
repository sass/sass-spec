import yaml from "js-yaml"

export interface RunOptions {
  ignore: string[]
  todo: string[]
  todoWarning: string[]
  precision?: number
}

export function mergeOptions(base: RunOptions, ext: RunOptions): RunOptions {
  return {
    ignore: [...base.ignore, ...ext.ignore],
    todo: [...base.todo, ...ext.todo],
    todoWarning: [...base.todoWarning, ...ext.todoWarning],
    precision: ext.precision ?? base.precision,
  }
}

export function optsFromYaml(items: string) {
  const defaultOpts: RunOptions = {
    ignore: [],
    todo: [],
    todoWarning: [],
  }
  const rawOpts: any = yaml.safeLoad(items)
  if (typeof rawOpts !== "object") {
    // TODO throw a warning/error if not a match
    return defaultOpts
  }
  return {
    precision: rawOpts[":precision"],
    ignore: rawOpts[":ignore_for"] || [],
    todo: rawOpts[":todo"] || [],
    todoWarning: rawOpts[":warning_todo"] || [],
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
  if (hasOptionForImpl(options.todoWarning, impl)) {
    opts.todoWarning = true
  }
  if (hasOptionForImpl(options.ignore, impl)) {
    opts.mode = "ignore"
  }
  if (hasOptionForImpl(options.todo, impl)) {
    opts.mode = "todo"
  }
  if (options.precision) {
    opts.precision = options.precision
  }
  return opts
}
