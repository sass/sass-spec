import path from "path"

import { RunOptions, mergeOptions, optsFromYaml } from "../options"

export type SpecIteratee = (subdir: SpecPath) => Promise<void>

/**
 * Represents either a real or virtual directory that contains spec files.
 */
export default abstract class SpecPath {
  private parentOpts?: RunOptions
  private subitems: Record<string, SpecPath>
  abstract path: string
  protected root: SpecPath

  constructor(root?: SpecPath, parentOpts?: RunOptions) {
    this.root = root ?? this
    this.parentOpts = parentOpts
    this.subitems = {}
  }

  // helper to get the subitem with the given name
  protected abstract getSubitem(name: string): Promise<SpecPath>

  /** The path of this directory relative to the top level that was created */
  relPath() {
    return path.relative(this.root.path, this.path)
  }

  /** Get the list of direct files filenames of this directory */
  abstract files(): Promise<string[]>
  /** Get the list of subdrectory names of this directory */
  abstract subdirs(): Promise<string[]>
  /** The file contents of the given filename */
  abstract contents(filename: string): Promise<string>
  /** Returns true if this directory has the given filename as a subitem */
  abstract hasFile(filename: string): boolean

  /** Update the contents of the given file */
  abstract writeFile(filename: string, contents: string): Promise<void>

  /** Remove the file from this directory */
  abstract removeFile(filename: string): Promise<void>

  /** Add the given option (:todo, :ignore_for, or :warning_todo) for the given impl */
  async addOptionForImpl(option: string, impl: string) {
    throw new Error("Not implemented")
  }

  /** Remove the given option (:todo, :ignore_for, or :warning_todo) for the given impl */
  async removeOptionForImpl(option: string, impl: string) {
    throw new Error("Not implemented")
  }

  /**
   * Get the SpecPath at the provided path to the subitem
   */
  async atPath(path: string): Promise<SpecPath> {
    if (!path) return this
    const i = path.indexOf("/")
    if (i === -1) {
      return await this.subitem(path)
    }
    const child = await this.subitem(path.slice(0, i))
    return await child.atPath(path.slice(i + 1))
  }

  /**
   * Return the subitem of this directory corresponding to the given name
   */
  async subitem(name: string) {
    if (!this.subitems[name]) {
      this.subitems[name] = await this.getSubitem(name)
    }
    return this.subitems[name]
  }

  async items() {
    const list = await this.subdirs()
    return Promise.all(list.map((item) => this.subitem(item)))
  }

  // by default, do nothing
  async writeToDisk(): Promise<void> {}
  async cleanup(): Promise<void> {}

  cleanupSync() {}

  /**
   * Write files corresponding to this directory and run the given callback,
   * deleting the files when done
   */
  async withRealFiles(cb: () => Promise<void>) {
    await this.writeToDisk()
    // TODO handle process exit
    // process.on("exit", (status) => {
    //   this.cleanupSync()
    //   process.exit(status)
    // })
    try {
      await cb()
    } finally {
      await this.cleanup()
    }
  }

  // Get the options from a physical options.yml file
  private async getDirectOptions(): Promise<RunOptions> {
    const contents = this.hasFile("options.yml")
      ? await this.contents("options.yml")
      : ""
    return optsFromYaml(contents)
  }

  /** Get the run options of this directory, including those inherited from its parent */
  async options() {
    const opts = await this.getDirectOptions()
    return this.parentOpts ? mergeOptions(this.parentOpts, opts) : opts
  }

  /**
   * Return whether this directory corresponds to a test case
   * (i.e. it has an `input.scss` file).
   */
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
    return await this.contents(inputFile)
  }

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
        for (const subdir of await this.items()) {
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
      for (const subdir of await this.items()) {
        await subdir.forEachTest(subpaths, iteratee)
      }
    }
  }
}
