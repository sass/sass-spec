import fs from 'fs';
import p from 'path';

/**
 * Given a directory path, returns the directory to load for that path.
 *
 * This can return the path to a virtual HRX directory, in which case the return
 * value will end with `.hrx`.
 */
export function resolveSpecPath(path: string): string {
  path = normalizeSpecPath(path);
  const archivePath = `${path}.hrx`;
  const archiveExists = fs.existsSync(archivePath);
  const dirExists = fs.existsSync(path);
  if (archiveExists && dirExists) {
    throw new Error(`Both ${path} and ${archivePath} exist.`);
  } else if (archiveExists) {
    return archivePath;
  } else if (dirExists) {
    return path;
  } else {
    throw new Error(`Neither ${path} nor ${archivePath} exist.`);
  }
}

/**
 * Normalizes a path to a spec directory, removing trailing slashes and an
 * `.hrx` extension.
 */
export function normalizeSpecPath(path: string): string {
  if (path.endsWith('/') || path.endsWith(p.sep)) {
    path = path.substring(0, path.length - 1);
  }

  return path.endsWith('.hrx')
    ? path.substring(0, path.length - '.hrx'.length)
    : path;
}
