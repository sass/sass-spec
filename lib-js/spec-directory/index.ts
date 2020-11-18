import path from "path"
import SpecDirectory from "./spec-directory"
import RealDirectory from "./real-directory"
import VirtualDirectory from "./virtual-directory"

/**
 * Creates either a physical SpecDirectory from a directory or a virtual one from an hrx archive
 */
export async function fromPath(dirPath: string): Promise<SpecDirectory> {
  if (path.parse(dirPath).ext == ".hrx") {
    return await VirtualDirectory.fromArchive(dirPath)
  }
  return new RealDirectory(dirPath)
}

export async function fromContents(contents: string): Promise<SpecDirectory> {
  return VirtualDirectory.fromContents(contents)
}

export { default as SpecDirectory } from "./spec-directory"
