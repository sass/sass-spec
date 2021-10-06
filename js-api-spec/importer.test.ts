// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {URL, pathToFileURL} from 'url';

import mock from 'mock-fs';
import {compile, compileString, compileStringAsync, Importer} from 'sass';

import {skipForImpl} from './utils';

afterAll(mock.restore);

skipForImpl('sass-embedded', () => {
  it('uses an importer to resolve an @import', () => {
    const result = compileString('@import "orange";', {
      importers: [
        {
          canonicalize: url => new URL(`u:${url}`),
          load(url) {
            const color = url.pathname;
            return {contents: `.${color} {color: ${color}}`, syntax: 'scss'};
          },
        },
      ],
    });

    expect(result.css).toBe('.orange {\n  color: orange;\n}');
  });

  it('passes the canonicalized URL to the importer', () => {
    const result = compileString('@import "orange";', {
      importers: [
        {
          canonicalize: () => new URL('u:blue'),
          load(url) {
            const color = url.pathname;
            return {contents: `.${color} {color: ${color}}`, syntax: 'scss'};
          },
        },
      ],
    });

    expect(result.css).toBe('.blue {\n  color: blue;\n}');
  });

  it('only invokes the importer once for a given canonicalization', () => {
    const result = compileString(
      `
      @import "orange";
      @import "orange";
    `,
      {
        importers: [
          {
            canonicalize: () => new URL('u:blue'),
            load(url) {
              const color = url.pathname;
              return {contents: `.${color} {color: ${color}}`, syntax: 'scss'};
            },
          },
        ],
      }
    );

    expect(result.css).toBe(`.blue {
  color: blue;
}

.blue {
  color: blue;
}`);
  });

  describe('the imported URL', () => {
    // Regression test for sass/dart-sass#1137.
    it("isn't changed if it's root-relative", () => {
      const result = compileString('@import "/orange";', {
        importers: [
          {
            canonicalize(url) {
              expect(url).toEqual('/orange');
              return new URL(`u:${url}`);
            },
            load: () => ({contents: 'a {b: c}', syntax: 'scss'}),
          },
        ],
      });

      expect(result.css).toBe('a {\n  b: c;\n}');
    });

    it("is converted to a file: URL if it's an absolute Windows path", () => {
      const result = compileString('@import "C:/orange";', {
        importers: [
          {
            canonicalize(url) {
              expect(url).toEqual('file:///C:/orange');
              return new URL(`u:${url}`);
            },
            load: () => ({contents: 'a {b: c}', syntax: 'scss'}),
          },
        ],
      });

      expect(result.css).toBe('a {\n  b: c;\n}');
    });
  });

  it("uses an importer's source map URL", () => {
    const result = compileString('@import "orange";', {
      importers: [
        {
          canonicalize: url => new URL(`u:${url}`),
          load(url) {
            const color = url.pathname;
            return {
              contents: `.${color} {color: ${color}}`,
              syntax: 'scss',
              sourceMapUrl: new URL('u:blue'),
            };
          },
        },
      ],
      sourceMap: true,
    });

    expect(result.sourceMap!.sources).toInclude('u:blue');
  });

  it('wraps an error in canonicalize()', () => {
    expect(() => {
      compileString('@import "orange";', {
        importers: [
          {
            canonicalize() {
              throw 'this import is bad actually';
            },
            load() {
              fail('load() should not be called');
            },
          },
        ],
      });
    }).toThrowSassException({line: 0});
  });

  it('wraps an error in load()', () => {
    expect(() => {
      compileString('@import "orange";', {
        importers: [
          {
            canonicalize: url => new URL(`u:${url}`),
            load() {
              throw 'this import is bad actually';
            },
          },
        ],
      });
    }).toThrowSassException({line: 0});
  });

  it('avoids importer when canonicalize() returns null', () => {
    mock({'dir/_other.scss': 'a {from: dir}'});

    const result = compileString('@import "other";', {
      importers: [
        {
          canonicalize: () => null,
          load() {
            fail('load() should not be called');
          },
        },
      ],
      loadPaths: ['dir'],
    });
    expect(result.css).toBe('a {\n  from: dir;\n}');
  });

  it('fails to import when load() returns null', () => {
    mock({'dir/_other.scss': 'a {from: dir}'});

    expect(() => {
      compileString('@import "other";', {
        importers: [
          {
            canonicalize: url => new URL(`u:${url}`),
            load: () => null,
          },
        ],
        loadPaths: ['dir'],
      });
    }).toThrowSassException({line: 0});
  });

  it('prefers a relative file load to an importer', () => {
    mock({
      'input.scss': '@import "other"',
      '_other.scss': 'a {from: relative}',
    });

    const result = compile('input.scss', {
      importers: [
        {
          canonicalize() {
            fail('canonicalize() should not be called');
          },
          load() {
            fail('load() should not be called');
          },
        },
      ],
    });
    expect(result.css).toBe('a {\n  from: relative;\n}');
  });

  it('prefers a relative importer load to an importer', () => {
    const result = compileString('@import "other";', {
      importers: [
        {
          canonicalize() {
            fail('canonicalize() should not be called');
          },
          load() {
            fail('load() should not be called');
          },
        },
      ],
      url: new URL('o:style.scss'),
      importer: {
        canonicalize: url => new URL(url),
        load: () => ({contents: 'a {from: relative}', syntax: 'scss'}),
      },
    });
    expect(result.css).toBe('a {\n  from: relative;\n}');
  });

  it('prefers an importer to a load path', () => {
    mock({
      'input.scss': '@import "other"',
      'dir/_other.scss': 'a {from: load-path}',
    });

    const result = compile('input.scss', {
      importers: [
        {
          canonicalize: url => new URL(`u:${url}`),
          load: () => ({contents: 'a {from: importer}', syntax: 'scss'}),
        },
      ],
      loadPaths: ['dir'],
    });
    expect(result.css).toBe('a {\n  from: importer;\n}');
  });

  describe('with syntax', () => {
    it('scss, parses it as SCSS', () => {
      const result = compileString('@import "other";', {
        importers: [
          {
            canonicalize: () => new URL('u:other'),
            load: () => ({contents: '$a: value; b {c: $a}', syntax: 'scss'}),
          },
        ],
      });

      expect(result.css).toBe('b {\n  c: value;\n}');
    });

    it('indented, parses it as the indented syntax', () => {
      const result = compileString('@import "other";', {
        importers: [
          {
            canonicalize: () => new URL('u:other'),
            load: () => ({
              contents: '$a: value\nb\n  c: $a',
              syntax: 'indented',
            }),
          },
        ],
      });

      expect(result.css).toBe('b {\n  c: value;\n}');
    });

    it('css, allows plain CSS', () => {
      const result = compileString('@import "other";', {
        importers: [
          {
            canonicalize: () => new URL('u:other'),
            load: () => ({contents: 'a {b: c}', syntax: 'css'}),
          },
        ],
      });

      expect(result.css).toBe('a {\n  b: c;\n}');
    });

    it('css, rejects SCSS', () => {
      expect(() => {
        compileString('@import "other";', {
          importers: [
            {
              canonicalize: () => new URL('u:other'),
              load: () => ({contents: '$a: value\nb\n  c: $a', syntax: 'css'}),
            },
          ],
        });
      }).toThrowSassException({
        line: 0,
        url: new URL('u:other'),
      });
    });
  });

  describe('async', () => {
    it('resolves an @import', async () => {
      const result = await compileStringAsync('@import "orange";', {
        importers: [
          {
            canonicalize: url => Promise.resolve(new URL(`u:${url}`)),
            load(url) {
              const color = url.pathname;
              return Promise.resolve({
                contents: `.${color} {color: ${color}}`,
                syntax: 'scss',
              });
            },
          },
        ],
      });

      expect(result.css).toBe('.orange {\n  color: orange;\n}');
    });

    it('wraps an asynchronous error in canonicalize', async () => {
      await expect(() =>
        compileStringAsync('@import "orange";', {
          importers: [
            {
              canonicalize: () => Promise.reject('this import is bad actually'),
              load() {
                fail('load() should not be called');
              },
            },
          ],
        })
      ).toThrowSassException({line: 0});
    });

    it('wraps a synchronous error in canonicalize', async () => {
      await expect(() =>
        compileStringAsync('@import "orange";', {
          importers: [
            {
              canonicalize() {
                throw 'this import is bad actually';
              },
              load() {
                fail('load() should not be called');
              },
            },
          ],
        })
      ).toThrowSassException({line: 0});
    });

    it('wraps an asynchronous error in load', async () => {
      await expect(() =>
        compileStringAsync('@import "orange";', {
          importers: [
            {
              canonicalize: url => new URL(`u:${url}`),
              load: () => Promise.reject('this import is bad actually'),
            },
          ],
        })
      ).toThrowSassException({line: 0});
    });

    it('wraps a synchronous error in load', async () => {
      await expect(() =>
        compileStringAsync('@import "orange";', {
          importers: [
            {
              canonicalize: url => new URL(`u:${url}`),
              load() {
                throw 'this import is bad actually';
              },
            },
          ],
        })
      ).toThrowSassException({line: 0});
    });
  });

  describe('fromImport is', () => {
    it('true from an @import', () => {
      compileString('@import "foo"', {importers: [expectFromImport(true)]});
    });

    it('false from a @use', () => {
      compileString('@use "foo"', {importers: [expectFromImport(false)]});
    });

    it('false from a @forward', () => {
      compileString('@forward "foo"', {importers: [expectFromImport(false)]});
    });

    it('false from meta.load-css', () => {
      compileString('@use "sass:meta"; @include meta.load-css("")', {
        importers: [expectFromImport(false)],
      });
    });
  });

  describe('FileImporter', () => {
    it('loads a fully canonicalized URL', () => {
      mock({'dir/_other.scss': 'a {b: c}'});

      const result = compileString('@import "other";', {
        importers: [{findFileUrl: () => pathToFileURL('dir/_other.scss')}],
      });
      expect(result.css).toBe('a {\n  b: c;\n}');
    });

    it('resolves a non-canonicalized URL', () => {
      mock({'dir/other/_index.scss': 'a {b: c}'});

      const result = compileString('@import "other";', {
        importers: [{findFileUrl: () => pathToFileURL('dir/other')}],
      });
      expect(result.css).toBe('a {\n  b: c;\n}');
    });

    it('avoids importer when it returns null', () => {
      mock({'dir/_other.scss': 'a {from: dir}'});

      const result = compileString('@import "other";', {
        importers: [{findFileUrl: () => null}],
        loadPaths: ['dir'],
      });
      expect(result.css).toBe('a {\n  from: dir;\n}');
    });

    it('avoids importer when it returns an unresolvable URL', () => {
      mock({'dir/_other.scss': 'a {from: dir}'});

      const result = compileString('@import "other";', {
        importers: [{findFileUrl: () => pathToFileURL('nonexistent/other')}],
        loadPaths: ['dir'],
      });
      expect(result.css).toBe('a {\n  from: dir;\n}');
    });

    it('wraps an error', () => {
      expect(() => {
        compileString('@import "other";', {
          importers: [
            {
              findFileUrl() {
                throw 'this import is bad actually';
              },
            },
          ],
        });
      }).toThrowSassException({line: 0});
    });

    it('rejects a non-file URL', () => {
      expect(() => {
        compileString('@import "other";', {
          importers: [{findFileUrl: () => new URL('u:other.scss')}],
        });
      }).toThrowSassException({line: 0});
    });

    describe('when the resolved file has extension', () => {
      it('.scss, parses it as SCSS', () => {
        mock({'dir/_other.scss': '$a: value; b {c: $a}'});
        const result = compileString('@import "other";', {
          importers: [{findFileUrl: () => pathToFileURL('dir/other')}],
        });
        expect(result.css).toBe('b {\n  c: value;\n}');
      });

      it('.sass, parses it as the indented syntax', () => {
        mock({'dir/_other.sass': '$a: value\nb\n  c: $a'});
        const result = compileString('@import "other";', {
          importers: [{findFileUrl: () => pathToFileURL('dir/other')}],
        });
        expect(result.css).toBe('b {\n  c: value;\n}');
      });

      it('.css, allows plain CSS', () => {
        mock({'dir/_other.css': 'a {b: c}'});
        const result = compileString('@import "other";', {
          importers: [{findFileUrl: () => pathToFileURL('dir/other')}],
        });
        expect(result.css).toBe('a {\n  b: c;\n}');
      });

      it('.css, rejects SCSS', () => {
        mock({'dir/_other.css': '$a: value; b {c: $a}'});
        expect(() => {
          compileString('@import "other";', {
            importers: [{findFileUrl: () => pathToFileURL('dir/other')}],
          });
        }).toThrowSassException({
          line: 0,
          url: pathToFileURL('dir/_other.css'),
        });
      });
    });

    describe('fromImport is', () => {
      it('true from an @import', () => {
        mock({'dir/_other.scss': 'a {b: c}'});
        compileString('@import "other"', {
          importers: [
            {
              findFileUrl(url, options) {
                expect(options.fromImport).toBeTrue();
                return pathToFileURL('dir/other');
              },
            },
          ],
        });
      });

      it('false from a @use', () => {
        mock({'dir/_other.scss': 'a {b: c}'});
        compileString('@use "other"', {
          importers: [
            {
              findFileUrl(url, {fromImport}) {
                expect(fromImport).toBeFalse();
                return pathToFileURL('dir/other');
              },
            },
          ],
        });
      });
    });

    describe('async', () => {
      it('resolves an @import', async () => {
        mock({'dir/_other.scss': 'a {b: c}'});
        const result = await compileStringAsync('@use "other"', {
          importers: [
            {
              findFileUrl: () => Promise.resolve(pathToFileURL('dir/other')),
            },
          ],
        });
        expect(result.css).toBe('a {\n  b: c;\n}');
      });

      it('wraps an error', async () => {
        await expect(() =>
          compileStringAsync('@import "other";', {
            importers: [
              {
                findFileUrl: () =>
                  Promise.reject('this import is bad actually'),
              },
            ],
          })
        ).toThrowSassException({line: 0});
      });
    });
  });

  it(
    "throws an error for an importer that's ambiguous between FileImporter " +
      'and Importer',
    () => {
      mock({'dir/_other.scss': 'a {b: c}'});
      const callback = () => {
        compileString('', {
          importers: [
            {
              findFileUrl: () => pathToFileURL('dir/other'),
              canonicalize: () => new URL('u:other'),
              load: () => ({contents: 'a {b: c}', syntax: 'scss'}),
            } as unknown as Importer<'sync'>,
          ],
        });
      };

      expect(callback).toThrow();
      expect(callback).not.toThrowSassException();
    }
  );
});

/**
 * Returns an importer that asserts that `fromImport` is `expected`, and
 * otherwise imports exclusively empty stylesheets.
 */
function expectFromImport(expected: boolean): Importer<'sync'> {
  return {
    canonicalize(url, {fromImport}) {
      expect(fromImport).toBe(expected);
      return new URL(`u:${url}`);
    },
    load: () => ({contents: '', syntax: 'scss'}),
  };
}
