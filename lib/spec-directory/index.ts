import SpecDirectory from './spec-directory';
import RealDirectory from './real-directory';
import VirtualDirectory from './virtual-directory';
import {resolveSpecPath} from './spec-path';

/**
 * Creates either a physical SpecDirectory from a directory or a virtual one
 * from an hrx archive representing the root of a test suite.
 *
 * The `path` parameter may end in `/`, `.hrx`, both, or neither, and will be
 * able to load both HRX archives and physical directories regardless of which
 * suffix it uses.
 */
export async function fromRoot(path: string): Promise<SpecDirectory> {
  const resolved = resolveSpecPath(path);
  return resolved.endsWith('.hrx')
    ? await VirtualDirectory.fromArchive(resolved)
    : new RealDirectory(resolved);
}

export function fromContents(contents: string): Promise<SpecDirectory> {
  return VirtualDirectory.fromContents(contents);
}

export {default as SpecDirectory} from './spec-directory';
export {OptionKey} from './options';
