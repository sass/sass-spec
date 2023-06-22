// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {
  CustomFunction,
  SassString,
  compileString,
  compileStringAsync,
  sassNull,
  sassTrue,
  sassFalse,
  SassNumber,
  SassCalculation,
  CalculationOperation,
} from 'sass';

import {spy} from './utils';

it('passes an argument to a custom function and uses its return value', () => {
  const fn = spy(args => {
    expect(args).toBeArrayOfSize(1);
    expect(args[0].assertString().text).toBe('bar');
    return new SassString('result');
  });

  expect(
    compileString('a {b: foo(bar)}', {
      functions: {'foo($arg)': fn},
    }).css
  ).toBe('a {\n  b: "result";\n}');

  expect(fn).toHaveBeenCalled();
});

it('passes no arguments to a custom function', () => {
  const fn = spy(args => {
    expect(args).toBeArrayOfSize(0);
    return sassNull;
  });

  expect(
    compileString('a {b: foo()}', {
      functions: {'foo()': fn},
    }).css
  ).toBe('');

  expect(fn).toHaveBeenCalled();
});

it('passes multiple arguments to a custom function', () => {
  const fn = spy(args => {
    expect(args).toBeArrayOfSize(3);
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

  expect(fn).toHaveBeenCalled();
});

it('passes a default argument value', () => {
  const fn = spy(args => {
    expect(args).toBeArrayOfSize(1);
    expect(args[0].assertString().text).toBe('default');
    return sassNull;
  });

  expect(
    compileString('a {b: foo()}', {
      functions: {'foo($arg: default)': fn},
    }).css
  ).toBe('');

  expect(fn).toHaveBeenCalled();
});

describe('simplifies', () => {
  it('operations', () => {
    const fn = spy(
      () =>
        new CalculationOperation(
          '+',
          new CalculationOperation('-', new SassNumber(10), new SassNumber(8)),
          new CalculationOperation('*', new SassNumber(2), new SassNumber(3))
        )
    );

    expect(
      compileString('a {b: foo()}', {
        functions: {'foo()': fn},
      }).css
    ).toBe('a {\n  b: 8;\n}');
  });

  it('calc()', () => {
    const fn = spy(() =>
      SassCalculation.calc(
        new CalculationOperation('+', new SassNumber(1), new SassNumber(2))
      )
    );

    expect(
      compileString('a {b: foo()}', {
        functions: {'foo()': fn},
      }).css
    ).toBe('a {\n  b: 3;\n}');
  });

  it('clamp()', () => {
    const fn = spy(() =>
      SassCalculation.clamp(
        new SassNumber(1),
        new SassNumber(2),
        new SassNumber(3)
      )
    );

    expect(
      compileString('a {b: foo()}', {
        functions: {'foo()': fn},
      }).css
    ).toBe('a {\n  b: 2;\n}');
  });

  it('min()', () => {
    const fn = spy(() =>
      SassCalculation.min([new SassNumber(1), new SassNumber(2)])
    );

    expect(
      compileString('a {b: foo()}', {
        functions: {'foo()': fn},
      }).css
    ).toBe('a {\n  b: 1;\n}');
  });

  it('max()', () => {
    const fn = spy(() =>
      SassCalculation.max([new SassNumber(1), new SassNumber(2)])
    );

    expect(
      compileString('a {b: foo()}', {
        functions: {'foo()': fn},
      }).css
    ).toBe('a {\n  b: 2;\n}');
  });

  it('complex calculations', () => {
    const fn = spy(() =>
      SassCalculation.calc(
        new CalculationOperation(
          '+',
          SassCalculation.min([new SassNumber(3), new SassNumber(4)]),
          new CalculationOperation(
            '*',
            SassCalculation.max([new SassNumber(5), new SassNumber(6)]),
            new CalculationOperation(
              '-',
              new SassNumber(3),
              new CalculationOperation(
                '/',
                new SassNumber(4),
                new SassNumber(5)
              )
            )
          )
        )
      )
    );

    expect(
      compileString('a {b: foo()}', {
        functions: {'foo()': fn},
      }).css
    ).toBe('a {\n  b: 16.2;\n}');
  });
});

const primitiveValues = [
  new SassString('quoted', {quotes: true}),
  new SassString('unquoted', {quotes: false}),
  new SassNumber(1),
  sassTrue,
  sassFalse,
];
describe('does not simplify', () => {
  for (const value of primitiveValues) {
    it(value.toString(), () => {
      const fn = spy(() => value);
      expect(
        compileString('a {b: foo()}', {
          functions: {'foo()': fn},
        }).css
      ).toBe(`a {\n  b: ${value.toString()};\n}`);
    });
  }
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
    const fn = spy(() => sassNull);

    expect(
      compileString('a {b: foo_bar()}', {
        functions: {'foo-bar()': fn},
      }).css
    ).toBe('');

    expect(fn).toHaveBeenCalled();
  });

  it('when defined with underscores', () => {
    const fn = spy(() => sassNull);

    expect(
      compileString('a {b: foo-bar()}', {
        functions: {'foo_bar()': fn},
      }).css
    ).toBe('');

    expect(fn).toHaveBeenCalled();
  });
});

describe('asynchronously', () => {
  it('passes an argument to a custom function and uses its return value', async () => {
    const fn = spy(args => {
      expect(args).toBeArrayOfSize(1);
      expect(args[0].assertString().text).toBe('bar');
      return Promise.resolve(new SassString('result'));
    });

    const result = await compileStringAsync('a {b: foo(bar)}', {
      functions: {'foo($arg)': fn},
    });

    expect(result.css).toBe('a {\n  b: "result";\n}');
    expect(fn).toHaveBeenCalled();
  });

  it('gracefully handles promise rejections', async () => {
    await expectAsync(() =>
      compileStringAsync('a {b: foo(bar)}', {
        functions: {'foo($arg)': () => Promise.reject('heck')},
      })
    ).toThrowSassException({line: 0});
  });

  it('simplifies', async () => {
    const fn = spy(async () =>
      SassCalculation.calc(
        new CalculationOperation('+', new SassNumber(1), new SassNumber(2))
      )
    );

    const result = await compileStringAsync('a {b: foo()}', {
      functions: {'foo()': fn},
    });
    expect(result.css).toBe('a {\n  b: 3;\n}');
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
