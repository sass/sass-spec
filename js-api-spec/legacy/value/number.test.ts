// Copyright 2022 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import * as sass from 'sass';

import '../../utils';
import {parseValue} from './utils';

describe('from a parameter', () => {
  let number: sass.types.Number;
  beforeEach(() => {
    number = parseValue('1px', sass.types.Number);
  });

  it('provides access to its value and unit', () => {
    expect(number.getValue()).toBe(1);
    expect(number.getUnit()).toBe('px');
  });

  it('a unitless number returns the empty string', () =>
    expect(parseValue('1', sass.types.Number).getUnit()).toBeEmpty());

  it('a complex unit number returns its full units', () =>
    expect(
      parseValue('calc(1px*1ms/1rad/1dpi)', sass.types.Number).getUnit()
    ).toBe('px*ms/rad*dpi'));

  it('a denominator-only unit starts with /', () =>
    expect(parseValue('calc(1/1px)', sass.types.Number).getUnit()).toBe('/px'));

  it('the value can be set without affecting the underlying number', () =>
    expect(
      sass
        .renderSync({
          data: `
              a {
                $number: 1px;
                b: foo($number);
                c: $number
              }
            `,
          functions: {
            'foo($number)': arg => {
              const number = arg as sass.types.Number;
              number.setValue(42);
              expect(number.getValue()).toBe(42);
              return number;
            },
          },
        })
        .css.toString()
    ).toEqualIgnoringWhitespace('a { b: 42px; c: 1px; }'));

  it('the unit can be set without affecting the underlying number', () =>
    expect(
      sass
        .renderSync({
          data: `
              a {
                $number: 1px;
                b: foo($number);
                c: $number
              }
            `,
          functions: {
            'foo($number)': arg => {
              const number = arg as sass.types.Number;
              number.setUnit('em');
              expect(number.getUnit()).toBe('em');
              return number;
            },
          },
        })
        .css.toString()
    ).toEqualIgnoringWhitespace('a { b: 1em; c: 1px; }'));

  it('the unit can be set to a complex unit', () =>
    expect(
      sass
        .renderSync({
          data: 'a {b: calc(foo(1)*1ms*1dpi/1rad)}',
          functions: {
            'foo($number)': arg => {
              const number = arg as sass.types.Number;
              number.setUnit('px*rad/ms*dpi');
              expect(number.getUnit()).toBe('px*rad/ms*dpi');
              return number;
            },
          },
        })
        .css.toString()
    ).toEqualIgnoringWhitespace('a { b: 1px; }'));

  it('the unit can be set to denominator-only', () =>
    expect(
      sass
        .renderSync({
          data: 'a {b: foo(1)*1em}',
          functions: {
            'foo($number)': arg => {
              const number = arg as sass.types.Number;
              number.setUnit('/em');
              expect(number.getUnit()).toBe('/em');
              return number;
            },
          },
        })
        .css.toString()
    ).toEqualIgnoringWhitespace('a { b: 1; }'));

  it('the unit can be unset', () =>
    expect(
      sass
        .renderSync({
          data: 'a {b: unitless(foo(1px))}',
          functions: {
            'foo($number)': arg => {
              const number = arg as sass.types.Number;
              number.setUnit('');
              expect(number.getUnit()).toBeEmpty();
              return number;
            },
          },
        })
        .css.toString()
    ).toEqualIgnoringWhitespace('a { b: true; }'));

  it('rejects invalid unit formats', () => {
    expect(() => number.setUnit('*')).toThrow();
    expect(() => number.setUnit('/')).toThrow();
    expect(() => number.setUnit('px*')).toThrow();
    expect(() => number.setUnit('px/')).toThrow();
    expect(() => number.setUnit('*px')).toThrow();
    expect(() => number.setUnit('px/deg/ms')).toThrow();
  });

  it('has a useful .constructor.name', () =>
    expect(number.constructor.name).toBe('sass.types.Number'));
});

describe('from a constructor', () => {
  it('is a number with the given value and units', () => {
    const number = new sass.types.Number(123, 'px');
    expect(number).toBeInstanceOf(sass.types.Number);
    expect(number.getValue()).toBe(123);
    expect(number.getUnit()).toBe('px');
  });

  it('defaults to no unit', () =>
    expect(new sass.types.Number(123).getUnit()).toBeEmpty());

  it('allows complex units', () =>
    expect(
      sass
        .renderSync({
          data: 'a {b: calc(foo()*1ms*1dpi/1rad)}',
          functions: {
            'foo()': () => {
              const number = new sass.types.Number(1, 'px*rad/ms*dpi');
              number.setUnit('px*rad/ms*dpi');
              expect(number.getUnit()).toBe('px*rad/ms*dpi');
              return number;
            },
          },
        })
        .css.toString()
    ).toEqualIgnoringWhitespace('a { b: 1px; }'));

  it('has a useful .constructor.name', () =>
    expect(new sass.types.Number(123).constructor.name).toBe(
      'sass.types.Number'
    ));
});
