import fs from 'fs';
import path from 'path';

import {Readable} from 'stream';
import RealDirectory from './real-directory';
import SpecDirectory, {SpecIteratee} from './spec-directory';
import {archiveFromStream, Directory as HrxDirectory} from 'node-hrx';
import {withAsyncCleanup} from './cleanup';
import {normalizeSpecPath} from './spec-path';

function createFileCache(dir: HrxDirectory): Record<string, string> {
  const cache: Record<string, string> = {};
  for (const itemName of dir) {
    const subitem = dir.get(itemName);
    if (subitem?.isFile()) {
      cache[itemName] = subitem.body;
    }
  }
  return cache;
}

function createSubdirCache(dir: HrxDirectory): Record<string, HrxDirectory> {
  const cache: Record<string, HrxDirectory> = {};
  for (const itemName of dir) {
    const subitem = dir.get(itemName);
    if (subitem?.isDirectory()) {
      cache[itemName] = subitem;
    }
  }
  return cache;
}

export default class VirtualDirectory extends SpecDirectory {
  path: string;
  basePath: string;

  /**
   * The directory that contains this, or `null` if this is the root directory.
   */
  private _parent: SpecDirectory | null;

  /** Names of direct files in archive order. */
  private fileNames: string[];

  /** Mapping from file names to file contents. */
  private fileContents: Record<string, string>;

  /** Names of direct subdirectories in archive order. */
  private subdirNames: string[];

  /** The mapping from subdir names to the HRX Directory object. */
  private subdirCache: Record<string, HrxDirectory>;

  private isArchiveRoot: boolean;
  private modified = false;

  constructor(basePath: string, hrxDir: HrxDirectory, parent?: SpecDirectory) {
    super(parent?.root);
    this._parent = parent ?? null;
    this.path = path.resolve(basePath, hrxDir.path);
    this.basePath = basePath;
    // Separate the contents of the HrxDirectory into files and subdirs.
    // Since files are modifiable, we throw away the original HrxDirectory object
    // to minimize the risk of trying to reference it when doing stuff with files
    this.fileNames = hrxDir.list().filter(item => hrxDir.get(item)?.isFile());
    this.fileContents = createFileCache(hrxDir);
    this.subdirNames = hrxDir
      .list()
      .filter(item => hrxDir.get(item)?.isDirectory());
    this.subdirCache = createSubdirCache(hrxDir);
    this.isArchiveRoot = hrxDir.path === '';
  }

  async parent(): Promise<SpecDirectory | null> {
    return this._parent;
  }

  // Factories

  /**
   * Loads a spec directory from the HRX file at `hrxPath`.
   *
   * If this isn't the root of the test suite, `parent` must be the directory
   * that contains this file.
   */
  static async fromArchive(
    hrxPath: string,
    parent?: RealDirectory
  ): Promise<VirtualDirectory> {
    const stream = fs.createReadStream(hrxPath, {encoding: 'utf-8'});
    let archive;
    try {
      archive = await archiveFromStream(stream);
    } catch (error: unknown) {
      throw new Error(`Error parsing ${hrxPath}: ${error}`);
    }

    const {dir, name} = path.parse(hrxPath);
    return new VirtualDirectory(path.resolve(dir, name), archive, parent);
  }

  /**
   * Create a virtual directory from string contents, for testing purposes.
   */
  static async fromContents(contents: string): Promise<VirtualDirectory> {
    const stream = Readable.from(contents);
    const archive = await archiveFromStream(stream);
    return new VirtualDirectory('<test>', archive);
  }

  // File access
  async listFiles(): Promise<string[]> {
    return this.fileNames;
  }

  hasFile(filename: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.fileContents, filename);
  }

  async readFile(filename: string): Promise<string> {
    this.validateFile(filename, 'Cannot read file');
    return this.fileContents[filename];
  }

  async writeFile(filename: string, contents: string): Promise<void> {
    this.validateFile(filename, 'Cannot write file');
    this.modified = true;
    this.fileContents[filename] = contents;
    if (!this.fileNames.includes(filename)) {
      this.fileNames.push(filename);
    }
  }

  async removeFile(filename: string): Promise<void> {
    this.validateFile(filename, 'Cannot remove file');
    this.modified = true;
    delete this.fileContents[filename];
    this.fileNames = this.fileNames.filter(f => f !== filename);
  }

  // throw an error if the given filename is invalid
  private validateFile(filename: string, message: string): void {
    if (this.subdirCache[filename]) {
      throw new Error(`${message}: ${filename} is a directory`);
    }
    // `/` is a valid separator everywhere, but `path.sep` is `\` on Windows.
    if (filename.includes('/') || filename.includes(path.sep)) {
      throw new Error(`${message}: multi-level paths not supported`);
    }
  }

  // Subdir access

  async listSubdirs(): Promise<string[]> {
    return this.subdirNames;
  }

  async getSubdir(name: string): Promise<VirtualDirectory> {
    const subdir = this.subdirCache[normalizeSpecPath(name)];
    if (!subdir) {
      throw new Error(`Subdirectory does not exist: ${path}/${name}`);
    }
    return new VirtualDirectory(this.basePath, subdir, this);
  }

  // Iteration

  // Write the files that are directly part of this directory
  private async writeFilesToDisk(): Promise<void> {
    await fs.promises.mkdir(this.path, {recursive: true});
    const files = await this.listFiles();
    const writableFiles = files.filter(filename => {
      const {base, ext} = path.parse(filename);
      if (base.startsWith('output')) return false;
      if (!['.sass', '.scss', '.css'].includes(ext)) return false;
      return true;
    });
    await Promise.all(
      writableFiles.map(async filename => {
        const filepath = path.resolve(this.path, filename);
        await fs.promises.writeFile(filepath, await this.readFile(filename), {
          encoding: 'utf-8',
        });
      })
    );
  }

  // To set up a virtual directory, write all files to disk
  async setup(): Promise<void> {
    await this.writeFilesToDisk();
    const subdirs = await this.subdirs();
    await Promise.all(subdirs.map(subdir => subdir.setup()));
  }

  // Return true if a this virtual directory has been modified
  // (i.e. through interactive mode)
  private async hasModifications(): Promise<boolean> {
    const subdirs = await this.subdirs();
    const subdirsNeedCleanup = await Promise.all(
      subdirs.map(
        subdir =>
          subdir instanceof VirtualDirectory && subdir.hasModifications()
      )
    );
    return this.modified || subdirsNeedCleanup.some(value => value);
  }

  // Perform cleanup actions after opening this directory
  async cleanup(): Promise<void> {
    // remove the physical directory
    await fs.promises.rm(this.path, {recursive: true, force: true});
    // if files were written to this directory, write to the root archive file
    if (await this.hasModifications()) {
      const hrx = await this.asArchive();
      await fs.promises.writeFile(this.path + '.hrx', hrx, {
        encoding: 'utf-8',
      });
    }
  }

  async forEachTest(iteratee: SpecIteratee, only?: string[]): Promise<void> {
    if (this.isArchiveRoot) {
      await this.setup();
      await withAsyncCleanup(
        () => this.cleanup(),
        async () => {
          await super.forEachTest(iteratee, only);
        }
      );
    } else {
      await super.forEachTest(iteratee, only);
    }
  }
}
