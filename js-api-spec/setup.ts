// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import immutable from 'immutable';
import * as sass from 'sass';
import * as util from 'util';
import type {URL} from 'url';
import 'jasmine-expect';

declare global {
  /* eslint-disable-next-line @typescript-eslint/no-namespace */
  namespace jasmine {
    interface Matchers<T> {
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
      }): T;

      /**
       * Matches a callback that throws a `sass.Exception` with a span that has
       * no URL.
       */
      toThrowSassException(object: {line?: number; noUrl: boolean}): T;

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
      }): T;

      /**
       * Matches a value that's `.equal()` to and has the same `.hashCode()` as
       * `value`.
       */
      toEqualWithHash(value: immutable.ValueObject): T;

      /**
       * Matches a number that is equal to `value` using `SassNumber.equals()`.
       */
      toFuzzyEqual(value: number): T;

      /**
       * Matches a number that is equal to `value` to 5 decimal places.
       */
      toLooselyEqual(value: number): T;

      /**
       * Matches a SassColor where each channel in `value` is equal to 5 decimal
       * places.
       */
      toLooselyEqualColor(value: sass.SassColor): T;

      /**
       * Matches an array against an Immutable List. Non-numeric values are
       * exactly matched, and numbers are fuzzy matched using
       * `SassNumber.equals()`.
       */
      toFuzzyEqualList(value: unknown[]): T;

      /**
       * Matches a value that's `null` or `undefined`.
       */
      toBeNil(): T;

      /**
       * Matches a value that's equal (`===`) to `value` ignoring whitespace.
       */
      toEqualIgnoringWhitespace(value: string): T;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface AsyncMatchers<T, U> {
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
      }): PromiseLike<T>;

      /**
       * Matches a callback that throws a `sass.Exception` with a span that has
       * no URL.
       */
      toThrowSassException(object: {
        line?: number;
        noUrl: boolean;
      }): PromiseLike<T>;
    }
  }
}

interface ToThrowSassExceptionOptions {
  line?: number;
  url?: string | URL;
  noUrl?: boolean;
  includes?: string;
}

const toThrowSassException = (
  received: unknown,
  options: ToThrowSassExceptionOptions = {}
) => {
  if (typeof received !== 'function') {
    throw new Error('Received value must be a function');
  }

  try {
    received();
  } catch (thrown: unknown) {
    return verifyThrown(thrown, options);
  }

  return {
    message: `expected ${received} to throw`,
    pass: false,
  };
};

const toThrowSassExceptionAsync = (
  received: unknown,
  options: ToThrowSassExceptionOptions = {}
) => {
  if (typeof received !== 'function') {
    throw new Error('Received value must be a function');
  }

  try {
    const result = received();
    return result.then(
      () => ({
        message: `expected ${received} to throw`,
        pass: false,
      }),
      (thrown: unknown) => verifyThrown(thrown, options)
    );
  } catch (thrown: unknown) {
    return verifyThrown(thrown, options);
  }
};

const toThrowLegacyException = (
  received: unknown,
  options: {line?: number; file?: string; includes?: string} = {}
) => {
  if (typeof received !== 'function') {
    throw new Error('Received value must be a function');
  }

  try {
    received();
  } catch (thrown: unknown) {
    if (typeof thrown !== 'object' || thrown === null) {
      return {
        message: `expected ${thrown} to be an object`,
        pass: false,
      };
    } else if (!('formatted' in thrown)) {
      return {
        message: `expected ${thrown} to have a 'formatted' field`,
        pass: false,
      };
    } else if (!('status' in thrown)) {
      return {
        message: `expected ${thrown} to have a 'status' field`,
        pass: false,
      };
    }

    if (options?.line !== undefined) {
      if (!('line' in thrown)) {
        return {
          message: `expected ${thrown} to have a 'line' field`,
          pass: false,
        };
      } else if ((thrown as {line: unknown}).line !== options.line) {
        return {
          message:
            `expected exception.line to be ${options.line}, was ` +
            `${(thrown as {line: unknown}).line}`,
          pass: false,
        };
      }
    }

    if (options?.file !== undefined) {
      if (!('file' in thrown)) {
        return {
          message: `expected ${thrown} to have a 'file' field`,
          pass: false,
        };
      } else if ((thrown as {file: unknown}).file !== options.file) {
        return {
          message:
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
        message:
          `expected exception.toString() to contain "${options.includes}", ` +
          `was "${thrown}"`,
        pass: false,
      };
    }

    if (options?.line !== undefined) {
      return {
        message: `expected exception.line not to be ${options.line}`,
        pass: true,
      };
    } else if (options?.file !== undefined) {
      return {
        message: `expected exception.file not to be "${options.file}"`,
        pass: true,
      };
    } else if (options?.includes !== undefined) {
      return {
        message:
          'expected exception.toString() not to contain ' +
          `"${options.includes}"`,
        pass: true,
      };
    } else {
      return {
        message: 'expected callback not to throw a LegacyException',
        pass: true,
      };
    }
  }

  return {
    message: `expected ${received} to throw`,
    pass: false,
  };
};

const toEqualWithHash = (received: unknown, actual: immutable.ValueObject) => {
  if (typeof received !== 'object' || received === null) {
    return {
      message: `expected ${util.inspect(received)} to be an object`,
      pass: false,
    };
  } else if (
    !('equals' in received) ||
    typeof (received as {equals: unknown}).equals !== 'function'
  ) {
    return {
      message: `expected ${util.inspect(received)} to have an "equals" method`,
      pass: false,
    };
  } else if (
    !('hashCode' in received) ||
    typeof (received as {hashCode: unknown}).hashCode !== 'function'
  ) {
    return {
      message: `expected ${util.inspect(received)} to have a "hashCode" method`,
      pass: false,
    };
  }

  const receivedValue = received as immutable.ValueObject;
  if (!receivedValue.equals(actual)) {
    return {
      message: `expected ${received} to be .equal() to ${actual}`,
      pass: false,
    };
  } else if (receivedValue.hashCode() !== actual.hashCode()) {
    return {
      message: `expected ${received} to have the same .hashCode() as ${actual}`,
      pass: false,
    };
  } else {
    return {
      message: `expected ${received} not to be .equal() to ${actual}`,
      pass: true,
    };
  }
};

const toBeNil = (received: unknown) => {
  return {
    message: `expected ${received} to be null or undefined`,
    pass: received === null || received === undefined,
  };
};

const removeWhitespace = (str: string) => str.trim().replace(/\s+/g, '');

const toEqualIgnoringWhitespace = (received: unknown, actual: string) => {
  if (typeof received !== 'string') {
    throw new Error('Received value must be a string');
  }
  return {
    message: `expected ${received} to equal ${actual} ignoring whitespace`,
    pass: removeWhitespace(actual) === removeWhitespace(received),
  };
};

const toFuzzyEqual = (received: unknown, actual: number) => {
  if (typeof received !== 'number') {
    throw new Error('Received value must be a number');
  }
  return {
    message: `expected ${received} to fuzzy equal ${actual}`,
    pass: new sass.SassNumber(received).equals(new sass.SassNumber(actual)),
  };
};

const toLooselyEqual = (received: unknown, actual: number) => {
  if (typeof received !== 'number') {
    throw new Error('Received value must be a number');
  }
  return {
    message: `expected ${received} to loosely equal ${actual} to 5 decimal places`,
    pass: Math.round((received * 10) ^ 5) === Math.round((actual * 10) ^ 5),
  };
};

const toLooselyEqualColor = (received: unknown, actual: sass.SassColor) => {
  function isSassColor(item: unknown): item is sass.SassColor {
    return !!(item as sass.SassColor).assertColor();
  }
  if (!isSassColor(received)) {
    throw new Error('Received value must be a SassColor');
  }
  const unequalIndices: number[] = [];
  received.channelsOrNull.forEach((channel: number | null, index: number) => {
    const actualChannel = actual.channelsOrNull.get(index);
    if (channel === null) {
      if (actualChannel !== null) unequalIndices.push(index);
    } else if (
      actualChannel === null ||
      Math.round((channel * 10) ^ 5) !== Math.round((actualChannel * 10) ^ 5)
    ) {
      unequalIndices.push(index);
    }
  });
  return {
    message: `expected ${received} to loosely equal ${actual} to 5 decimal places, but indices ${unequalIndices.join(
      ','
    )} differ`,
    pass: unequalIndices.length === 0,
  };
};

const toFuzzyEqualList = (received: unknown, actual: unknown[]) => {
  if (!immutable.List.isList(received)) {
    throw new Error('Received value must be an Immutuable List');
  }
  if (received.count() !== actual.length) {
    return {
      pass: false,
      message: `expected List to have length ${
        actual.length
      }, received ${received.count()}`,
    };
  }
  let pass = true;
  let message = '';
  received.forEach((receivedItem, index) => {
    const actualItem = actual[index];
    if (!pass) return;
    if (typeof receivedItem !== typeof actualItem) {
      pass = false;
      message = `expected ${receivedItem} to be the same type as ${actual[index]} at index ${index}`;
    }
    if (typeof receivedItem === 'number' && typeof actualItem === 'number') {
      pass = new sass.SassNumber(receivedItem).equals(
        new sass.SassNumber(actualItem)
      );
      message = `expected ${receivedItem} to fuzzy equal ${actual[index]} at index ${index}`;
    } else {
      pass = receivedItem === actualItem;
      message = `expected non-numeric ${receivedItem} to exactly equal ${actual[index]} at index ${index}`;
    }
  });
  return {
    message,
    pass,
  };
};

// Add custom matchers to Jasmine
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
    toBeNil: () => ({
      compare: toBeNil,
    }),
    toEqualIgnoringWhitespace: () => ({
      compare: toEqualIgnoringWhitespace,
    }),
    toFuzzyEqual: () => ({
      compare: toFuzzyEqual,
    }),
    toLooselyEqual: () => ({
      compare: toLooselyEqual,
    }),
    toLooselyEqualColor: () => ({
      compare: toLooselyEqualColor,
    }),
    toFuzzyEqualList: () => ({
      compare: toFuzzyEqualList,
    }),
  });
  jasmine.addAsyncMatchers({
    toThrowSassException: () => ({
      compare: toThrowSassExceptionAsync,
    }),
  });
});

function isSassException(thrown: unknown): thrown is sass.Exception {
  return thrown instanceof sass.Exception;
}

/**
 * Verifies that `thrown` matches the expectation of a `toThrowSassException`
 * call.
 */
function verifyThrown(
  thrown: unknown,
  {line, url, noUrl, includes}: ToThrowSassExceptionOptions
) {
  if (!isSassException(thrown)) {
    return {
      message: `expected ${thrown} to be a sass.Exception`,
      pass: false,
    };
  } else if (url && thrown.span.url?.toString() !== url.toString()) {
    return {
      message: `expected ${url}, was ${thrown.span.url}:\n${thrown}`,
      pass: false,
    };
  } else if (noUrl && thrown.span.url) {
    return {
      message: `expected no URL:\n${thrown}`,
      pass: false,
    };
  } else if (line !== undefined && thrown.span.start?.line !== line) {
    return {
      message:
        `expected to start on line ${line}, was ` +
        `${thrown.span.start?.line}:\n` +
        `${thrown}`,
      pass: false,
    };
  } else if (!thrown.sassMessage) {
    return {
      message: `expected a sassMessage field:\n${thrown}`,
      pass: false,
    };
  } else if (includes && !thrown.sassMessage.includes(includes)) {
    return {
      message:
        `expected sassMessage to contain ${includes}, was ` +
        `${thrown.sassMessage}:\n` +
        `${thrown}`,
      pass: false,
    };
  } else if (!thrown.sassStack) {
    return {
      message: `expected a sassStack field:\n${thrown}`,
      pass: false,
    };
  } else if (url) {
    return {
      message: `expected not ${url}:\n${thrown}`,
      pass: true,
    };
  } else if (noUrl) {
    return {
      message: `expected a URL:\n${thrown}`,
      pass: true,
    };
  } else if (line !== undefined) {
    return {
      message: `expected not to start on line ${line}:\n${thrown}`,
      pass: true,
    };
  } else {
    return {
      message: `expected not to throw a sass.Exception:\n${thrown}`,
      pass: true,
    };
  }
}
