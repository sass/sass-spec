// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {URL} from 'url';

import 'jest-extended';
import * as sass from 'sass';
import interceptStdout from 'intercept-stdout';

/** The name of the implementation of Sass being tested. */
export const sassImpl = sass.info.split('\t')[0];

declare global {
  /* eslint-disable-next-line @typescript-eslint/no-namespace */
  namespace jest {
    interface Matchers<R> {
      /**
       * Matches a callback that throws a `sass.Exception`.
       *
       * If `line` is passed, asserts that the exception has a span that starts
       * on that line.
       *
       * If `url` is passed, asserts that the exception has a span with the
       * given URL.
       */
      toThrowSassException(object?: {line?: number; url?: string | URL}): R;

      /**
       * Matches a callback that throws a `sass.Exception` with a span that has
       * no URL.
       */
      toThrowSassException(object: {line?: number; noUrl: boolean}): R;
    }
  }
}

interface ToThrowSassExceptionOptions {
  line?: number;
  url?: string | URL;
  noUrl?: boolean;
}

interface SyncExpectationResult {
  pass: boolean;
  message: () => string;
}

expect.extend({
  toThrowSassException(
    received: unknown,
    options: ToThrowSassExceptionOptions = {}
  ): SyncExpectationResult | Promise<SyncExpectationResult> {
    if (typeof received !== 'function') {
      throw new Error('Received value must be a function');
    }

    try {
      const result = received();
      if (result instanceof Promise) {
        return result.then(
          () => ({
            message: () => `expected ${received} to throw`,
            pass: false,
          }),
          thrown => verifyThrown(thrown, options)
        );
      }
    } catch (thrown: unknown) {
      return verifyThrown(thrown, options);
    }

    return {
      message: () => `expected ${received} to throw`,
      pass: false,
    };
  },
});

/**
 * Verifies that `thrown` matches the expectation of a `toThrowSassException`
 * call.
 */
function verifyThrown(
  thrown: unknown,
  {line, url, noUrl}: ToThrowSassExceptionOptions
): SyncExpectationResult {
  if (!(thrown instanceof sass.Exception)) {
    return {
      message: () => `expected ${thrown} to be a sass.Exception`,
      pass: false,
    };
  } else if (url && thrown.span.url?.toString() !== url.toString()) {
    return {
      message: () => `expected ${url}, was ${thrown.span.url}:\n${thrown}`,
      pass: false,
    };
  } else if (noUrl && thrown.span.url) {
    return {
      message: () => `expected no URL:\n${thrown}`,
      pass: false,
    };
  } else if (line && thrown.span.start?.line !== line) {
    return {
      message: () =>
        `expected to start on line ${line}, was ` +
        `${thrown.span.start?.line}:\n` +
        `${thrown}`,
      pass: false,
    };
  } else if (!thrown.sassMessage) {
    return {
      message: () => `expected a sassMessage field:\n${thrown}`,
      pass: false,
    };
  } else if (!thrown.sassStack) {
    return {
      message: () => `expected a sassStack field:\n${thrown}`,
      pass: false,
    };
  } else if (url) {
    return {
      message: () => `expected not ${url}:\n${thrown}`,
      pass: true,
    };
  } else if (noUrl) {
    return {
      message: () => `expected a URL:\n${thrown}`,
      pass: true,
    };
  } else if (line) {
    return {
      message: () => `expected not to start on line ${line}:\n${thrown}`,
      pass: true,
    };
  } else {
    return {
      message: () => `expected not to throw a sass.Exception:\n${thrown}`,
      pass: true,
    };
  }
}

/** Skips the `block` of tests when running against the given `impl`. */
export function skipForImpl(
  impl: 'dart-sass' | 'sass-embedded',
  block: () => void
): void {
  if (sassImpl === impl) {
    describe.skip(`[skipped for ${impl}]`, block);
  } else {
    block();
  }
}

/** Runs `block` and captures any stdout or stderr it emits. */
export function captureStdio(block: () => void): {out: string; err: string} {
  let out = '';
  let err = '';
  const unhook = interceptStdout(
    chunk => {
      out += chunk;
    },
    chunk => {
      err += chunk;
    }
  );

  try {
    block();
  } finally {
    unhook();
  }

  return {out, err};
}
