// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {SassMixin, compileString, Value} from 'sass';

import {spy} from '../utils';

it('can round-trip a mixin reference from Sass', () => {
  const fn = spy(args => {
    expect(args).toBeArrayOfSize(1);
    const value = args[0];
    expect(value).toBeInstanceOf(SassMixin);
    expect(value.assertCalculation).toThrow();
    expect(value.assertColor).toThrow();
    expect(value.assertFunction).toThrow();
    expect(value.assertMap).toThrow();
    expect(value.tryMap()).toBe(null);
    expect(value.assertMixin()).toBe(value);
    expect(value.assertNumber).toThrow();
    expect(value.assertString).toThrow();

    return value;
  });

  expect(
    compileString(
      `
      @use 'sass:meta';

      @mixin a() {
        a {
          b: c;
        }
      }

      @include meta.apply(foo(meta.get-mixin('a')));
    `,
      {
        functions: {'foo($arg)': fn},
      }
    ).css
  ).toBe('a {\n  b: c;\n}');

  expect(fn).toHaveBeenCalled();
});

it('rejects a compiler mixin from a different compilation', () => {
  let a: Value | undefined;
  compileString(
    `
      @use 'sass:meta';

      @mixin a() {
        a {
          b: c;
        }
      }

      @include meta.apply(foo(meta.get-mixin('a')));
    `,
    {
      functions: {
        'foo($arg)': (args: Value[]) => {
          a = args[0];
          return a;
        },
      },
    }
  );

  let b;
  expect(() => {
    compileString(
      `
        @use 'sass:meta';

        @mixin b() {
          c {
            d: e;
          }
        }
        @include meta.apply(foo(meta.get-mixin('b')));
      `,
      {
        functions: {
          'foo($arg)': (args: Value[]) => {
            b = args[0];
            return a!;
          },
        },
      }
    );
  }).toThrowSassException({line: 8});

  expect(a).not.toEqual(b);
});
