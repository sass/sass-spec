import yaml from "js-yaml"

export interface RunOptions {
  ":ignore_for"?: string[]
  ":todo"?: string[]
  ":warning_todo"?: string[]
  ":precision"?: number
}

export type RunOption = ":ignore_for" | ":todo" | ":warning_todo"

/**
 * Class representing the possible options of a given spec
 */
export default class SpecOptions {
  private data: RunOptions
  constructor(data: RunOptions) {
    this.data = data
  }

  static fromYaml(content: string) {
    // TODO validate
    return new SpecOptions((yaml.safeLoad(content) ?? {}) as RunOptions)
  }

  /** Create new SpecOptions by merging this with other options */
  merge(other: SpecOptions): SpecOptions {
    // return the result of these options merged with other options
    const mergeOption = (option: RunOption) => {
      return [...(this.data[option] ?? []), ...(other.data[option] ?? [])]
    }
    return new SpecOptions({
      ":ignore_for": mergeOption(":ignore_for"),
      ":todo": mergeOption(":todo"),
      ":warning_todo": mergeOption(":warning_todo"),
      ":precision": other.data[":precision"] ?? this.data[":precision"],
    })
  }

  /** Get the run mode of the given implementation */
  getMode(impl: string): "todo" | "ignore" | undefined {
    if (this.hasForImpl(impl, ":ignore_for")) {
      return "ignore"
    }
    if (this.hasForImpl(impl, ":todo")) {
      return "todo"
    }
  }

  isWarningTodo(impl: string): boolean {
    return this.hasForImpl(impl, ":warning_todo")
  }

  private hasForImpl(impl: string, option: RunOption) {
    return !!this.data[option]?.some((item) => item.includes(impl))
  }

  precision(): number {
    return this.data[":precision"] ?? 10
  }

  /** Return these options modified to add the given impl to the given option key */
  addImpl(impl: string, optKey: RunOption): SpecOptions {
    const newOption = [...(this.data[optKey] ?? []), impl]
    return new SpecOptions({ ...this.data, [optKey]: newOption })
  }

  toYaml(): string {
    return yaml.safeDump(this.data)
  }
}
