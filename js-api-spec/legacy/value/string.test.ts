// Copyright 2022 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import * as sass from 'sass';

import {parseValue} from './utils';

describe('from a parameter', () => {
  let string: sass.types.String;
  beforeEach(() => {
    string = parseValue('abc', sass.types.String);
  });

  it('provides access to its value', () => {
    expect(string.getValue()).toBe('abc');
    expect(parseValue('"abc"', sass.types.String).getValue()).toBe('abc');
  });

  it('the value can be set without affecting the underlying string', () =>
    expect(
      sass
        .renderSync({
          data: `
              a {
                $string: foo;
                b: foo($string);
                c: $string;
              }
            `,
          functions: {
            'foo($string)': arg => {
              const string = arg as sass.types.String;
              string.setValue('bar');
              expect(string.getValue()).toBe('bar');
              return string;
            },
          },
        })
        .css.toString()
    ).toEqualIgnoringWhitespace('a { b: bar; c: foo; }'));

  it('a quoted string becomes unquoted when its value is set', () =>
    expect(
      sass
        .renderSync({
          data: 'a {b: foo("foo")}',
          functions: {
            'foo($string)': arg => {
              const string = arg as sass.types.String;
              string.setValue('bar');
              expect(string.getValue()).toBe('bar');
              return string;
            },
          },
        })
        .css.toString()
    ).toEqualIgnoringWhitespace('a { b: bar; }'));

  it('has a useful .constructor.name', () =>
    expect(string.constructor.name).toBe('sass.types.String'));
});

describe('from a constructor', () => {
  it('is a string with the given value', () => {
    const string = new sass.types.String('foo');
    expect(string).toBeInstanceOf(sass.types.String);
    expect(string.getValue()).toBe('foo');
  });

  it('is unquoted', () =>
    expect(
      sass
        .renderSync({
          data: 'a {b: foo()}',
          functions: {
            'foo()': () => new sass.types.String('foo'),
          },
        })
        .css.toString()
    ).toEqualIgnoringWhitespace('a { b: foo; }'));

  it('has a useful .constructor.name', () =>
    expect(new sass.types.String('foo').constructor.name).toBe(
      'sass.types.String'
    ));
});
