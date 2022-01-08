// Copyright 2022 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import * as sass from 'sass';

import {skipForImpl} from '../../utils';
import {parseValue} from './utils';

skipForImpl('sass-embedded', () => {
  describe('from a parameter', () => {
    let map: sass.types.Map;
    beforeEach(() => {
      map = parseValue('(a: 2, 1: blue, red: b)', sass.types.Map);
    });

    it('provides access to its length', () => expect(map.getLength()).toBe(3));

    it('provides access to its keys', () => {
      expect(map.getKey(0)).toBeInstanceOf(sass.types.String);
      expect(map.getKey(1)).toBeInstanceOf(sass.types.Number);
      expect(map.getKey(2)).toBeInstanceOf(sass.types.Color);
    });

    it('provides access to its values', () => {
      expect(map.getValue(0)).toBeInstanceOf(sass.types.Number);
      expect(map.getValue(1)).toBeInstanceOf(sass.types.Color);
      expect(map.getValue(2)).toBeInstanceOf(sass.types.String);
    });

    it('throws on invalid key indices', () => {
      expect(() => map.getKey(-1)).toThrow();
      expect(() => map.getKey(4)).toThrow();
    });

    it('throws on invalid value indices', () => {
      expect(() => map.getValue(-1)).toThrow();
      expect(() => map.getValue(4)).toThrow();
    });

    it('values can be set without affecting the underlying map', () =>
      expect(
        sass
          .renderSync({
            data: `
            a {
              $map: (a: b, c: d, e: f);
              b: map-get(foo($map), c);
              c: map-get($map, c);
            }
          `,
            functions: {
              'foo($map)': arg => {
                const map = arg as sass.types.Map;
                map.setValue(1, new sass.types.Number(1));
                expect((map.getValue(1) as sass.types.Number).getValue()).toBe(
                  1
                );
                return map;
              },
            },
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: 1; c: d; }'));

    it('keys can be set without affecting the underlying map', () =>
      expect(
        sass
          .renderSync({
            data: `
            a {
              $map: (a: b, c: d, e: f);
              b: map-get(foo($map), 1);
              c: map-get($map, 1);
            }
          `,
            functions: {
              'foo($map)': arg => {
                const map = arg as sass.types.Map;
                map.setKey(1, new sass.types.Number(1));
                expect((map.getKey(1) as sass.types.Number).getValue()).toBe(1);
                return map;
              },
            },
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: d; }'));

    it('rejects a duplicate key', () =>
      expect(() => map.setKey(0, new sass.types.Number(1))).toThrow());

    it('allows an identical key', () => {
      map.setKey(0, new sass.types.String('a'));
      expect((map.getKey(0) as sass.types.String).getValue()).toBe('a');
    });

    it('has a useful .constructor.name', () =>
      expect(map.constructor.name).toBe('sass.types.Map'));
  });

  describe('from a constructor', () => {
    it('is a map with the given length', () => {
      const map = new sass.types.Map(3);
      expect(map).toBeInstanceOf(sass.types.Map);
      expect(map.getLength()).toBe(3);
    });

    it('is populated with default keys and values', () => {
      const map = new sass.types.Map(3);
      expect(map.getValue(0)).toBe(sass.types.Null.NULL);
      expect((map.getKey(0) as sass.types.Number).getValue()).toBe(0);
      expect(map.getValue(1)).toBe(sass.types.Null.NULL);
      expect((map.getKey(1) as sass.types.Number).getValue()).toBe(1);
      expect(map.getValue(2)).toBe(sass.types.Null.NULL);
      expect((map.getKey(2) as sass.types.Number).getValue()).toBe(2);
    });

    it('can have its keys set', () => {
      const map = new sass.types.Map(3);
      map.setKey(1, sass.types.Boolean.TRUE);
      expect(map.getKey(1)).toBe(sass.types.Boolean.TRUE);
    });

    it('can have its values set', () => {
      const map = new sass.types.Map(3);
      map.setValue(1, sass.types.Boolean.TRUE);
      expect(map.getValue(1)).toBe(sass.types.Boolean.TRUE);
    });

    it('has a useful .constructor.name', () =>
      expect(new sass.types.Map(3).constructor.name).toBe('sass.types.Map'));
  });
});
