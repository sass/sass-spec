// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import * as del from 'del';
import * as fs from 'fs';
import * as p from 'path';
import {URL, pathToFileURL} from 'url';
import {PromiseOr} from 'sass';

/**
 * Runs `test` within a sandbox directory. This directory is made available via
 * the `dir` parameter, which provides various utilities for working with it.
 *
 * Handles all buildup and teardown. Returns a promise that resolves when `test`
 * finishes running.
 */
export async function sandbox(
  test: (dir: SandboxDirectory) => PromiseOr<void, 'async'>,
  options?: {
    // Directories to put in the SASS_PATH env variable before running test.
    sassPathDirs?: string[];
  }
): Promise<void> {
  const testDir = p.join('spec', 'sandbox', `${Math.random()}`.slice(2));
  fs.mkdirSync(testDir, {recursive: true});
  if (options?.sassPathDirs) {
    process.env.SASS_PATH = options.sassPathDirs.join(
      process.platform === 'win32' ? ';' : ':'
    );
  }
  try {
    await test(
      Object.assign((...paths: string[]) => p.join(testDir, ...paths), {
        root: testDir,
        url: (...paths: string[]) => pathToFileURL(p.join(testDir, ...paths)),
        write: (paths: {[path: string]: string}) => {
          for (const [path, contents] of Object.entries(paths)) {
            const fullPath = p.join(testDir, path);
            fs.mkdirSync(p.dirname(fullPath), {recursive: true});
            fs.writeFileSync(fullPath, contents);
          }
        },
      })
    );
  } finally {
    if (options?.sassPathDirs) process.env.SASS_PATH = undefined;
    // TODO(awjin): Change this to rmSync once we drop support for Node 12.
    del.sync(p.join(testDir, '**'), {force: true});
  }
}

/** The directory object passed to `sandbox`'s callback. */
interface SandboxDirectory {
  /** The root of the sandbox. */
  readonly root: string;

  /** Like `p.join()`, but prefixes the path with `root`. */
  (...paths: string[]): string;

  /**
   * Joins `paths` underneath `root` and converts the result to a `file:` URL.
   */
  url(...paths: string[]): URL;

  /**
   * Writes `paths` to disk within this directory.
   *
   * Each key is a filename, and each value is the file's contents.
   */
  write(paths: {[path: string]: string}): void;
}
