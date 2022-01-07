// Copyright 2022 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import * as sass from 'sass';

import {skipForImpl} from '../../utils';
import {parseValue} from './utils';

skipForImpl('sass-embedded', () => {
  describe('an argument list', () => {
    let args: sass.types.List;
    beforeEach(() =>
      sass.renderSync({
        data: "a {b: foo(1, 'a', blue)}",
        functions: {
          'foo($args...)': args_ => {
            args = args_ as sass.types.List;
            return sass.types.Null.NULL;
          },
        },
      })
    );

    it('provides access to the list attributes', () => {
      expect(args.getLength()).toBe(3);
      expect(args.getSeparator()).toBeTrue();
      expect(args.getValue(0)).toBeInstanceOf(sass.types.Number);
      expect(args.getValue(1)).toBeInstanceOf(sass.types.String);
      expect(args.getValue(2)).toBeInstanceOf(sass.types.Color);
    });

    it('has a useful .constructor.name', () =>
      expect(args.constructor.name).toBe('sass.types.List'));
  });

  describe('a list', () => {
    describe('from a parameter', () => {
      let list: sass.types.List;
      beforeEach(() => {
        list = parseValue("1, 'a', blue", sass.types.List);
      });

      it('provides access to its length', () =>
        expect(list.getLength()).toBe(3));

      it('provides access to its contents', () => {
        expect(list.getValue(0)).toBeInstanceOf(sass.types.Number);
        expect(list.getValue(1)).toBeInstanceOf(sass.types.String);
        expect(list.getValue(2)).toBeInstanceOf(sass.types.Color);
      });

      it('provides access to the separator type', () => {
        expect(list.getSeparator()).toBeTrue();
        expect(parseValue('1 2 3', sass.types.List).getSeparator()).toBeFalse();
      });

      it('throws on invalid indices', () => {
        expect(() => list.getValue(-1)).toThrow();
        expect(() => list.getValue(4)).toThrow();
      });

      it('values can be set without affecting the underlying list', () =>
        expect(
          sass
            .renderSync({
              data: `
                a {
                  $list: 1 2 3;
                  b: foo($list);
                  c: $list;
                }
              `,
              functions: {
                'foo($list)': arg => {
                  const list = arg as sass.types.List;
                  list.setValue(1, sass.types.Null.NULL);
                  expect(list.getValue(1)).toBe(sass.types.Null.NULL);
                  return list;
                },
              },
            })
            .css.toString()
        ).toEqualIgnoringWhitespace('a { b: 1 3; c: 1 2 3; }'));

      it('the separator can be set without affecting the underlying list', () =>
        expect(
          sass
            .renderSync({
              data: `
                a {
                  $list: 1 2 3;
                  b: foo($list);
                  c: $list;
                }
              `,
              functions: {
                'foo($list)': arg => {
                  const list = arg as sass.types.List;
                  list.setSeparator(true);
                  expect(list.getSeparator()).toBeTrue();
                  return list;
                },
              },
            })
            .css.toString()
        ).toEqualIgnoringWhitespace('a { b: 1, 2, 3; c: 1 2 3; }'));

      it(
        'lists with undefined separators are reported as having space ' +
          'separators',
        () => {
          expect(parseValue('()', sass.types.List).getSeparator()).toBeFalse();
          expect(
            parseValue('join((), 1px)', sass.types.List).getSeparator()
          ).toBeFalse();
        }
      );

      it('has a useful .constructor.name', () =>
        expect(list.constructor.name).toBe('sass.types.List'));
    });

    describe('from a constructor', () => {
      it('is a list with the given length', () => {
        const list = new sass.types.List(3);
        expect(list).toBeInstanceOf(sass.types.List);
        expect(list.getLength()).toBe(3);
      });

      it('is populated with nulls', () => {
        const list = new sass.types.List(3);
        expect(list.getValue(0)).toBe(sass.types.Null.NULL);
        expect(list.getValue(1)).toBe(sass.types.Null.NULL);
        expect(list.getValue(2)).toBe(sass.types.Null.NULL);
      });

      it('can have its values set', () => {
        const list = new sass.types.List(3);
        list.setValue(1, sass.types.Boolean.TRUE);
        expect(list.getValue(1)).toBe(sass.types.Boolean.TRUE);
      });

      it('defaults to comma-separated', () =>
        expect(new sass.types.List(3).getSeparator()).toBeTrue());

      it('can be space-separated', () =>
        expect(new sass.types.List(3, false).getSeparator()).toBeFalse());

      it('has a useful .constructor.name', () =>
        expect(new sass.types.List(3).constructor.name).toBe(
          'sass.types.List'
        ));
    });
  });
});
