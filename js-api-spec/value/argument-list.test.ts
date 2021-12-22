// Copyright 2021 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {
  SassArgumentList,
  SassList,
  SassString,
  compileString,
  sassNull,
  Value,
} from 'sass';
import {List, OrderedMap} from 'immutable';
import {URL} from 'url';

import '../utils';

it('passes an argument list', () => {
  const fn = jest.fn(args => {
    expect(args).toHaveLength(1);
    expect(args[0]).toBeInstanceOf(SassArgumentList);
    const arglist = args[0].asList;
    expect(arglist.size).toBe(3);
    expect(arglist.get(0).assertString().text).toBe('x');
    expect(arglist.get(1).assertString().text).toBe('y');
    expect(arglist.get(2).assertString().text).toBe('z');
    return sassNull;
  });

  expect(
    compileString('a {b: foo(x, y, z)}', {
      functions: {'foo($args...)': fn},
    }).css
  ).toBe('');

  expect(fn).toBeCalled();
});

it('passes keyword arguments', () => {
  const fn = jest.fn(args => {
    expect(args).toHaveLength(1);
    expect(args[0]).toBeInstanceOf(SassArgumentList);
    expect(args[0].asList.size).toBe(0);
    const keywords = (args[0] as SassArgumentList).keywords;
    expect(keywords).toEqualWithHash(
      OrderedMap([['bar', new SassString('baz', {quotes: false})]])
    );
    return sassNull;
  });

  expect(
    compileString('a {b: foo($bar: baz)}', {
      functions: {'foo($args...)': fn},
    }).css
  ).toBe('');

  expect(fn).toBeCalled();
});

it("throws an error if arglist keywords aren't accessed", () => {
  const fn = jest.fn(args => {
    expect(args).toHaveLength(1);
    expect(args[0]).toBeInstanceOf(SassArgumentList);
    return sassNull;
  });

  expect(
    () =>
      compileString('a {b: foo($bar: baz)}', {
        // Necessary until we get a compiler release with
        // dart-lang/source_span#78.
        url: new URL('file:///input.scss'),
        functions: {'foo($args...)': fn},
      }).css
  ).toThrowSassException({line: 0});

  expect(fn).toBeCalled();
});

describe('SassArgumentList', () => {
  describe('construction', () => {
    let list: SassArgumentList;
    beforeEach(() => {
      list = new SassArgumentList(
        [new SassString('a'), new SassString('b'), new SassString('c')],
        {d: new SassString('e')}
      );
    });

    it('is a value', () => {
      expect(list).toBeInstanceOf(Value);
    });

    it('is a list', () => {
      expect(list).toBeInstanceOf(SassList);
    });

    it('is an argument list', () => {
      expect(list).toBeInstanceOf(SassArgumentList);
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
      expect(list.asList).toEqualWithHash(
        List([new SassString('a'), new SassString('b'), new SassString('c')])
      );
    });

    it('returns its keywords', () => {
      expect(list.keywords).toEqualWithHash(
        OrderedMap({d: new SassString('e')})
      );
    });
  });

  describe('equality', () => {
    let list: SassArgumentList;
    beforeEach(() => {
      list = new SassArgumentList(
        [new SassString('a'), new SassString('b'), new SassString('c')],
        {d: new SassString('e')}
      );
    });

    it('equals the same argument list', () => {
      expect(list).toEqualWithHash(
        new SassArgumentList(
          [new SassString('a'), new SassString('b'), new SassString('c')],
          {d: new SassString('e')}
        )
      );
    });

    it('equals an argument with only different keywords', () => {
      expect(list).toEqualWithHash(
        new SassArgumentList(
          [new SassString('a'), new SassString('b'), new SassString('c')],
          {f: new SassString('g')}
        )
      );
    });

    it('equals a plain list with the same contents', () => {
      expect(list).toEqualWithHash(
        new SassList([
          new SassString('a'),
          new SassString('b'),
          new SassString('c'),
        ])
      );
    });

    it("doesn't equal an argument list with a different separator", () => {
      expect(list).not.toEqualWithHash(
        new SassArgumentList(
          [new SassString('a'), new SassString('b'), new SassString('c')],
          {},
          ' '
        )
      );
    });

    it("doesn't equal a bracketed list", () => {
      expect(list).not.toEqualWithHash(
        new SassList(
          [new SassString('a'), new SassString('b'), new SassString('c')],
          {brackets: true}
        )
      );
    });
  });

  describe('delimiters', () => {
    it('defaults to comma separator and no brackets', () => {
      const list = new SassArgumentList(
        [new SassString('a'), new SassString('b'), new SassString('c')],
        {}
      );
      expect(list.separator).toBe(',');
      expect(list.hasBrackets).toBe(false);
    });

    it('allows an undecided separator for empty and single-element lists', () => {
      let list = new SassArgumentList([], {}, null);
      expect(list.separator).toBe(null);

      list = new SassArgumentList([new SassString('a')], {}, null);
      expect(list.separator).toBe(null);
    });

    it('does not allow an undecided separator for lists with more than one element', () => {
      expect(
        () =>
          new SassArgumentList(
            [new SassString('a'), new SassString('b')],
            {},
            null
          )
      ).toThrow();
    });

    it('supports space separators', () => {
      const list = new SassArgumentList(
        [new SassString('a'), new SassString('b'), new SassString('c')],
        {},
        ' '
      );
      expect(list.separator).toBe(' ');
    });

    it('supports slash separators', () => {
      const list = new SassArgumentList(
        [new SassString('a'), new SassString('b'), new SassString('c')],
        {},
        '/'
      );
      expect(list.separator).toBe('/');
    });
  });
});
