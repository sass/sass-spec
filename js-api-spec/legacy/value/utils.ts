// Copyright 2022 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

/* eslint @typescript-eslint/no-explicit-any: ["error", { "ignoreRestArgs": true }] */

import * as sass from 'sass';

/**
 * Parses `source` as a Sass expression, asserts that it's an instance of
 * `constructor`, and returns it.
 */
export function parseValue<T>(
  source: string,
  constructor: new (...args: any[]) => T
): T {
  let value: T | undefined;

  const fn = jest.fn(value_ => {
    value = value_ as T;
    return sass.types.Null.NULL;
  });

  sass.renderSync({
    data: `a {b: foo((${source}))}`,
    functions: {'foo($value)': fn},
  });

  expect(fn).toHaveBeenCalled();
  expect(value).toBeInstanceOf(constructor);
  return value!;
}
