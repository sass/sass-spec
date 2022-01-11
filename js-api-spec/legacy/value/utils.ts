// Copyright 2022 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import * as sass from 'sass';

/**
 * Parses `source` as a Sass expression, asserts that it's an instance of
 * `constructor`, and returns it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseValue<T extends new (...args: any[]) => any>(
  source: string,
  constructor: T
): InstanceType<T> {
  let value: InstanceType<T> | undefined;

  const fn = jest.fn(value_ => {
    value = value_ as InstanceType<T>;
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
