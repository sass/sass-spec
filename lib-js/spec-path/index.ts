import path from "path"
import SpecPath from "./spec-path"
import RealSpecPath from "./real-spec-path"
import VirtualSpecPath from "./virtual-spec-path"

/**
 * Creates either a physical SpecPath from a directory or a virtual one from an hrx archive
 */
export async function fromPath(specPath: string): Promise<SpecPath> {
  if (path.parse(specPath).ext == ".hrx") {
    return await VirtualSpecPath.fromArchive(specPath)
  }
  return new RealSpecPath(specPath)
}

export async function fromContents(contents: string): Promise<SpecPath> {
  return VirtualSpecPath.fromContents(contents)
}

export { default as SpecPath } from "./spec-path"
