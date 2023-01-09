// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {
  CustomFunction,
  SassString,
  compileString,
  compileStringAsync,
  sassNull,
} from 'sass';

import './utils';

it('passes an argument to a custom function and uses its return value', () => {
  const fn = jest.fn(args => {
    expect(args).toHaveLength(1);
    expect(args[0].assertString().text).toBe('bar');
    return new SassString('result');
  });

  expect(
    compileString('a {b: foo(bar)}', {
      functions: {'foo($arg)': fn},
    }).css
  ).toBe('a {\n  b: "result";\n}');

  expect(fn).toBeCalled();
});

it('passes no arguments to a custom function', () => {
  const fn = jest.fn(args => {
    expect(args).toHaveLength(0);
    return sassNull;
  });

  expect(
    compileString('a {b: foo()}', {
      functions: {'foo()': fn},
    }).css
  ).toBe('');

  expect(fn).toBeCalled();
});

it('passes multiple arguments to a custom function', () => {
  const fn = jest.fn(args => {
    expect(args).toHaveLength(3);
    expect(args[0].assertString().text).toBe('x');
    expect(args[1].assertString().text).toBe('y');
    expect(args[2].assertString().text).toBe('z');
    return sassNull;
  });

  expect(
    compileString('a {b: foo(x, y, z)}', {
      functions: {'foo($arg1, $arg2, $arg3)': fn},
    }).css
  ).toBe('');

  expect(fn).toBeCalled();
});

it('passes a default argument value', () => {
  const fn = jest.fn(args => {
    expect(args).toHaveLength(1);
    expect(args[0].assertString().text).toBe('default');
    return sassNull;
  });

  expect(
    compileString('a {b: foo()}', {
      functions: {'foo($arg: default)': fn},
    }).css
  ).toBe('');

  expect(fn).toBeCalled();
});

describe('gracefully handles a custom function', () => {
  it('throwing', () => {
    expect(() =>
      compileString('a {b: foo()}', {
        functions: {
          'foo()': () => {
            throw 'heck';
          },
        },
      })
    ).toThrowSassException({line: 0});
  });

  it('not returning', () => {
    expect(() =>
      compileString('a {b: foo()}', {
        functions: {'foo()': (() => {}) as unknown as CustomFunction<'sync'>},
      })
    ).toThrowSassException({line: 0});
  });

  it('returning a non-Value', () => {
    expect(() =>
      compileString('a {b: foo()}', {
        functions: {
          'foo()': (() => 'wrong') as unknown as CustomFunction<'sync'>,
        },
      })
    ).toThrowSassException({line: 0});
  });
});

describe('dash-normalizes function calls', () => {
  it('when defined with dashes', () => {
    const fn = jest.fn(() => sassNull);

    expect(
      compileString('a {b: foo_bar()}', {
        functions: {'foo-bar()': fn},
      }).css
    ).toBe('');

    expect(fn).toBeCalled();
  });

  it('when defined with underscores', () => {
    const fn = jest.fn(() => sassNull);

    expect(
      compileString('a {b: foo-bar()}', {
        functions: {'foo_bar()': fn},
      }).css
    ).toBe('');

    expect(fn).toBeCalled();
  });
});

describe('asynchronously', () => {
  it('passes an argument to a custom function and uses its return value', async () => {
    const fn = jest.fn(args => {
      expect(args).toHaveLength(1);
      expect(args[0].assertString().text).toBe('bar');
      return Promise.resolve(new SassString('result'));
    });

    await expect(
      compileStringAsync('a {b: foo(bar)}', {
        functions: {'foo($arg)': fn},
      })
    ).resolves.toMatchObject({css: 'a {\n  b: "result";\n}'});

    expect(fn).toBeCalled();
  });

  it('gracefully handles promise rejections', async () => {
    await expect(() =>
      compileStringAsync('a {b: foo(bar)}', {
        functions: {'foo($arg)': () => Promise.reject('heck')},
      })
    ).toThrowSassException({line: 0});
  });
});

describe('rejects a function signature that', () => {
  it('is empty', () => {
    expect(() =>
      compileString('', {functions: {'': () => sassNull}})
    ).toThrow();
  });

  it('has no name', () => {
    expect(() =>
      compileString('', {functions: {'()': () => sassNull}})
    ).toThrow();
  });

  it('has no arguments', () => {
    expect(() =>
      compileString('', {functions: {foo: () => sassNull}})
    ).toThrow();
  });

  it('has invalid arguments', () => {
    expect(() =>
      compileString('', {functions: {'foo(arg)': () => sassNull}})
    ).toThrow();
  });

  it('has no closing parentheses', () => {
    expect(() =>
      compileString('', {functions: {'foo(': () => sassNull}})
    ).toThrow();
  });

  it('has a non-identifier name', () => {
    expect(() =>
      compileString('', {functions: {'$foo()': () => sassNull}})
    ).toThrow();
  });

  it('has whitespace before the signature', () => {
    expect(() =>
      compileString('', {functions: {' foo()': () => sassNull}})
    ).toThrow();
  });

  it('has whitespace after the signature', () => {
    expect(() =>
      compileString('', {functions: {'foo() ': () => sassNull}})
    ).toThrow();
  });

  it('has whitespace between the identifier and the arguments', () => {
    expect(() =>
      compileString('', {functions: {'foo ()': () => sassNull}})
    ).toThrow();
  });
});
