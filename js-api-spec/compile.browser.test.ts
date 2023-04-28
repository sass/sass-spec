// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {compileString, compileStringAsync} from 'sass';
import type {OutputStyle} from 'sass';

import {expectA as expectAsync, skipForImpl} from './utils';

describe('compileString', () => {
  describe('success', () => {
    describe('input', () => {
      it('compiles SCSS by default', () => {
        expect(compileString('$a: b; c {d: $a}').css).toBe('c {\n  d: b;\n}');
      });

      it('compiles SCSS with explicit syntax', () => {
        expect(compileString('$a: b; c {d: $a}', {syntax: 'scss'}).css).toBe(
          'c {\n  d: b;\n}'
        );
      });

      it('compiles indented syntax with explicit syntax', () => {
        expect(compileString('a\n  b: c', {syntax: 'indented'}).css).toBe(
          'a {\n  b: c;\n}'
        );
      });

      it('compiles plain CSS with explicit syntax', () => {
        expect(compileString('a {b: c}', {syntax: 'css'}).css).toBe(
          'a {\n  b: c;\n}'
        );
      });
    });

    it('recognizes the expanded output style', () => {
      expect(compileString('a {b: c}', {style: 'expanded'}).css).toBe(
        'a {\n  b: c;\n}'
      );
    });

    describe('sourceMap', () => {
      it("doesn't include one by default", () => {
        expect(compileString('a {b: c}')).not.toHaveProperty('sourceMap');
      });

      it('includes one if sourceMap is true', () => {
        const result = compileString('a {b: c}', {sourceMap: true});
        expect(result).toHaveProperty('sourceMap');

        // Explicitly don't test the details of the source map, because
        // individual implementations are allowed to generate a custom map.
        const sourceMap = result.sourceMap!;
        expect(typeof sourceMap.version).toBeString();
        expect(sourceMap.sources).toBeArray();
        expect(sourceMap.names).toBeArray();
        expect(sourceMap.mappings).toBeString();
      });

      it('includes one with source content if sourceMapIncludeSources is true', () => {
        const result = compileString('a {b: c}', {
          sourceMap: true,
          sourceMapIncludeSources: true,
        });
        expect(result).toHaveProperty('sourceMap');

        const sourceMap = result.sourceMap!;
        expect(sourceMap).toHaveProperty('sourcesContent');
        expect(sourceMap.sourcesContent!).toBeArray();
        expect(sourceMap.sourcesContent!.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('charset', () => {
      it('emits @charset "UTF-8" or BOM for non-ASCII CSS by default', () => {
        expect(compileString('a {b: あ;}').css).toBe(
          '@charset "UTF-8";\na {\n  b: あ;\n}'
        );
      });

      it("doesn't emit @charset or BOM if charset is false", () => {
        expect(compileString('a {b: あ;}', {charset: false}).css).toBe(
          'a {\n  b: あ;\n}'
        );
      });
    });
  });

  describe('error', () => {
    it('requires plain CSS with explicit syntax', () => {
      expect(() =>
        compileString('$a: b; c {d: $a}', {syntax: 'css'})
      ).toThrowSassException({line: 0, noUrl: true});
    });

    it('throws an error for an unrecognized style', () => {
      expect(() =>
        compileString('a {b: c}', {
          style: 'unrecognized style' as OutputStyle,
        })
      ).toThrowError();
    });

    it("doesn't throw a Sass exception for an argument error", () => {
      expect(() =>
        compileString('a {b: c}', {
          style: 'unrecognized style' as OutputStyle,
        })
      ).not.toThrowSassException();
    });

    it('is an instance of Error', () => {
      expect(() => compileString('a {b:')).toThrowError(Error);
    });
  });
});

describe('compileStringAsync returns a promise that', () => {
  it('succeeds when compilation succeeds', async () => {
    const result = await compileStringAsync('a {b: c}');
    expect(result.css).toBe('a {\n  b: c;\n}');
  });

  describe('fails when compilation fails', () => {
    it('with a syntax error', async () => {
      await expectAsync(() => compileStringAsync('a {b:')).toThrowSassException(
        {line: 0}
      );
    });

    it('with a runtime error', async () => {
      await expectAsync(() =>
        compileStringAsync('@error "oh no";')
      ).toThrowSassException({line: 0});
    });
  });
});
