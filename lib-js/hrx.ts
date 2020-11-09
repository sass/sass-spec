import { promises as fs, createReadStream } from "fs"
import path from "path"
import { archiveFromStream, HrxItem } from "node-hrx"

/**
 * Writes the HRX item (file or directory) to disk as physical files at the given archive base path.
 */
async function writeToDisk(basePath: string, item: HrxItem) {
  const fullPath = path.resolve(basePath, item.path)
  if (item.isDirectory()) {
    // If a directory, make the directory and recurse
    await fs.mkdir(fullPath)
    for (const subitem of item) {
      await writeToDisk(basePath, item.contents[subitem])
    }
  } else {
    // We're a file, so write to it
    await fs.writeFile(fullPath, item.body, { encoding: "utf-8" })
  }
}

/**
 * Unarchives the given HRX archive into the filesystem
 */
async function unarchive(filepath: string) {
  const { dir, name } = path.parse(filepath)
  // make a directory for the archive in the given directory
  const dirPath = path.resolve(dir, name)

  // Unarchive and read the contents
  const archive = await archiveFromStream(
    createReadStream(filepath, { encoding: "utf-8" })
  )
  await writeToDisk(dirPath, archive)
}

type HrxCallback = (dir: string) => Promise<void>

/**
 * Run the given callback on the HRX archive at the given path
 */
export async function withArchive(filepath: string, callback: HrxCallback) {
  await unarchive(filepath)
  const unarchivedDir = filepath.replace(".hrx", "")
  try {
    await callback(unarchivedDir)
  } finally {
    // Delete the directory when we're done
    await fs.rmdir(unarchivedDir, { recursive: true })
  }

  // TODO handle errors and process exit
}
