import path from "path"

import SpecOptions from "./options"
import { toHrx } from "./hrx"

export type SpecIteratee = (subdir: SpecDirectory) => Promise<void>

/**
 * Represents a real or virtual directory that contains sass-spec test cases.
 *
 * Contains methods for accessing the direct files and subdirectories of the directory.
 */
export default abstract class SpecDirectory {
  protected readonly root: SpecDirectory
  private readonly parentOpts?: SpecOptions
  private readonly _subdirs: Record<string, SpecDirectory> = {}

  /** The full path of this directory */
  abstract path: string

  constructor(root?: SpecDirectory, parentOpts?: SpecOptions) {
    this.root = root ?? this
    this.parentOpts = parentOpts
  }

  /** The path of this directory relative to the top level that was created */
  relPath(): string {
    // make sure to include the root dir as part of the name
    // (e.g. if the root path is `spec`, everything should be listed as `spec/thing`)
    const rootDir = path.dirname(this.root.path)
    return path.relative(rootDir, this.path)
  }

  // File manipulation

  /** Get the list of direct filenames in this directory */
  abstract listFiles(): Promise<string[]>
  /** Returns whether the given file exists in this directory */
  abstract hasFile(filename: string): boolean
  /** Returns the file contents of the given filename */
  abstract readFile(filename: string): Promise<string>
  /** Update the contents of the given file in the directory */
  abstract writeFile(filename: string, contents: string): Promise<void>
  /** Remove the file from this directory */
  abstract removeFile(filename: string): Promise<void>

  // Subdirectories

  /** Get the subdirectory at the provided path relative to this directory */
  async atPath(subpath: string): Promise<SpecDirectory> {
    if (!subpath) return this
    const i = subpath.indexOf(path.sep)
    if (i === -1) {
      return await this.subdir(subpath)
    }
    const child = await this.subdir(subpath.slice(0, i))
    return await child.atPath(subpath.slice(i + 1))
  }

  // helper to get the subitem with the given name
  protected abstract getSubdir(name: string): Promise<SpecDirectory>

  /**
   * Return the subitem of this directory corresponding to the given name
   */
  async subdir(name: string): Promise<SpecDirectory> {
    // Cache the subitem so we always return the same one
    if (!this._subdirs[name]) {
      this._subdirs[name] = await this.getSubdir(name)
    }
    return this._subdirs[name]
  }

  // Get the ordered list of subdir names
  protected abstract listSubdirs(): Promise<string[]>

  /** Return the list of subdirectories */
  async subdirs(): Promise<SpecDirectory[]> {
    const list = await this.listSubdirs()
    return Promise.all(list.map((item) => this.subdir(item)))
  }

  // Spec Options

  // Get the options from a physical options.yml file
  async directOptions(): Promise<SpecOptions> {
    const contents = this.hasFile("options.yml")
      ? await this.readFile("options.yml")
      : ""
    // TODO validate run options
    return SpecOptions.fromYaml(contents)
  }

  /** Get the spec options of this directory, including those inherited from its parent */
  async options(): Promise<SpecOptions> {
    const opts = await this.directOptions()
    return this.parentOpts?.merge(opts) ?? opts
  }

  // Test case info

  /** Return whether this directory corresponds to a test case */
  isTestDir(): boolean {
    return this.hasFile("input.scss") || this.hasFile("input.sass")
  }

  /** Return the contents of this directory as an HRX archive */
  async asArchive(): Promise<string> {
    return await toHrx(this)
  }

  // Iteration

  async setup() {}
  async cleanup() {}

  private isMatch(paths: string[]) {
    return paths.length === 0 || paths.some((path) => this.relPath() === path)
  }

  /**
   * Iterate through the subpaths of this directory, running the iteratee
   * on all test case directories.
   * @param paths the paths to match against, or [] if all subpaths should be run
   * @param iteratee the function to call for each matching subdirectory
   */
  async forEachTest(paths: string[], iteratee: SpecIteratee): Promise<void> {
    if (this.isMatch(paths)) {
      if (this.isTestDir()) {
        // If this is a test directory, run the test
        await iteratee(this)
      } else {
        // Otherwise, iterate on *all* the subdirectories
        for (const subdir of await this.subdirs()) {
          await subdir.forEachTest([], iteratee)
        }
      }
    } else {
      // filter out paths that this directory is not a parent of
      const subpaths = paths.filter((p) => p.startsWith(this.relPath()))
      // if this path isn't a parent of any of the given paths, exit loop
      if (subpaths.length === 0) {
        return
      }
      // recurse through the subdirectories
      for (const subdir of await this.subdirs()) {
        await subdir.forEachTest(subpaths, iteratee)
      }
    }
  }
}
