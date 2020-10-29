const { promises: fs, createReadStream } = require("fs")
const path = require("path")
const { archiveFromStream } = require("node-hrx")

/**
 * Writes the HRX item (file or directory) to disk as physical files at the given archive base path.
 */
async function writeToDisk(basePath, item) {
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
async function unarchive(filepath) {
  const { dir, name } = path.parse(filepath)
  // make a directory for the archive in the given directory
  const dirPath = path.resolve(dir, name)

  // Unarchive and read the contents
  const archive = await archiveFromStream(
    createReadStream(filepath, { encoding: "utf-8" })
  )
  await writeToDisk(dirPath, archive)
}

/**
 * Run the given callback on the HRX archive at the given path
 */
async function withArchive(filepath, callback) {
  await unarchive(filepath)
  const unarchivedDir = filepath.replace(".hrx", "")
  await callback(unarchivedDir)

  // Delete the directory when we're done
  await fs.rmdir(unarchivedDir, { recursive: true, force: true })
  // TODO handle errors and process exit
}

module.exports = {
  withArchive,
}
