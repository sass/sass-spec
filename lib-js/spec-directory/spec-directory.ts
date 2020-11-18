import path from "path"

import yaml from "js-yaml"
import { RunOption, RunOptions, mergeOptions } from "../options"

export type SpecIteratee = (subdir: SpecDirectory) => Promise<void>

/**
 * Represents either a real or virtual directory that contains sass-spec test cases.
 */
export default abstract class SpecDirectory {
  private parentOpts?: RunOptions
  private subitems: Record<string, SpecDirectory>
  abstract path: string
  protected root: SpecDirectory

  constructor(root?: SpecDirectory, parentOpts?: RunOptions) {
    this.root = root ?? this
    this.parentOpts = parentOpts
    this.subitems = {}
  }

  /** The path of this directory relative to the top level that was created */
  relPath() {
    // make sure to include the root dir as part of the name
    // (e.g. if the root path is `spec`, everything should be listed as `spec/thing`)
    const rootDir = path.dirname(this.root.path)
    return path.relative(rootDir, this.path)
  }

  // File manipulation

  /** Get the list of direct files filenames of this directory */
  abstract listFiles(): Promise<string[]>
  /** Returns true if this directory has the given filename as a subitem */
  abstract hasFile(filename: string): boolean
  /** The file contents of the given filename */
  abstract readFile(filename: string): Promise<string>
  /** Update the contents of the given file */
  abstract writeFile(filename: string, contents: string): Promise<void>
  /** Remove the file from this directory */
  abstract removeFile(filename: string): Promise<void>

  // Subdirectories

  /** Get the list of subdrectory names of this directory */
  abstract listSubdirs(): Promise<string[]>

  /** Get the subdirectory at the provided path relative to this directory */
  async atPath(path: string): Promise<SpecDirectory> {
    if (!path) return this
    const i = path.indexOf("/")
    if (i === -1) {
      return await this.subdir(path)
    }
    const child = await this.subdir(path.slice(0, i))
    return await child.atPath(path.slice(i + 1))
  }

  // helper to get the subitem with the given name
  protected abstract getSubdir(name: string): Promise<SpecDirectory>

  /**
   * Return the subitem of this directory corresponding to the given name
   */
  async subdir(name: string): Promise<SpecDirectory> {
    // Cache the subitem so we always return the same one
    if (!this.subitems[name]) {
      this.subitems[name] = await this.getSubdir(name)
    }
    return this.subitems[name]
  }

  /** Return the list of subdirectories */
  async subdirs(): Promise<SpecDirectory[]> {
    const list = await this.listSubdirs()
    return Promise.all(list.map((item) => this.subdir(item)))
  }

  // Spec Options

  // Get the options from a physical options.yml file
  private async getDirectOptions(): Promise<RunOptions> {
    const contents = this.hasFile("options.yml")
      ? await this.readFile("options.yml")
      : ""
    // TODO validate run options
    return (yaml.safeLoad(contents) as RunOptions) || {}
  }

  /** Get the spec options of this directory, including those inherited from its parent */
  async options() {
    const opts = await this.getDirectOptions()
    return this.parentOpts ? mergeOptions(this.parentOpts, opts) : opts
  }

  /** Get the precision for this test directory */
  async precision() {
    return (await this.options())[":precision"]
  }

  /** Add the given option for the given impl */
  async addOptionForImpl(option: RunOption, impl: string) {
    const options = await this.getDirectOptions()
    const newOption = [...(options[option] ?? []), impl]
    const newOptions: RunOptions = { ...options, [option]: newOption }
    await this.writeFile("options.yml", yaml.safeDump(newOptions))
  }

  // Test case info

  /** Return whether this directory corresponds to a test case */
  isTestDir() {
    return this.hasFile("input.scss") || this.hasFile("input.sass")
  }

  /** Return whether this test directory has an indented sass file */
  isIndented() {
    return this.hasFile("input.sass")
  }

  /** Return the name of the input file of this test directory. */
  inputFile() {
    return this.isIndented() ? "input.sass" : "input.scss"
  }

  /** Get the contents of the input file for this test directory. */
  async input() {
    const inputFile = this.isIndented() ? "input.sass" : "input.scss"
    return await this.readFile(inputFile)
  }

  // Iteration

  async setup() {}
  async cleanup() {}

  private isMatch(paths: string[]) {
    return paths.length === 0 || paths.some((path) => this.path === path)
  }

  // TODO should we move this function out to its own file?
  /**
   * Iterate through the subpaths of this directory, running the iteratee
   * on all
   * @param paths the paths to match against
   * @param iteratee the function to call for each matching subdirectory
   */
  async forEachTest(paths: string[], iteratee: SpecIteratee) {
    // If we're a matching test directory, run the test
    if (this.isMatch(paths)) {
      if (this.isTestDir()) {
        await iteratee(this)
      } else {
        // otherwise, recurse through all subdirectories
        for (const subdir of await this.subdirs()) {
          await subdir.forEachTest([], iteratee)
        }
      }
    } else {
      // otherwise, recurse through all subdirectories
      const subpaths = paths.filter((p) => p.startsWith(this.path))
      // if this path isn't a parent of any of the given paths, return
      if (subpaths.length === 0) {
        return
      }
      for (const subdir of await this.subdirs()) {
        await subdir.forEachTest(subpaths, iteratee)
      }
    }
  }
}
