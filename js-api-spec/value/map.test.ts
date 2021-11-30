// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {Value, SassList, SassMap, SassNumber, SassString} from 'sass';
import {List, OrderedMap} from 'immutable';

import '../utils';

describe('SassMap', () => {
  let map: SassMap;
  beforeEach(() => {
    map = new SassMap(
      OrderedMap([
        [new SassString('a'), new SassString('b')],
        [new SassString('c'), new SassString('d')],
      ])
    );
  });

  describe('construction', () => {
    it('is a value', () => {
      expect(map).toBeInstanceOf(Value);
    });

    it('is a map', () => {
      expect(map).toBeInstanceOf(SassMap);
      expect(map.assertMap()).toEqualWithHash(map);
      expect(map.tryMap()).toEqual(map);
    });

    it("isn't any other type", () => {
      expect(() => map.assertBoolean()).toThrow();
      expect(() => map.assertColor()).toThrow();
      expect(() => map.assertFunction()).toThrow();
      expect(() => map.assertNumber()).toThrow();
      expect(() => map.assertString()).toThrow();
    });

    it('returns its contents as a map', () => {
      expect(map.contents).toEqualWithHash(
        OrderedMap([
          [new SassString('a'), new SassString('b')],
          [new SassString('c'), new SassString('d')],
        ])
      );
    });

    it('returns its contents as a list', () => {
      expect(map.asList).toEqualWithHash(
        List([
          new SassList([new SassString('a'), new SassString('b')], {
            separator: ' ',
          }),
          new SassList([new SassString('c'), new SassString('d')], {
            separator: ' ',
          }),
        ])
      );
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
      expect(map).not.toEqualWithHash(
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
      );
    });

    describe("doesn't equal a map with", () => {
      it('a different value', () => {
        expect(map).not.toEqualWithHash(
          new SassMap(
            OrderedMap([
              [new SassString('a'), new SassString('x')],
              [new SassString('c'), new SassString('d')],
            ])
          )
        );
      });

      it('a different key', () => {
        expect(map).not.toEqualWithHash(
          new SassMap(
            OrderedMap([
              [new SassString('a'), new SassString('b')],
              [new SassString('x'), new SassString('d')],
            ])
          )
        );
      });

      it('a missing pair', () => {
        expect(map).not.toEqualWithHash(
          new SassMap(OrderedMap([[new SassString('a'), new SassString('b')]]))
        );
      });

      it('an additional pair', () => {
        expect(map).not.toEqualWithHash(
          new SassMap(
            OrderedMap([
              [new SassString('a'), new SassString('b')],
              [new SassString('c'), new SassString('d')],
              [new SassString('e'), new SassString('f')],
            ])
          )
        );
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

  describe('get()', () => {
    let map: SassMap;
    beforeEach(() => {
      map = new SassMap(
        OrderedMap([
          [new SassString('a'), new SassString('b')],
          [new SassString('c'), new SassString('d')],
        ])
      );
    });

    describe('with a number', () => {
      it('returns elements for non-negative indices', () => {
        expect(map.get(0)).toEqualWithHash(
          new SassList([new SassString('a'), new SassString('b')], {
            separator: ' ',
          })
        );
        expect(map.get(1)).toEqualWithHash(
          new SassList([new SassString('c'), new SassString('d')], {
            separator: ' ',
          })
        );
      });

      it('returns elements for negative indices', () => {
        expect(map.get(-2)).toEqualWithHash(
          new SassList([new SassString('a'), new SassString('b')], {
            separator: ' ',
          })
        );
        expect(map.get(-1)).toEqualWithHash(
          new SassList([new SassString('c'), new SassString('d')], {
            separator: ' ',
          })
        );
      });

      it('returns undefined for out-of-bounds values', () => {
        expect(map.get(2)).toBe(undefined);
        expect(map.get(-3)).toBe(undefined);
      });

      it('rounds indices down', () => {
        expect(map.get(0.1)).toEqualWithHash(
          new SassList([new SassString('a'), new SassString('b')], {
            separator: ' ',
          })
        );
        expect(map.get(1.9)).toEqualWithHash(
          new SassList([new SassString('c'), new SassString('d')], {
            separator: ' ',
          })
        );
        expect(map.get(2.1)).toBe(undefined);
        expect(map.get(-0.1)).toEqualWithHash(
          new SassList([new SassString('c'), new SassString('d')], {
            separator: ' ',
          })
        );
        expect(map.get(-1.9)).toEqualWithHash(
          new SassList([new SassString('a'), new SassString('b')], {
            separator: ' ',
          })
        );
        expect(map.get(-2.1)).toBe(undefined);
      });
    });

    describe('with a Value', () => {
      it('returns values associated with keys', () => {
        expect(map.get(new SassString('a'))).toEqualWithHash(
          new SassString('b')
        );
        expect(map.get(new SassString('c'))).toEqualWithHash(
          new SassString('d')
        );
      });

      it('returns undefined for keys that have no values', () => {
        expect(map.get(new SassString('b'))).toBe(undefined);
        expect(map.get(new SassString('d'))).toBe(undefined);
      });
    });
  });

  describe('an empty map', () => {
    let map: SassMap;
    beforeEach(() => {
      map = new SassMap();
    });

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
      expect(map).toEqualWithHash(new SassMap());
    });

    it('equals an empty list', () => {
      expect(map).toEqualWithHash(new SassList());
    });

    it('rejects invalid indices', () => {
      expect(() => map.sassIndexToListIndex(new SassNumber(0))).toThrow();
      expect(() => map.sassIndexToListIndex(new SassNumber(1))).toThrow();
      expect(() => map.sassIndexToListIndex(new SassNumber(-1))).toThrow();
    });
  });
});
