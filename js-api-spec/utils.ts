// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

/* eslint-disable @typescript-eslint/no-explicit-any */

import {info} from 'sass';

/* Whether the tests are running in a browser context. */
export const isBrowser = !global.process;

/** The name of the implementation of Sass being tested. */
export const sassImpl = info.split('\t')[0] as 'dart-sass' | 'sass-embedded';

/** Skips the `block` of tests when running against the given `impl`. */
export function skipForImpl(
  impl: 'dart-sass' | 'sass-embedded' | 'browser',
  block: () => void
): void {
  if (sassImpl === impl || (impl === 'browser' && isBrowser)) {
    xdescribe(`[skipped for ${impl}]`, block);
  } else {
    block();
  }
}

export const URL = isBrowser
  ? (global as unknown as any).URL
  : require('url').URL;

/* When running in the browser, Jasmine is used as the test runner, not Jest.
 * The API is similar, but Jasmine requires explicit use of `expectAsync`.
 */
export const expectA = isBrowser
  ? (expectAsync as unknown as jest.Expect)
  : expect;

export const spy = isBrowser
  ? (fn: (...args: any[]) => any) => jasmine.createSpy().and.callFake(fn)
  : jest.fn;

/** Runs `block` and captures any stdout or stderr it emits. */
export function captureStdio(block: () => void): {out: string; err: string} {
  let out = '';
  let err = '';

  if (isBrowser) {
    spyOn(console, 'log').and.callFake((msg: string) => (out += msg));
    spyOn(console, 'error').and.callFake((msg: string) => (err += msg));
    block();
  } else {
    const interceptStdout = require('intercept-stdout');
    const {Console} = require('console');
    // Jest overrides the console to pipe output to test reporter, so while we
    // execute `block` we have to replace Jest's console with a normal one that
    // can be intercepted by `interceptStdout`.
    const nativeConsole = new Console({
      stdout: process.stdout,
      stderr: process.stderr,
    });
    const jestConsole = global.console;
    global.console = nativeConsole;

    const unhook = interceptStdout(
      (chunk: string) => {
        out += chunk;
        return '';
      },
      (chunk: string) => {
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
  }

  return {out, err};
}

/** Like `captureStdio` but asynchronous. */
export async function captureStdioAsync(
  block: () => Promise<void>
): Promise<{out: string; err: string}> {
  let out = '';
  let err = '';

  if (isBrowser) {
    spyOn(console, 'log').and.callFake((msg: string) => (out += msg));
    spyOn(console, 'error').and.callFake((msg: string) => (err += msg));
    await block();
  } else {
    const interceptStdout = require('intercept-stdout');
    const {Console} = require('console');
    // Jest overrides the console to pipe output to test reporter, so while we
    // execute `block` we have to replace Jest's console with a normal one that
    // can be intercepted by `interceptStdout`.
    const nativeConsole = new Console({
      stdout: process.stdout,
      stderr: process.stderr,
    });
    const jestConsole = global.console;
    global.console = nativeConsole;

    const unhook = interceptStdout(
      (chunk: string) => {
        out += chunk;
        return '';
      },
      (chunk: string) => {
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
  }

  return {out, err};
}
