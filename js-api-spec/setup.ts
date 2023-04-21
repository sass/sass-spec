// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import 'jest-extended';
import * as immutable from 'immutable';
import * as sass from 'sass';
import * as util from 'util';
import type {URL} from 'url';

declare global {
  // eslint-disable-next-line no-var
  var expectAsync: typeof expect;

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jasmine {
    // eslint-disable-next-line no-var
    var addMatchers: (matchers: unknown) => void;
    // eslint-disable-next-line no-var
    var addAsyncMatchers: (matchers: unknown) => void;
  }

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
       *
       * If `includes` is passed, asserts that the exception's `sassMessage`
       * contains the given `includes` string.
       */
      toThrowSassException(object?: {
        line?: number;
        url?: string | URL;
        includes?: string;
      }): R;

      /**
       * Matches a callback that throws a `sass.Exception` with a span that has
       * no URL.
       */
      toThrowSassException(object: {line?: number; noUrl: boolean}): R;

      /**
       * Matches a callback that throws a `sass.LegacyException` with with the
       * given `line` number and `file` path.
       *
       * If `includes` is passed, this verifies that the exception's
       * `toString()` includes that value.
       */
      toThrowLegacyException(object?: {
        line?: number;
        file?: string;
        includes?: string;
      }): R;

      /**
       * Matches a value that's `.equal()` to and has the same `.hashCode()` as
       * `value`.
       */
      toEqualWithHash(value: immutable.ValueObject): R;
    }
  }
}

interface ToThrowSassExceptionOptions {
  line?: number;
  url?: string | URL;
  noUrl?: boolean;
  includes?: string;
}

interface SyncExpectationResult {
  pass: boolean;
  message: () => string;
}

const toThrowSassException = (
  received: unknown,
  options: ToThrowSassExceptionOptions = {}
): SyncExpectationResult | Promise<SyncExpectationResult> => {
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
};

const toThrowLegacyException = (
  received: unknown,
  options: {line?: number; file?: string; includes?: string} = {}
): SyncExpectationResult => {
  if (typeof received !== 'function') {
    throw new Error('Received value must be a function');
  }

  try {
    received();
  } catch (thrown: unknown) {
    if (typeof thrown !== 'object' || thrown === null) {
      return {
        message: () => `expected ${thrown} to be an object`,
        pass: false,
      };
    } else if (!('formatted' in thrown)) {
      return {
        message: () => `expected ${thrown} to have a 'formatted' field`,
        pass: false,
      };
    } else if (!('status' in thrown)) {
      return {
        message: () => `expected ${thrown} to have a 'status' field`,
        pass: false,
      };
    }

    if (options?.line !== undefined) {
      if (!('line' in thrown)) {
        return {
          message: () => `expected ${thrown} to have a 'line' field`,
          pass: false,
        };
      } else if ((thrown as {line: unknown}).line !== options.line) {
        return {
          message: () =>
            `expected exception.line to be ${options.line}, was ` +
            `${(thrown as {line: unknown}).line}`,
          pass: false,
        };
      }
    }

    if (options?.file !== undefined) {
      if (!('file' in thrown)) {
        return {
          message: () => `expected ${thrown} to have a 'file' field`,
          pass: false,
        };
      } else if ((thrown as {file: unknown}).file !== options.file) {
        return {
          message: () =>
            `expected exception.file to be "${options.file}", was ` +
            `"${(thrown as {file: unknown}).file}"`,
          pass: false,
        };
      }
    }

    if (
      options?.includes !== undefined &&
      !`${thrown}`.includes(options.includes)
    ) {
      return {
        message: () =>
          `expected exception.toString() to contain "${options.includes}", ` +
          `was "${thrown}"`,
        pass: false,
      };
    }

    if (options?.line !== undefined) {
      return {
        message: () => `expected exception.line not to be ${options.line}`,
        pass: true,
      };
    } else if (options?.file !== undefined) {
      return {
        message: () => `expected exception.file not to be "${options.file}"`,
        pass: true,
      };
    } else if (options?.includes !== undefined) {
      return {
        message: () =>
          'expected exception.toString() not to contain ' +
          `"${options.includes}"`,
        pass: true,
      };
    } else {
      return {
        message: () => 'expected callback not to throw a LegacyException',
        pass: true,
      };
    }
  }

  return {
    message: () => `expected ${received} to throw`,
    pass: false,
  };
};

const toEqualWithHash = (
  received: unknown,
  actual: immutable.ValueObject
): SyncExpectationResult => {
  if (typeof received !== 'object' || received === null) {
    return {
      message: () => `expected ${util.inspect(received)} to be an object`,
      pass: false,
    };
  } else if (
    !('equals' in received) ||
    typeof (received as {equals: unknown}).equals !== 'function'
  ) {
    return {
      message: () =>
        `expected ${util.inspect(received)} to have an "equals" method`,
      pass: false,
    };
  } else if (
    !('hashCode' in received) ||
    typeof (received as {hashCode: unknown}).hashCode !== 'function'
  ) {
    return {
      message: () =>
        `expected ${util.inspect(received)} to have a "hashCode" method`,
      pass: false,
    };
  }

  const receivedValue = received as immutable.ValueObject;
  if (!receivedValue.equals(actual)) {
    return {
      message: () => `expected ${received} to be .equal() to ${actual}`,
      pass: false,
    };
  } else if (receivedValue.hashCode() !== actual.hashCode()) {
    return {
      message: () =>
        `expected ${received} to have the same .hashCode() as ${actual}`,
      pass: false,
    };
  } else {
    return {
      message: () => `expected ${received} not to be .equal() to ${actual}`,
      pass: true,
    };
  }
};

if (expect.extend) {
  expect.extend({
    toThrowSassException,
    toThrowLegacyException,
    toEqualWithHash,
  });
} else if (jasmine?.addMatchers) {
  beforeAll(() => {
    jasmine.addMatchers({
      toThrowSassException: () => ({
        compare: toThrowSassException,
      }),
      toThrowLegacyException: () => ({
        compare: toThrowLegacyException,
      }),
      toEqualWithHash: () => ({
        compare: toEqualWithHash,
      }),
      toHaveProperty: () => ({
        compare: (
          received: unknown,
          expectedPath: string
        ): SyncExpectationResult => {
          if (typeof received !== 'object') {
            throw new Error('Received value must be an object');
          }
          if (typeof expectedPath !== 'string') {
            throw new Error('Expected property value must be a string');
          }

          return {
            message: () =>
              `expected ${received} to have property ${expectedPath}`,
            pass: Object.prototype.hasOwnProperty.call(received, expectedPath),
          };
        },
      }),
    });
    jasmine.addAsyncMatchers({
      toThrowSassException: () => ({
        compare: toThrowSassException,
      }),
    });
  });
}

/**
 * Verifies that `thrown` matches the expectation of a `toThrowSassException`
 * call.
 */
function verifyThrown(
  thrown: unknown,
  {line, url, noUrl, includes}: ToThrowSassExceptionOptions
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
  } else if (line !== undefined && thrown.span.start?.line !== line) {
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
  } else if (includes && !thrown.sassMessage.includes(includes)) {
    return {
      message: () =>
        `expected sassMessage to contain ${includes}, was ` +
        `${thrown.sassMessage}:\n` +
        `${thrown}`,
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
  } else if (line !== undefined) {
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
