// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import interceptStdout from 'intercept-stdout';
import {Console} from 'console';

export {sandbox} from './sandbox';

/** Runs `block` and captures any stdout or stderr it emits. */
export function captureStdio(block: () => void): {out: string; err: string} {
  // Jest overrides the console to pipe output to test reporter, so while we
  // execute `block` we have to replace Jest's console with a normal one that
  // can be intercepted by `interceptStdout`.
  const nativeConsole = new Console({
    stdout: process.stdout,
    stderr: process.stderr,
  });
  const jestConsole = global.console;
  global.console = nativeConsole;

  let out = '';
  let err = '';
  const unhook = interceptStdout(
    chunk => {
      out += chunk;
      return '';
    },
    chunk => {
      err += chunk;
      return '';
    }
  );

  try {
    block();
  } finally {
    unhook();
    global.console = jestConsole;
  }

  return {out, err};
}

/** Like `captureStdio` but asynchronous. */
export async function captureStdioAsync(
  block: () => Promise<void>
): Promise<{out: string; err: string}> {
  // Jest overrides the console to pipe output to test reporter, so while we
  // execute `block` we have to replace Jest's console with a normal one that
  // can be intercepted by `interceptStdout`.
  const nativeConsole = new Console({
    stdout: process.stdout,
    stderr: process.stderr,
  });
  const jestConsole = global.console;
  global.console = nativeConsole;

  let out = '';
  let err = '';
  const unhook = interceptStdout(
    chunk => {
      out += chunk;
      return '';
    },
    chunk => {
      err += chunk;
      return '';
    }
  );

  try {
    await block();
  } finally {
    unhook();
    global.console = jestConsole;
  }

  return {out, err};
}
