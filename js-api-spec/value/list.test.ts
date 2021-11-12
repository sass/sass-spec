// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {Value, SassList, SassMap, SassNumber, SassString} from 'sass';
import {List} from 'immutable';

import {skipForImpl} from '../utils';

skipForImpl('dart-sass', () => {
  describe('SassList', () => {
    describe('construction', () => {
      let list: SassList;
      beforeEach(() => {
        list = new SassList(
          [new SassString('a'), new SassString('b'), new SassString('c')],
          {separator: ','}
        );
      });

      it('is a value', () => {
        expect(list).toBeInstanceOf(Value);
      });

      it('is a list', () => {
        expect(list).toBeInstanceOf(SassList);
      });

      it("isn't any other type", () => {
        expect(() => list.assertBoolean()).toThrow();
        expect(() => list.assertColor()).toThrow();
        expect(() => list.assertFunction()).toThrow();
        expect(() => list.assertMap()).toThrow();
        expect(list.tryMap()).toBe(null);
        expect(() => list.assertNumber()).toThrow();
        expect(() => list.assertString()).toThrow();
      });

      it('returns its contents as a list', () => {
        expect(
          list.asList.equals(
            List([
              new SassString('a'),
              new SassString('b'),
              new SassString('c'),
            ])
          )
        ).toBe(true);
      });
    });

    describe('equality', () => {
      let list: SassList;
      beforeEach(() => {
        list = new SassList(
          [new SassString('a'), new SassString('b'), new SassString('c')],
          {separator: ','}
        );
      });

      it('equals the same list', () => {
        expect(list).toEqualWithHash(
          new SassList(
            [new SassString('a'), new SassString('b'), new SassString('c')],
            {separator: ','}
          )
        );
      });

      it("doesn't equal the same list with a different ordering", () => {
        expect(
          list.equals(
            new SassList(
              [new SassString('c'), new SassString('b'), new SassString('a')],
              {separator: ','}
            )
          )
        ).toBe(false);
      });

      it("doesn't equal a list with different metadata", () => {
        expect(
          list.equals(
            new SassList(
              [new SassString('a'), new SassString('b'), new SassString('c')],
              {separator: ' '}
            )
          )
        ).toBe(false);

        expect(
          list.equals(
            new SassList(
              [new SassString('a'), new SassString('b'), new SassString('c')],
              {separator: ',', brackets: true}
            )
          )
        ).toBe(false);
      });

      it("doesn't equal a list with different contents", () => {
        expect(
          list.equals(
            new SassList(
              [new SassString('a'), new SassString('x'), new SassString('c')],
              {separator: ','}
            )
          )
        ).toBe(false);
      });

      it("doesn't equal a list with a missing entry", () => {
        expect(
          list.equals(
            new SassList([new SassString('a'), new SassString('b')], {
              separator: ',',
            })
          )
        ).toBe(false);
      });

      it("doesn't equal a list with an additional entry", () => {
        expect(
          list.equals(
            new SassList(
              [
                new SassString('a'),
                new SassString('b'),
                new SassString('c'),
                new SassString('d'),
              ],
              {separator: ','}
            )
          )
        ).toBe(false);
      });
    });

    describe('Sass to JS index conversion', () => {
      let list: SassList;
      beforeEach(() => {
        list = new SassList([
          new SassString('a'),
          new SassString('b'),
          new SassString('c'),
        ]);
      });

      it('converts a positive index', () => {
        expect(list.sassIndexToListIndex(new SassNumber(1))).toBe(0);
        expect(list.sassIndexToListIndex(new SassNumber(2))).toBe(1);
        expect(list.sassIndexToListIndex(new SassNumber(3))).toBe(2);
      });

      it('converts a negative index', () => {
        expect(list.sassIndexToListIndex(new SassNumber(-1))).toBe(2);
        expect(list.sassIndexToListIndex(new SassNumber(-2))).toBe(1);
        expect(list.sassIndexToListIndex(new SassNumber(-3))).toBe(0);
      });

      it('rejects a non-number', () => {
        expect(() =>
          list.sassIndexToListIndex(new SassString('foo'))
        ).toThrow();
      });

      it('rejects a non-integer', () => {
        expect(() => list.sassIndexToListIndex(new SassNumber(1.1))).toThrow();
      });

      it('rejects invalid indices', () => {
        expect(() => list.sassIndexToListIndex(new SassNumber(0))).toThrow();
        expect(() => list.sassIndexToListIndex(new SassNumber(4))).toThrow();
        expect(() => list.sassIndexToListIndex(new SassNumber(-4))).toThrow();
      });
    });

    describe('delimiters', () => {
      it('defaults to comma separator and no brackets', () => {
        const list = new SassList([
          new SassString('a'),
          new SassString('b'),
          new SassString('c'),
        ]);
        expect(list.separator).toBe(',');
        expect(list.hasBrackets).toBe(false);
      });

      it('allows an undecided separator for empty and single-element lists', () => {
        let list = new SassList({separator: null});
        expect(list.separator).toBe(null);

        list = new SassList([new SassString('a')], {separator: null});
        expect(list.separator).toBe(null);
      });

      it('does not allow an undecided separator for lists with more than one element', () => {
        expect(
          () =>
            new SassList([new SassString('a'), new SassString('b')], {
              separator: null,
            })
        ).toThrow();
      });

      it('supports space separators', () => {
        const list = new SassList(
          [new SassString('a'), new SassString('b'), new SassString('c')],
          {separator: ' '}
        );
        expect(list.separator).toBe(' ');
      });

      it('supports slash separators', () => {
        const list = new SassList(
          [new SassString('a'), new SassString('b'), new SassString('c')],
          {separator: '/'}
        );
        expect(list.separator).toBe('/');
      });

      it('supports brackets', () => {
        const list = new SassList(
          [new SassString('a'), new SassString('b'), new SassString('c')],
          {brackets: true}
        );
        expect(list.hasBrackets).toBe(true);
      });
    });

    describe('get()', () => {
      let list: SassList;
      beforeEach(() => {
        list = new SassList([
          new SassString('a'),
          new SassString('b'),
          new SassString('c'),
        ]);
      });

      it('returns elements for non-negative indices', () => {
        expect(list.get(0)).toEqualWithHash(new SassString('a'));
        expect(list.get(1)).toEqualWithHash(new SassString('b'));
        expect(list.get(2)).toEqualWithHash(new SassString('c'));
      });

      it('returns elements for negative indices', () => {
        expect(list.get(-3)).toEqualWithHash(new SassString('a'));
        expect(list.get(-2)).toEqualWithHash(new SassString('b'));
        expect(list.get(-1)).toEqualWithHash(new SassString('c'));
      });

      it('returns undefined for out-of-bounds values', () => {
        expect(list.get(3)).toBe(undefined);
        expect(list.get(-4)).toBe(undefined);
      });

      it('rounds indices down', () => {
        expect(list.get(0.1)).toEqualWithHash(new SassString('a'));
        expect(list.get(2.9)).toEqualWithHash(new SassString('c'));
        expect(list.get(3.1)).toBe(undefined);
        expect(list.get(-0.1)).toEqualWithHash(new SassString('c'));
        expect(list.get(-2.9)).toEqualWithHash(new SassString('a'));
        expect(list.get(3.1)).toBe(undefined);
      });
    });

    describe('single-element list', () => {
      let list: SassList;
      beforeEach(() => {
        list = new SassList([new SassNumber(1)]);
      });

      it('has a comma separator', () => {
        expect(list.separator).toBe(',');
      });

      it('has no brackets', () => {
        expect(list.hasBrackets).toBe(false);
      });

      it('returns its contents as a list', () => {
        expect(list.asList.equals(List([new SassNumber(1)]))).toBe(true);
      });
    });

    describe('a scalar value', () => {
      let string: SassString;
      beforeEach(() => {
        string = new SassString('blue');
      });

      it('has an undecided separator', () => {
        expect(string.separator).toBe(null);
      });

      it('has no brackets', () => {
        expect(string.hasBrackets).toBe(false);
      });

      it('returns itself as a list', () => {
        const list = string.asList;
        expect(list.size).toBe(1);
        expect(list.get(0)).toBe(string);
      });

      describe('Sass to JS index conversion', () => {
        it('converts a positive index', () => {
          expect(string.sassIndexToListIndex(new SassNumber(1))).toBe(0);
        });

        it('converts a negative index', () => {
          expect(string.sassIndexToListIndex(new SassNumber(-1))).toBe(0);
        });

        it('rejects invalid indices', () => {
          expect(() =>
            string.sassIndexToListIndex(new SassNumber(0))
          ).toThrow();
          expect(() =>
            string.sassIndexToListIndex(new SassNumber(2))
          ).toThrow();
          expect(() =>
            string.sassIndexToListIndex(new SassNumber(-2))
          ).toThrow();
        });
      });

      describe('get()', () => {
      it('returns the value for index 0', () => {
        expect(string.get(0)).toEqualWithHash(string);
      });

      it('returns the value for index -1', () => {
        expect(string.get(-1)).toEqualWithHash(string);
      });

      it('returns undefined for out-of-bounds values', () => {
        expect(string.get(1)).toBe(undefined);
        expect(string.get(-2)).toBe(undefined);
      });

      it('rounds indices down', () => {
        expect(string.get(0.1)).toEqualWithHash(string);
        expect(string.get(1.9)).toBe(undefined);
        expect(string.get(-0.1)).toEqualWithHash(string);
        expect(string.get(-1.9)).toBe(undefined);
      });
      });
    });

    describe('an empty list', () => {
      let list: SassList;
      beforeEach(() => {
        list = new SassList();
      });

      it('defaults to a comma separator', () => {
        expect(list.separator).toBe(',');
      });

      it('has no brackets', () => {
        expect(list.hasBrackets).toBe(false);
      });

      it('returns its contents as a list', () => {
        expect(list.asList.isEmpty()).toBe(true);
      });

      it('equals another empty list', () => {
        expect(list).toEqualWithHash(new SassList([]));
        expect(list).toEqualWithHash(new SassList());
      });

      it('counts as an empty map', () => {
        expect(list.assertMap().contents.isEmpty()).toBe(true);
        expect(list.tryMap()?.contents?.isEmpty()).toBe(true);
      });

      it('equals an empty map', () => {
        expect(list).toEqualWithHash(new SassMap());
      });

      it("isn't any other type", () => {
        expect(() => list.assertBoolean()).toThrow();
        expect(() => list.assertColor()).toThrow();
        expect(() => list.assertFunction()).toThrow();
        expect(() => list.assertNumber()).toThrow();
        expect(() => list.assertString()).toThrow();
      });

      it('rejects invalid indices', () => {
        expect(() => list.sassIndexToListIndex(new SassNumber(0))).toThrow();
        expect(() => list.sassIndexToListIndex(new SassNumber(1))).toThrow();
        expect(() => list.sassIndexToListIndex(new SassNumber(-1))).toThrow();
      });

      it('get() always returns undefined', () => {
        expect(list.get(0)).toBe(undefined);
        expect(list.get(1)).toBe(undefined);
        expect(list.get(-1)).toBe(undefined);
      });
    });
  });
});
