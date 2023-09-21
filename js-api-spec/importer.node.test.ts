// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {URL} from 'url';
import {
  compile,
  compileString,
  compileStringAsync,
  CanonicalizeContext,
  Importer,
} from 'sass';

import {sandbox} from './sandbox';

it('avoids importer when canonicalize() returns null', () =>
  sandbox(dir => {
    dir.write({'dir/_other.scss': 'a {from: dir}'});

    const result = compileString('@import "other";', {
      importers: [
        {
          canonicalize: () => null,
          load() {
            fail('load() should not be called');
          },
        } as unknown as Importer<'sync'>,
      ],
      loadPaths: [dir('dir')],
    });
    expect(result.css).toBe('a {\n  from: dir;\n}');
  }));

it('fails to import when load() returns null', () =>
  sandbox(dir => {
    dir.write({'dir/_other.scss': 'a {from: dir}'});

    expect(() => {
      compileString('@import "other";', {
        importers: [
          {
            canonicalize: (url: string) => new URL(`u:${url}`),
            load: () => null,
          },
        ],
        loadPaths: [dir('dir')],
      });
    }).toThrowSassException({line: 0});
  }));

it('prefers a relative file load to an importer', () =>
  sandbox(dir => {
    dir.write({
      'input.scss': '@import "other"',
      '_other.scss': 'a {from: relative}',
    });

    const result = compile(dir('input.scss'), {
      importers: [
        {
          canonicalize() {
            fail('canonicalize() should not be called');
          },
          load() {
            fail('load() should not be called');
          },
        } as unknown as Importer<'sync'>,
      ],
    });
    expect(result.css).toBe('a {\n  from: relative;\n}');
  }));

it('prefers an importer to a load path', () =>
  sandbox(dir => {
    dir.write({
      'input.scss': '@import "other"',
      'dir/_other.scss': 'a {from: load-path}',
    });

    const result = compile(dir('input.scss'), {
      importers: [
        {
          canonicalize: (url: string) => new URL(`u:${url}`),
          load: () => ({contents: 'a {from: importer}', syntax: 'scss'}),
        },
      ],
      loadPaths: [dir('dir')],
    });
    expect(result.css).toBe('a {\n  from: importer;\n}');
  }));

describe('FileImporter', () => {
  it('loads a fully canonicalized URL', () =>
    sandbox(dir => {
      dir.write({'_other.scss': 'a {b: c}'});

      const result = compileString('@import "other";', {
        importers: [{findFileUrl: () => dir.url('_other.scss')}],
      });
      expect(result.css).toBe('a {\n  b: c;\n}');
    }));

  it('resolves a non-canonicalized URL', () =>
    sandbox(dir => {
      dir.write({'other/_index.scss': 'a {b: c}'});

      const result = compileString('@import "other";', {
        importers: [{findFileUrl: () => dir.url('other')}],
      });
      expect(result.css).toBe('a {\n  b: c;\n}');
    }));

  it('avoids importer when it returns null', () =>
    sandbox(dir => {
      dir.write({'_other.scss': 'a {from: dir}'});

      const result = compileString('@import "other";', {
        importers: [{findFileUrl: () => null}],
        loadPaths: [dir.root],
      });
      expect(result.css).toBe('a {\n  from: dir;\n}');
    }));

  it('avoids importer when it returns an unresolvable URL', () =>
    sandbox(dir => {
      dir.write({'_other.scss': 'a {from: dir}'});

      const result = compileString('@import "other";', {
        importers: [{findFileUrl: () => dir.url('nonexistent/other')}],
        loadPaths: [dir.root],
      });
      expect(result.css).toBe('a {\n  from: dir;\n}');
    }));

  it('passes an absolute non-file: URL to the importer', () =>
    sandbox(dir => {
      dir.write({'dir/_other.scss': 'a {b: c}'});

      const result = compileString('@import "u:other";', {
        importers: [
          {
            findFileUrl(url: string) {
              expect(url).toEqual('u:other');
              return dir.url('dir/other');
            },
          },
        ],
      });
      expect(result.css).toBe('a {\n  b: c;\n}');
    }));

  it("doesn't pass an absolute file: URL to the importer", () =>
    sandbox(dir => {
      dir.write({'_other.scss': 'a {b: c}'});

      const result = compileString(`@import "${dir.url('other')}";`, {
        importers: [
          {
            findFileUrl() {
              fail('findFileUrl() should not be called');
            },
          },
        ],
      });
      expect(result.css).toBe('a {\n  b: c;\n}');
    }));

  it("doesn't pass relative loads to the importer", () =>
    sandbox(dir => {
      dir.write({'_midstream.scss': '@import "upstream"'});
      dir.write({'_upstream.scss': 'a {b: c}'});

      let count = 0;
      const result = compileString('@import "midstream";', {
        importers: [
          {
            findFileUrl() {
              if (count === 0) {
                count++;
                return dir.url('upstream');
              } else {
                fail('findFileUrl() should only be called once');
              }
            },
          },
        ],
      });
      expect(result.css).toBe('a {\n  b: c;\n}');
    }));

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
    it('.scss, parses it as SCSS', () =>
      sandbox(dir => {
        dir.write({'_other.scss': '$a: value; b {c: $a}'});
        const result = compileString('@import "other";', {
          importers: [{findFileUrl: () => dir.url('other')}],
        });
        expect(result.css).toBe('b {\n  c: value;\n}');
      }));

    it('.sass, parses it as the indented syntax', () =>
      sandbox(dir => {
        dir.write({'_other.sass': '$a: value\nb\n  c: $a'});
        const result = compileString('@import "other";', {
          importers: [{findFileUrl: () => dir.url('other')}],
        });
        expect(result.css).toBe('b {\n  c: value;\n}');
      }));

    it('.css, allows plain CSS', () =>
      sandbox(dir => {
        dir.write({'_other.css': 'a {b: c}'});
        const result = compileString('@import "other";', {
          importers: [{findFileUrl: () => dir.url('other')}],
        });
        expect(result.css).toBe('a {\n  b: c;\n}');
      }));

    it('.css, rejects SCSS', () =>
      sandbox(dir => {
        dir.write({'_other.css': '$a: value; b {c: $a}'});
        expect(() => {
          compileString('@import "other";', {
            importers: [{findFileUrl: () => dir.url('other')}],
          });
        }).toThrowSassException({
          line: 0,
          url: dir.url('_other.css'),
        });
      }));
  });

  describe('fromImport is', () => {
    it('true from an @import', () =>
      sandbox(dir => {
        dir.write({'_other.scss': 'a {b: c}'});
        compileString('@import "other"', {
          importers: [
            {
              findFileUrl(url: string, options: {fromImport: boolean}) {
                expect(options.fromImport).toBeTrue();
                return dir.url('other');
              },
            },
          ],
        });
      }));

    it('false from a @use', () =>
      sandbox(dir => {
        dir.write({'_other.scss': 'a {b: c}'});
        compileString('@use "other"', {
          importers: [
            {
              findFileUrl(url: string, {fromImport}: {fromImport: boolean}) {
                expect(fromImport).toBeFalse();
                return dir.url('other');
              },
            },
          ],
        });
      }));
  });

  describe('containingUrl is', () => {
    it('set for a relative URL', () =>
      sandbox(dir => {
        dir.write({'_other.css': 'a {b: c}'});
        const result = compileString('@import "other";', {
          importers: [
            {
              findFileUrl: (url: string, context: CanonicalizeContext) => {
                expect(context.containingUrl).toEqual(
                  new URL('x:original.scss')
                );
                return dir.url('other');
              },
            },
          ],
          url: new URL('x:original.scss'),
        });
        expect(result.css).toBe('a {\n  b: c;\n}');
      }));

    it('set for an absolute URL', () =>
      sandbox(dir => {
        dir.write({'_other.css': 'a {b: c}'});
        const result = compileString('@import "u:other";', {
          importers: [
            {
              findFileUrl: (url: string, context: CanonicalizeContext) => {
                expect(context.containingUrl).toEqual(
                  new URL('x:original.scss')
                );
                return dir.url('other');
              },
            },
          ],
          url: new URL('x:original.scss'),
        });
        expect(result.css).toBe('a {\n  b: c;\n}');
      }));

    it('unset when the URL is unavailable', () =>
      sandbox(dir => {
        dir.write({'_other.css': 'a {b: c}'});
        const result = compileString('@import "u:other";', {
          importers: [
            {
              findFileUrl: (url: string, context: CanonicalizeContext) => {
                expect(context.containingUrl).toBeNull();
                return dir.url('other');
              },
            },
          ],
        });
        expect(result.css).toBe('a {\n  b: c;\n}');
      }));
  });

  describe('async', () => {
    it('resolves an @import', async () =>
      sandbox(async dir => {
        dir.write({'_other.scss': 'a {b: c}'});
        const result = await compileStringAsync('@use "other"', {
          importers: [
            {
              findFileUrl: () => Promise.resolve(dir.url('other')),
            },
          ],
        });
        expect(result.css).toBe('a {\n  b: c;\n}');
      }));

    it('wraps an error', async () => {
      await expectAsync(() =>
        compileStringAsync('@import "other";', {
          importers: [
            {
              findFileUrl: () => Promise.reject('this import is bad actually'),
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
  () =>
    sandbox(dir => {
      dir.write({'_other.scss': 'a {b: c}'});
      const callback = () => {
        compileString('', {
          importers: [
            {
              findFileUrl: () => dir.url('other'),
              canonicalize: () => new URL('u:other'),
              load: () => ({contents: 'a {b: c}', syntax: 'scss'}),
            } as unknown as Importer<'sync'>,
          ],
        });
      };

      expect(callback).toThrow();
      expect(callback).not.toThrowSassException();
    })
);
