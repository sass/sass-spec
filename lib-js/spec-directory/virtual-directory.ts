import fs from "fs"
import path from "path"
import { Readable } from "stream"
import SpecDirectory, { SpecIteratee } from "./spec-directory"
import { archiveFromStream, Directory as HrxDirectory } from "node-hrx"
import SpecOptions from "./options"
import { withAsyncCleanup } from "./cleanup"

function createFileCache(dir: HrxDirectory) {
  const cache: Record<string, string> = {}
  for (const itemName of dir) {
    const subitem = dir.get(itemName)
    if (subitem?.isFile()) {
      cache[itemName] = subitem.body
    }
  }
  return cache
}

function createSubdirCache(dir: HrxDirectory) {
  const cache: Record<string, HrxDirectory> = {}
  for (const itemName of dir) {
    const subitem = dir.get(itemName)
    if (subitem?.isDirectory()) {
      cache[itemName] = subitem
    }
  }
  return cache
}

export default class VirtualDirectory extends SpecDirectory {
  path: string
  basePath: string
  // Names of direct files in archive order
  private fileNames: string[]
  // Mapping from file names to file contents
  private fileContents: Record<string, string>
  // Names of direct subdirectories in archive order
  private subdirNames: string[]
  // mapping from subdir names to the HRX Directory object
  private subdirCache: Record<string, HrxDirectory>
  private isArchiveRoot: boolean
  private modified = false

  constructor(
    basePath: string,
    hrxDir: HrxDirectory,
    root?: SpecDirectory,
    parentOpts?: SpecOptions
  ) {
    super(root, parentOpts)
    this.path = path.resolve(basePath, hrxDir.path)
    this.basePath = basePath
    // Separate the contents of the HrxDirectory into files and subdirs.
    // Since files are modifiable, we throw away the original HrxDirectory object
    // to minimize the risk of trying to reference it doing stuff with files
    this.fileNames = hrxDir.list().filter((item) => hrxDir.get(item)?.isFile())
    this.fileContents = createFileCache(hrxDir)
    this.subdirNames = hrxDir
      .list()
      .filter((item) => hrxDir.get(item)?.isDirectory())
    this.subdirCache = createSubdirCache(hrxDir)
    this.isArchiveRoot = hrxDir.path === ""
  }

  // Factories

  // Unarchive the given .hrx file and turn it into a spec path
  static async fromArchive(
    hrxPath: string,
    root?: SpecDirectory,
    parentOpts?: SpecOptions
  ) {
    const stream = fs.createReadStream(hrxPath, { encoding: "utf-8" })
    const archive = await archiveFromStream(stream)
    const { dir, name } = path.parse(hrxPath)
    return new VirtualDirectory(
      path.resolve(dir, name),
      archive,
      root,
      parentOpts
    )
  }

  // Get an HRX archive from a string
  static async fromContents(contents: string, path = "/tmp") {
    const stream = Readable.from(contents)
    const archive = await archiveFromStream(stream)
    // TODO where should the temp path be?
    return new VirtualDirectory(path, archive)
  }

  // File access
  async listFiles() {
    return this.fileNames
  }

  hasFile(filename: string) {
    return this.fileContents.hasOwnProperty(filename)
  }

  async readFile(filename: string) {
    return this.fileContents[filename]
  }

  async writeFile(filename: string, contents: string) {
    if (this.subdirCache[filename]) {
      throw new Error("Trying to write a subdirectory")
    }
    this.modified = true
    this.fileContents[filename] = contents
    if (!this.fileNames.includes(filename)) {
      this.fileNames.push(filename)
    }
  }

  async removeFile(filename: string) {
    if (this.subdirCache[filename]) {
      throw new Error("Trying to remove a subdirectory")
    }
    this.modified = true
    delete this.fileContents[filename]
    this.fileNames = this.fileNames.filter((f) => f !== filename)
  }

  // Subdir access

  async listSubdirs() {
    return this.subdirNames
  }

  async getSubdir(itemName: string) {
    const subitem = this.subdirCache[itemName]
    if (!subitem) {
      throw new Error(`Item does not exist: ${itemName}`)
    }
    const options = await this.options()
    return new VirtualDirectory(this.basePath, subitem, this.root, options)
  }

  // Iteration

  // Write the files that are directly part of this directory
  private async writeFilesToDisk() {
    await fs.promises.mkdir(this.path, { recursive: true })
    const files = await this.listFiles()
    const writableFiles = files.filter((filename) => {
      const { base, ext } = path.parse(filename)
      if (base.startsWith("output")) return false
      if (![".sass", ".scss", ".css"].includes(ext)) return false
      return true
    })
    await Promise.all(
      writableFiles.map(async (filename) => {
        const filepath = path.resolve(this.path, filename)
        await fs.promises.writeFile(filepath, await this.readFile(filename), {
          encoding: "utf-8",
        })
      })
    )
  }

  // To set up a virtual directory, write all files to disk
  async setup() {
    await this.writeFilesToDisk()
    const subdirs = await this.subdirs()
    await Promise.all(subdirs.map((subdir) => subdir.setup()))
  }

  // Return true if a this virtual directory has been modified
  // (i.e. through interactive mode)
  private async hasModifications(): Promise<boolean> {
    const subdirs = await this.subdirs()
    const subdirsNeedCleanup = await Promise.all(
      subdirs.map(
        (subdir) =>
          subdir instanceof VirtualDirectory && subdir.hasModifications()
      )
    )
    return this.modified || subdirsNeedCleanup.some((value) => value)
  }

  // Perform cleanup actions after opening this directory
  async cleanup() {
    // remove the physical directory
    await fs.promises.rm(this.path, { recursive: true, force: true })
    // if files were written to this directory, write to the root archive file
    if (await this.hasModifications()) {
      const hrx = await this.asArchive()
      await fs.promises.writeFile(this.path + ".hrx", hrx, {
        encoding: "utf-8",
      })
    }
  }

  async forEachTest(paths: string[], iteratee: SpecIteratee) {
    if (this.isArchiveRoot) {
      await this.setup()
      await withAsyncCleanup(
        () => this.cleanup(),
        async () => {
          await super.forEachTest(paths, iteratee)
        }
      )
    } else {
      await super.forEachTest(paths, iteratee)
    }
  }
}
