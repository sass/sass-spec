// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {SassFunction, SassNumber, compileString, sassNull} from 'sass';

import '../utils';

it('can round-trip a function reference from Sass', () => {
  const fn = jest.fn(args => {
    expect(args).toHaveLength(1);
    expect(args[0]).toBeInstanceOf(SassFunction);
    return args[0];
  });

  expect(
    compileString(
      `
      @use 'sass:meta';

      @function plusOne($n) {@return $n + 1}
      a {b: meta.call(foo(meta.get-function('plusOne')), 2)}
    `,
      {
        functions: {'foo($arg)': fn},
      }
    ).css
  ).toBe('a {\n  b: 3;\n}');

  expect(fn).toBeCalled();
});

it('can call a function reference from JS', () => {
  const fn = jest.fn(args => {
    expect(args).toHaveLength(0);
    return new SassFunction('plusOne($n)', args => {
      expect(args).toHaveLength(1);
      expect(args[0].assertNumber().value).toBe(2);
      return new SassNumber(args[0].assertNumber().value + 1);
    });
  });

  expect(
    compileString(
      `
      @use 'sass:meta';

      a {b: meta.call(foo(), 2)}
    `,
      {
        functions: {'foo()': fn},
      }
    ).css
  ).toBe('a {\n  b: 3;\n}');

  expect(fn).toBeCalled();
});

describe('rejects a function signature that', () => {
  // Note that an implementation is allowed to throw an error either when the
  // function is instantiated *or* when it's returned from the custom function
  // callback. This test works in either case.
  function rejectsSignature(signature: string): void {
    const fn = jest.fn(() => new SassFunction(signature, () => sassNull));

    expect(() =>
      compileString('a {b: inspect(foo())}', {
        functions: {'foo()': fn},
      })
    ).toThrowSassException({line: 0});

    expect(fn).toBeCalled();
  }

  it('is empty', () => rejectsSignature(''));
  it('has no name', () => rejectsSignature('()'));
  it('has no arguments', () => rejectsSignature('foo'));
  it('has invalid arguments', () => rejectsSignature('foo(arg)'));
  it('has an invalid default value', () => rejectsSignature('foo($arg: <>)'));
  it('has no closing parenthesis', () => rejectsSignature('foo('));
  it('has a non-identifier name', () => rejectsSignature('$foo()'));
});
