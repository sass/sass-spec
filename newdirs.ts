import fs from "fs"
import path from "path"
import { archiveFromStream, HrxItem } from "node-hrx"

type SpecDirCallback = (path: string) => Promise<void>

/** Represents an abstract directory used in sass-spec */
interface SpecPath {
  path: string
  contents(): Promise<Record<string, SpecPath>>
  // run the callback with the physical files present
  withRealFiles(cb: SpecDirCallback): Promise<void>
  writeToDisk(): Promise<void>
  cleanup(): Promise<void>
  isFile(): boolean
  isDirectory(): boolean
}

abstract class AbstractSpecPath implements SpecPath {
  abstract path: string
  abstract contents(): Promise<Record<string, SpecPath>>
  abstract isDirectory(): boolean

  // by default, do nothing
  async writeToDisk(): Promise<void> {}
  async cleanup(): Promise<void> {}

  async withRealFiles(cb: SpecDirCallback) {
    await this.writeToDisk()
    try {
      await cb(this.path)
    } finally {
      // TODO handle process exit
      await this.cleanup()
    }
  }

  isFile() {
    return !this.isDirectory()
  }
}

class RealSpecPath extends AbstractSpecPath {
  path: string

  constructor(path: string) {
    super()
    this.path = path
  }

  isDirectory() {
    return fs.statSync(this.path).isDirectory()
  }

  async contents() {
    if (this.isFile()) return {}
    const contents: Record<string, SpecPath> = {}
    for (const filename of fs.readdirSync(this.path)) {
      const fullPath = path.resolve(this.path, filename)
      // TODO handle HRX cases
      if (filename.endsWith(".hrx")) {
        contents[filename] = await VirtualSpecPath.fromArchive(fullPath)
      } else {
        contents[filename] = new RealSpecPath(fullPath)
      }
    }
    return contents
  }
}

class VirtualSpecPath extends AbstractSpecPath {
  path: string
  basePath: string
  hrx: HrxItem

  constructor(basePath: string, hrxItem: HrxItem) {
    super()
    this.path = path.resolve(basePath, hrxItem.path)
    this.basePath = basePath
    this.hrx = hrxItem
  }

  // Unarchive the given .hrx file and turn it into a spec path
  static async fromArchive(hrxPath: string) {
    const stream = fs.createReadStream(hrxPath, { encoding: "utf-8" })
    const archive = await archiveFromStream(stream)
    const { dir, name } = path.parse(hrxPath)
    return new VirtualSpecPath(path.resolve(dir, name), archive)
  }

  isDirectory() {
    return this.hrx.isDirectory()
  }

  async writeToDisk() {
    if (this.hrx.isFile()) {
      // TODO use a tmp directory unless there are external references
      const { dir } = path.parse(this.path)
      // recursively create this file's parent directories
      await fs.promises.mkdir(dir, { recursive: true })
      // write this file to disk
      await fs.promises.writeFile(this.path, this.hrx.body, {
        encoding: "utf-8",
      })
    } else {
      // Otherwise, recurse as defined by the base class
      const contents = await this.contents()
      for (const subitem of Object.values(contents)) {
        await subitem.writeToDisk()
      }
    }
  }

  async cleanup() {
    // TODO this can lead to errors if we don't do stuff sequentially
    await fs.promises.rmdir(this.basePath, { recursive: true })
  }

  async contents() {
    if (this.hrx.isFile()) {
      return {}
    }
    const contents: Record<string, SpecPath> = {}
    for (const itemName of this.hrx) {
      contents[itemName] = new VirtualSpecPath(
        this.basePath,
        this.hrx.get(itemName)!
      )
    }
    return contents
  }
}

function fromPath(path: string): SpecPath {
  return new RealSpecPath(path)
}

/**
 * Iterate through the given spec directories and find the ones that have an actual test case.
 */
// TODO turn this into a generator??
async function getTestDirs(dir: SpecPath): Promise<SpecPath[]> {
  const contents = await dir.contents()
  if (
    Object.keys(contents).some((itemName) => /input.s[ac]ss/.test(itemName))
  ) {
    return [dir]
  } else {
    let dirs: SpecPath[] = []
    for (const subitem of Object.values(contents)) {
      dirs = dirs.concat(await getTestDirs(subitem))
    }
    return dirs
  }
}

async function runTestCase(dir: SpecPath) {
  await dir.withRealFiles(async (path) => {
    console.log(path)
    // TODO do stuff
  })
}

async function runAllSpecs(path: string) {
  const testDirs = await getTestDirs(fromPath(path))
  for (const testDir of testDirs) {
    await runTestCase(testDir)
  }
}

runAllSpecs(path.resolve(__dirname, "spec/arguments"))
