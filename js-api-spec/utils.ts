// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

/* eslint-disable @typescript-eslint/no-explicit-any */

import {info} from 'sass';

/* Whether the tests are running in a browser context. */
export const isBrowser = !global.process;

/** The name of the implementation of Sass being tested. */
export const sassImpl = info.split('\t')[0] as 'dart-sass' | 'sass-embedded';

type Implementations = 'dart-sass' | 'sass-embedded' | 'browser';

/** Skips the `block` of tests when running against the given `impl`. */
export function skipForImpl(
  impl: Implementations | Implementations[],
  block: () => void
): void {
  impl = Array.isArray(impl) ? impl : [impl];
  if (impl.includes(sassImpl) || (impl.includes('browser') && isBrowser)) {
    xdescribe(`[skipped for ${impl}]`, block);
  } else {
    block();
  }
}

export const URL = isBrowser
  ? (global as unknown as any).URL
  : require('url').URL;

export const spy = (fn: (...args: any[]) => any) =>
  jasmine.createSpy().and.callFake(fn);

/** Runs `block` and captures any stdout or stderr it emits. */
export function captureStdio(block: () => void): {out: string; err: string} {
  let out = '';
  let err = '';

  if (isBrowser) {
    spyOn(console, 'log').and.callFake((msg: string) => (out += msg));
    spyOn(console, 'info').and.callFake((msg: string) => (out += msg));
    spyOn(console, 'warn').and.callFake((msg: string) => (err += msg));
    spyOn(console, 'error').and.callFake((msg: string) => (err += msg));
    block();
  } else {
    const interceptStdout = require('intercept-stdout');

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
    spyOn(console, 'info').and.callFake((msg: string) => (out += msg));
    spyOn(console, 'warn').and.callFake((msg: string) => (err += msg));
    spyOn(console, 'error').and.callFake((msg: string) => (err += msg));
    await block();
  } else {
    const interceptStdout = require('intercept-stdout');

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
    }
  }

  return {out, err};
}
