// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {Value, SassList, SassMap, SassNumber, SassString} from 'sass';
import {List, OrderedMap} from 'immutable';

import {skipForImpl} from '../utils';

skipForImpl('dart-sass', () => {
  describe('SassMap', () => {
    const map = new SassMap(
      OrderedMap([
        [new SassString('a'), new SassString('b')],
        [new SassString('c'), new SassString('d')],
      ])
    );

    describe('construction', () => {
      it('is a value', () => {
        expect(map).toBeInstanceOf(Value);
      });

      it('is a map', () => {
        expect(map).toBeInstanceOf(SassMap);
        expect(map.assertMap()).toEqualWithHash(map);
        expect(map.tryMap()).toEqual(
          OrderedMap([
            [new SassString('a'), new SassString('b')],
            [new SassString('c'), new SassString('d')],
          ])
        );
      });

      it("isn't any other type", () => {
        expect(() => map.assertBoolean()).toThrow();
        expect(() => map.assertColor()).toThrow();
        expect(() => map.assertFunction()).toThrow();
        expect(() => map.assertNumber()).toThrow();
        expect(() => map.assertString()).toThrow();
      });

      it('returns its contents as a map', () => {
        expect(map.contents).toEqual(
          OrderedMap([
            [new SassString('a'), new SassString('b')],
            [new SassString('c'), new SassString('d')],
          ])
        );
      });

      it('returns its contents as a list', () => {
        expect(
          map.asList.equals(
            List([
              new SassList([new SassString('a'), new SassString('b')], {
                separator: ',',
              }),
              new SassList([new SassString('c'), new SassString('d')], {
                separator: ',',
              }),
            ])
          )
        ).toBe(true);
      });

      it('has a comma separator', () => {
        expect(map.separator).toBe(',');
      });
    });

    describe('equality', () => {
      it('equals the same map', () => {
        expect(map).toEqualWithHash(
          new SassMap(
            OrderedMap([
              [new SassString('a'), new SassString('b')],
              [new SassString('c'), new SassString('d')],
            ])
          )
        );
      });

      it('equals the same map with a different ordering', () => {
        expect(map).toEqualWithHash(
          new SassMap(
            OrderedMap([
              [new SassString('c'), new SassString('d')],
              [new SassString('a'), new SassString('b')],
            ])
          )
        );
      });

      it("doesn't equal the equivalent list", () => {
        expect(
          map.equals(
            new SassList(
              [
                new SassList([new SassString('a'), new SassString('b')], {
                  separator: ',',
                }),
                new SassList([new SassString('c'), new SassString('d')], {
                  separator: ',',
                }),
              ],
              {separator: ','}
            )
          )
        ).toBe(false);
      });

      describe("doesn't equal a map with", () => {
        it('a different value', () => {
          expect(
            map.equals(
              new SassMap(
                OrderedMap([
                  [new SassString('a'), new SassString('x')],
                  [new SassString('c'), new SassString('d')],
                ])
              )
            )
          ).toBe(false);
        });

        it('a different key', () => {
          expect(
            map.equals(
              new SassMap(
                OrderedMap([
                  [new SassString('a'), new SassString('b')],
                  [new SassString('x'), new SassString('d')],
                ])
              )
            )
          ).toBe(false);
        });

        it('a missing pair', () => {
          expect(
            map.equals(
              new SassMap(
                OrderedMap([[new SassString('a'), new SassString('b')]])
              )
            )
          ).toBe(false);
        });

        it('an additional pair', () => {
          expect(
            map.equals(
              new SassMap(
                OrderedMap([
                  [new SassString('a'), new SassString('b')],
                  [new SassString('c'), new SassString('d')],
                  [new SassString('e'), new SassString('f')],
                ])
              )
            )
          ).toBe(false);
        });
      });
    });

    describe('Sass to JS index conversion()', () => {
      it('converts a positive index', () => {
        expect(map.sassIndexToListIndex(new SassNumber(1))).toBe(0);
        expect(map.sassIndexToListIndex(new SassNumber(2))).toBe(1);
      });

      it('converts a negative index', () => {
        expect(map.sassIndexToListIndex(new SassNumber(-1))).toBe(1);
        expect(map.sassIndexToListIndex(new SassNumber(-2))).toBe(0);
      });

      it('rejects invalid indices', () => {
        expect(() => map.sassIndexToListIndex(new SassNumber(0))).toThrow();
        expect(() => map.sassIndexToListIndex(new SassNumber(3))).toThrow();
        expect(() => map.sassIndexToListIndex(new SassNumber(-3))).toThrow();
      });
    });

    describe('an empty map', () => {
      const map = SassMap.empty();

      it('has a null separator', () => {
        expect(map.separator).toBe(null);
      });

      it('returns its contents as a map', () => {
        expect(map.contents.isEmpty()).toBe(true);
      });

      it('returns its contents as a list', () => {
        expect(map.asList.isEmpty()).toBe(true);
      });

      it('equals another empty map', () => {
        expect(map).toEqualWithHash(new SassMap(OrderedMap()));
        expect(map).toEqualWithHash(SassMap.empty());
      });

      it('equals an empty list', () => {
        expect(map).toEqualWithHash(SassList.empty());
      });

      it('rejects invalid indices', () => {
        expect(() => map.sassIndexToListIndex(new SassNumber(0))).toThrow();
        expect(() => map.sassIndexToListIndex(new SassNumber(1))).toThrow();
        expect(() => map.sassIndexToListIndex(new SassNumber(-1))).toThrow();
      });
    });
  });
});
