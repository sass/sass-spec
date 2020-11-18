import fs from "fs"
import path from "path"
import { Readable } from "stream"
import SpecDirectory, { SpecIteratee } from "./spec-directory"
import { archiveFromStream, Directory as HrxDirectory } from "node-hrx"
import { RunOptions } from "../options"
import { toHrx } from "./hrx"

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
  private fileNames: string[]
  private fileCache: Record<string, string>
  private subdirNames: string[]
  private subdirCache: Record<string, HrxDirectory>
  private isArchiveRoot: boolean
  private modified = false

  constructor(
    basePath: string,
    hrxDir: HrxDirectory,
    root?: SpecDirectory,
    parentOpts?: RunOptions
  ) {
    super(root, parentOpts)
    this.path = path.resolve(basePath, hrxDir.path)
    this.basePath = basePath
    this.fileNames = hrxDir.list().filter((item) => hrxDir.get(item)?.isFile())
    this.fileCache = createFileCache(hrxDir)
    this.subdirNames = hrxDir
      .list()
      .filter((item) => hrxDir.get(item)?.isDirectory())
    this.subdirCache = createSubdirCache(hrxDir)
    this.isArchiveRoot = hrxDir.path === ""
  }

  // Unarchive the given .hrx file and turn it into a spec path
  static async fromArchive(
    hrxPath: string,
    root?: SpecDirectory,
    parentOpts?: RunOptions
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

  private async writeDirectFiles() {
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

  async writeToDisk() {
    await this.writeDirectFiles()
    const subdirs = await this.typedSubdirs()
    await Promise.all(subdirs.map((subdir) => subdir.writeToDisk()))
  }

  async needsCleanup(): Promise<boolean> {
    const subdirs = await this.typedSubdirs()
    const subdirsNeedCleanup = await Promise.all(
      subdirs.map((subdir) => subdir.needsCleanup())
    )
    return this.modified || subdirsNeedCleanup.some((value) => value)
  }

  async cleanup() {
    // remove this directory
    await fs.promises.rmdir(this.path, { recursive: true })
    // if files were written to this directory, write to the root archive file
    if (await this.needsCleanup()) {
      const hrx = await toHrx(this)
      await fs.promises.writeFile(this.path + ".hrx", hrx, {
        encoding: "utf-8",
      })
    }
  }

  async listFiles() {
    return this.fileNames
  }

  async listSubdirs() {
    return this.subdirNames
  }

  async getSubdir(itemName: string) {
    const subitem = this.subdirCache[itemName]
    const options = await this.options()
    if (!subitem) {
      throw new Error(`Item does not exist: ${itemName}`)
    }
    return new VirtualDirectory(this.basePath, subitem, this.root, options)
  }

  // Helper function to type the subdirs correctly
  private async typedSubdirs(): Promise<VirtualDirectory[]> {
    return (await this.subdirs()) as any
  }

  hasFile(filename: string) {
    return this.fileCache.hasOwnProperty(filename)
  }

  async readFile(filename: string) {
    return this.fileCache[filename]
  }

  async writeFile(filename: string, contents: string) {
    if (this.subdirCache[filename]) {
      throw new Error("Trying to write a subdirectory")
    }
    this.modified = true
    this.fileCache[filename] = contents
    if (!this.fileNames.includes(filename)) {
      this.fileNames.push(filename)
    }
  }

  async removeFile(filename: string) {
    if (this.subdirCache[filename]) {
      throw new Error("Trying to remove a subdirectory")
    }
    this.modified = true
    delete this.fileCache[filename]
    this.fileNames = this.fileNames.filter((f) => f !== filename)
  }

  /**
   * Write files corresponding to this directory and run the given callback,
   * deleting the files when done
   */
  async withRealFiles(cb: () => Promise<void>) {
    await this.writeToDisk()

    // Cleanup callbacks must be synchronous,
    // so trigger an async function that exits the process
    const cleanupAndExit = async (status: number) => {
      // cleanup and then trigger an exit
      await this.cleanup()
      process.exit(status)
    }

    // TODO handle more process exit cases
    // e.g. uncaught exceptions, SIGUSR1, SIGUSR2, SIGTERM
    const exitHandler = (status: number) => {
      cleanupAndExit(status)
    }

    const sigintHandler = () => {
      cleanupAndExit(0)
    }
    process.on("exit", exitHandler)
    process.on("SIGINT", sigintHandler)

    try {
      await cb()
    } finally {
      process
        .removeListener("exit", exitHandler)
        .removeListener("SIGINT", sigintHandler)
      await this.cleanup()
    }
  }

  async forEachTest(paths: string[], iteratee: SpecIteratee) {
    if (this.isArchiveRoot) {
      // TODO adjust this so that it only creates files needed for the test
      await this.withRealFiles(async () => {
        await super.forEachTest(paths, iteratee)
      })
    } else {
      await super.forEachTest(paths, iteratee)
    }
  }
}
