import p from 'path';
import * as _ from 'lodash';

import SpecOptions from './options';
import {toHrx} from './hrx';
import {normalizeSpecPath} from './spec-path';

export type SpecIteratee = (subdir: SpecDirectory) => Promise<void>;

/**
 * Represents a real or virtual directory that contains sass-spec test cases.
 *
 * Contains methods for accessing the direct files and subdirectories of the directory.
 */
export default abstract class SpecDirectory {
  protected readonly root: SpecDirectory;
  private readonly parentOpts?: SpecOptions;
  private readonly _subdirs: Record<string, SpecDirectory> = {};

  /** The full path of this directory */
  abstract path: string;

  constructor(root?: SpecDirectory, parentOpts?: SpecOptions) {
    this.root = root ?? this;
    this.parentOpts = parentOpts;
  }

  /** The path of this directory relative to the top level that was created */
  relPath(): string {
    // make sure to include the root dir as part of the name
    // (e.g. if the root path is `spec`, everything should be listed as `spec/thing`)
    const rootDir = p.dirname(this.root.path);
    return p.relative(rootDir, this.path);
  }

  // File manipulation

  /** Get the list of direct filenames in this directory */
  abstract listFiles(): Promise<string[]>;
  /** Returns whether the given file exists in this directory */
  abstract hasFile(filename: string): boolean;
  /** Returns the file contents of the given filename */
  abstract readFile(filename: string): Promise<string>;
  /** Update the contents of the given file in the directory */
  abstract writeFile(filename: string, contents: string): Promise<void>;
  /** Remove the file from this directory */
  abstract removeFile(filename: string): Promise<void>;

  // Subdirectories

  /** Get the subdirectory at the provided path relative to this directory */
  async atPath(subpath: string): Promise<SpecDirectory> {
    if (!subpath) return this;
    const components = pathSplit(subpath);
    if (components.length === 1) return await this.subdir(components[0]);
    const child = await this.subdir(components[0]);
    return await child.atPath(components.slice(1).join(p.sep));
  }

  // helper to get the subitem with the given name
  protected abstract getSubdir(name: string): Promise<SpecDirectory>;

  /**
   * Return the subitem of this directory corresponding to the given name
   */
  async subdir(name: string): Promise<SpecDirectory> {
    // Cache the subitem so we always return the same one
    if (!this._subdirs[name]) {
      this._subdirs[name] = await this.getSubdir(name);
    }
    return this._subdirs[name];
  }

  // Get the ordered list of subdir names
  protected abstract listSubdirs(): Promise<string[]>;

  /** Return the list of subdirectories */
  async subdirs(): Promise<SpecDirectory[]> {
    const list = await this.listSubdirs();
    return Promise.all(list.map(item => this.subdir(item)));
  }

  // Spec Options

  // Get the options from a physical options.yml file
  async directOptions(): Promise<SpecOptions> {
    const contents = this.hasFile('options.yml')
      ? await this.readFile('options.yml')
      : '';
    // TODO validate run options
    return SpecOptions.fromYaml(contents);
  }

  /** Get the spec options of this directory, including those inherited from its parent */
  async options(): Promise<SpecOptions> {
    const opts = await this.directOptions();
    return this.parentOpts?.merge(opts) ?? opts;
  }

  // Test case info

  /** Return whether this directory corresponds to a test case */
  isTestDir(): boolean {
    return this.hasFile('input.scss') || this.hasFile('input.sass');
  }

  /** Return the contents of this directory as an HRX archive */
  async asArchive(): Promise<string> {
    return await toHrx(this);
  }

  // Iteration

  async setup(): Promise<void> {}
  async cleanup(): Promise<void> {}

  /**
   * Iterate through the subpaths of this directory, running the iteratee
   * on all test case directories.
   *
   * @param iteratee the function to call for each matching subdirectory
   * @param only if this is passed, only paths that match these will be run
   * @throws {Error} if `only` contains any paths that aren't in this directory
   */
  async forEachTest(iteratee: SpecIteratee, only?: string[]): Promise<void> {
    const relPath = this.relPath();
    if (
      only === undefined ||
      only.some(path => normalizeSpecPath(path) === relPath)
    ) {
      if (this.isTestDir()) {
        // If this is a test directory, run the test
        await iteratee(this);
      } else {
        // Otherwise, iterate on *all* the subdirectories
        for (const subdir of await this.subdirs()) {
          await subdir.forEachTest(iteratee);
        }
      }
      return;
    }

    // A map from the basename of each subdirectory to that subdirectory
    const subdirsByBasename = _.fromPairs(
      (await this.subdirs()).map(subdir => [p.basename(subdir.path), subdir])
    );

    // A map from the first component of each path in `only` (for example, `foo`
    // in `foo/bar/baz`) to the full paths under that component.
    const onlyByFirstComponent = _.groupBy(only, path =>
      normalizeSpecPath(pathSplit(p.relative(relPath, path))[0])
    );

    for (const [component, paths] of _.toPairs(onlyByFirstComponent)) {
      const subdir = subdirsByBasename[component];
      if (subdir) {
        await subdir.forEachTest(iteratee, paths);
      } else {
        throw new Error(`Path ${paths[0]} doesn't exist`);
      }
    }
  }

  toString(): string {
    return this.path;
  }
}

/// Splits a relative path into its constituent components.
function pathSplit(path: string): string[] {
  if (p.isAbsolute(path)) throw new Error(`Expected ${path} to be relative.`);
  path = p.normalize(path);
  if (path.endsWith(p.sep)) path = path.substring(0, path.length - 1);
  return path.split(p.sep);
}
