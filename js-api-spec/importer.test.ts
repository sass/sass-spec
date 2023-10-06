// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {
  compileString,
  compileStringAsync,
  CanonicalizeContext,
  Importer,
} from 'sass';

import {sassImpl, URL} from './utils';

it('uses an importer to resolve an @import', () => {
  const result = compileString('@import "orange";', {
    importers: [
      {
        canonicalize: (url: string) => new URL(`u:${url}`),
        load(url: typeof URL) {
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
        load(url: typeof URL) {
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
          load(url: typeof URL) {
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
          canonicalize(url: string) {
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
          canonicalize(url: string) {
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

describe('the containing URL', () => {
  it('is null for a potentially canonical scheme', () => {
    const result = compileString('@import "u:orange"', {
      importers: [
        {
          canonicalize: (url: string, context: CanonicalizeContext) => {
            expect(context.containingUrl).toBeNull();
            return new URL(url);
          },
          load: () => ({contents: '@a', syntax: 'scss'}),
        },
      ],
    });

    expect(result.css).toBe('@a;');
  });

  describe('for a non-canonical scheme', () => {
    describe('in a list', () => {
      it('is set to the original URL', () => {
        const result = compileString('@import "u:orange"', {
          importers: [
            {
              canonicalize: (url: string, context: CanonicalizeContext) => {
                expect(context.containingUrl).toEqual(
                  new URL('x:original.scss')
                );
                return new URL(url.replace(/^u:/, 'x:'));
              },
              load: () => ({contents: '@a', syntax: 'scss'}),
              nonCanonicalScheme: ['u'],
            },
          ],
          url: new URL('x:original.scss'),
        });

        expect(result.css).toBe('@a;');
      });

      it('is null if the original URL is null', () => {
        const result = compileString('@import "u:orange"', {
          importers: [
            {
              canonicalize: (url: string, context: CanonicalizeContext) => {
                expect(context.containingUrl).toBeNull();
                return new URL(url.replace(/^u:/, 'x:'));
              },
              load: () => ({contents: '@a', syntax: 'scss'}),
              nonCanonicalScheme: ['u'],
            },
          ],
        });

        expect(result.css).toBe('@a;');
      });
    });

    describe('as a string', () => {
      it('is set to the original URL', () => {
        const result = compileString('@import "u:orange"', {
          importers: [
            {
              canonicalize: (url: string, context: CanonicalizeContext) => {
                expect(context.containingUrl).toEqual(
                  new URL('x:original.scss')
                );
                return new URL(url.replace(/^u:/, 'x:'));
              },
              load: () => ({contents: '@a', syntax: 'scss'}),
              nonCanonicalScheme: 'u',
            },
          ],
          url: new URL('x:original.scss'),
        });

        expect(result.css).toBe('@a;');
      });

      it('is null if the original URL is null', () => {
        const result = compileString('@import "u:orange"', {
          importers: [
            {
              canonicalize: (url: string, context: CanonicalizeContext) => {
                expect(context.containingUrl).toBeNull();
                return new URL(url.replace(/^u:/, 'x:'));
              },
              load: () => ({contents: '@a', syntax: 'scss'}),
              nonCanonicalScheme: 'u',
            },
          ],
        });

        expect(result.css).toBe('@a;');
      });
    });
  });

  describe('for a schemeless load', () => {
    it('is set to the original URL', () => {
      const result = compileString('@import "orange"', {
        importers: [
          {
            canonicalize: (url: string, context: CanonicalizeContext) => {
              expect(context.containingUrl).toEqual(new URL('x:original.scss'));
              return new URL(`u:${url}`);
            },
            load: () => ({contents: '@a', syntax: 'scss'}),
          },
        ],
        url: new URL('x:original.scss'),
      });

      expect(result.css).toBe('@a;');
    });

    it('is null if the original URL is null', () => {
      const result = compileString('@import "orange"', {
        importers: [
          {
            canonicalize: (url: string, context: CanonicalizeContext) => {
              expect(context.containingUrl).toBeNull();
              return new URL(`u:${url}`);
            },
            load: () => ({contents: '@a', syntax: 'scss'}),
          },
        ],
      });

      expect(result.css).toBe('@a;');
    });
  });
});

describe(
  'throws an error if the importer returns a canonical URL with a ' +
    'non-canonical scheme',
  () => {
    it('set as a list', () =>
      expect(() =>
        compileString('@import "orange"', {
          importers: [
            {
              canonicalize: (url: string) => {
                return new URL(`u:${url}`);
              },
              load: () => ({contents: '@a', syntax: 'scss'}),
              nonCanonicalScheme: ['u'],
            },
          ],
        })
      ).toThrowSassException({line: 0}));

    it('set as a string', () =>
      expect(() =>
        compileString('@import "orange"', {
          importers: [
            {
              canonicalize: (url: string) => {
                return new URL(`u:${url}`);
              },
              load: () => ({contents: '@a', syntax: 'scss'}),
              nonCanonicalScheme: 'u',
            },
          ],
        })
      ).toThrowSassException({line: 0}));
  }
);

describe('throws an error for an invalid scheme:', () => {
  it('empty', () =>
    expect(() =>
      compileString('a {b: c}', {
        importers: [
          {
            canonicalize: () => null,
            load: () => ({contents: '@a', syntax: 'scss'}),
            nonCanonicalScheme: '',
          },
        ],
      })
    ).toThrow());

  it('uppercase', () =>
    expect(() =>
      compileString('a {b: c}', {
        importers: [
          {
            canonicalize: () => null,
            load: () => ({contents: '@a', syntax: 'scss'}),
            nonCanonicalScheme: 'U',
          },
        ],
      })
    ).toThrow());

  it('colon', () =>
    expect(() =>
      compileString('a {b: c}', {
        importers: [
          {
            canonicalize: () => null,
            load: () => ({contents: '@a', syntax: 'scss'}),
            nonCanonicalScheme: 'u:',
          },
        ],
      })
    ).toThrow());
});

it("uses an importer's source map URL", () => {
  const result = compileString('@import "orange";', {
    importers: [
      {
        canonicalize: (url: string) => new URL(`u:${url}`),
        load(url: typeof URL) {
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

  expect(result.sourceMap!.sources).toContain('u:blue');
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
        } as unknown as Importer<'sync'>,
      ],
    });
  }).toThrowSassException({line: 0});
});

it('wraps an error in load()', () => {
  expect(() => {
    compileString('@import "orange";', {
      importers: [
        {
          canonicalize: (url: string) => new URL(`u:${url}`),
          load() {
            throw 'this import is bad actually';
          },
        },
      ],
    });
  }).toThrowSassException({line: 0});
});

it('fails to import when load() returns null', () =>
  expect(() => {
    compileString('@import "other";', {
      importers: [
        {
          canonicalize: (url: string) => new URL(`u:${url}`),
          load: () => null,
        },
      ],
    });
  }).toThrowSassException({line: 0}));

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
          canonicalize: (url: string) => Promise.resolve(new URL(`u:${url}`)),
          load(url: typeof URL) {
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
    await expectAsync(() =>
      compileStringAsync('@import "orange";', {
        importers: [
          {
            canonicalize: () => Promise.reject('this import is bad actually'),
            load() {
              fail('load() should not be called');
            },
          } as unknown as Importer<'async'>,
        ],
      })
    ).toThrowSassException({line: 0});
  });

  it('wraps a synchronous error in canonicalize', async () => {
    await expectAsync(() =>
      compileStringAsync('@import "orange";', {
        importers: [
          {
            canonicalize() {
              throw 'this import is bad actually';
            },
            load() {
              fail('load() should not be called');
            },
          } as unknown as Importer<'async'>,
        ],
      })
    ).toThrowSassException({line: 0});
  });

  it('wraps an asynchronous error in load', async () => {
    await expectAsync(() =>
      compileStringAsync('@import "orange";', {
        importers: [
          {
            canonicalize: (url: string) => new URL(`u:${url}`),
            load: () => Promise.reject('this import is bad actually'),
          },
        ],
      })
    ).toThrowSassException({line: 0});
  });

  it('wraps a synchronous error in load', async () => {
    await expectAsync(() =>
      compileStringAsync('@import "orange";', {
        importers: [
          {
            canonicalize: (url: string) => new URL(`u:${url}`),
            load() {
              throw 'this import is bad actually';
            },
          },
        ],
      })
    ).toThrowSassException({line: 0});
  });
});

describe("compileString()'s importer option", () => {
  it('loads relative imports from the entrypoint', () => {
    const result = compileString('@import "orange";', {
      importer: {
        canonicalize: (url: string) => {
          expect(url).toBe('u:orange');
          return new URL(url);
        },
        load: (url: typeof URL) => {
          const color = url.pathname;
          return {contents: `.${color} {color: ${color}}`, syntax: 'scss'};
        },
      },
      url: new URL('u:entrypoint'),
    });

    expect(result.css).toBe('.orange {\n  color: orange;\n}');
  });

  it("loads imports relative to the entrypoint's URL", () => {
    const result = compileString('@import "baz/qux";', {
      importer: {
        canonicalize: (url: string) => {
          expect(url).toBe('u:foo/baz/qux');
          return new URL(`${url}/bang`);
        },
        load: (url: typeof URL) => ({
          contents: `a {result: "${url.pathname}"}`,
          syntax: 'scss',
        }),
      },
      url: new URL('u:foo/bar'),
    });

    expect(result.css).toBe('a {\n  result: "foo/baz/qux/bang";\n}');
  });

  it('takes precedence over the importer list for relative URLs', () => {
    const result = compileString('@import "other";', {
      importers: [
        {
          canonicalize() {
            throw 'canonicalize() should not be called';
          },
          load() {
            throw 'load() should not be called';
          },
        },
      ],
      url: new URL('o:style.scss'),
      importer: {
        canonicalize: (url: string) => new URL(url),
        load: () => ({contents: 'a {from: relative}', syntax: 'scss'}),
      },
    });
    expect(result.css).toBe('a {\n  from: relative;\n}');
  });

  it("doesn't load absolute imports", () => {
    const result = compileString('@import "u:orange";', {
      importer: {
        canonicalize: () => {
          throw 'Should not be called';
        },
        load: () => {
          throw 'Should not be called';
        },
      },
      importers: [
        {
          canonicalize: (url: string) => {
            expect(url).toBe('u:orange');
            return new URL(url);
          },
          load: (url: typeof URL) => {
            const color = url.pathname;
            return {contents: `.${color} {color: ${color}}`, syntax: 'scss'};
          },
        },
      ],
      url: new URL('x:entrypoint'),
    });

    expect(result.css).toBe('.orange {\n  color: orange;\n}');
  });

  it("doesn't load from other importers", () => {
    const result = compileString('@import "u:midstream";', {
      importer: {
        canonicalize: () => {
          throw 'Should not be called';
        },
        load: () => {
          throw 'Should not be called';
        },
      },
      importers: [
        {
          canonicalize: (url: string) => new URL(url),
          load: (url: typeof URL) => {
            if (url.pathname === 'midstream') {
              return {contents: "@import 'orange';", syntax: 'scss'};
            } else {
              const color = url.pathname;
              return {contents: `.${color} {color: ${color}}`, syntax: 'scss'};
            }
          },
        },
      ],
      url: new URL('x:entrypoint'),
    });

    expect(result.css).toBe('.orange {\n  color: orange;\n}');
  });

  it('importer order is preserved for absolute imports', () => {
    // The second importer should only be invoked once, because when the
    // "first:other" import is resolved it should be passed to the first
    // importer first despite being in the second importer's file.
    let secondCalled = false;
    const result = compileString('@import "second:other";', {
      importers: [
        {
          canonicalize: (url: string) =>
            url.startsWith('first:') ? new URL(url) : null,
          load: () => ({
            contents: 'a {from: first}',
            syntax: 'scss',
          }),
        },
        {
          canonicalize: (url: string) => {
            if (secondCalled) {
              throw 'Second importer should only be called once.';
            }
            secondCalled = true;
            return url.startsWith('second:') ? new URL(url) : null;
          },
          load: () => ({contents: '@import "first:other";', syntax: 'scss'}),
        },
      ],
    });

    expect(result.css).toBe('a {\n  from: first;\n}');
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

describe('when importer does not return string contents', () => {
  it('throws an error in sync mode', () => {
    expect(() => {
      compileString('@import "other";', {
        importers: [
          {
            canonicalize: (url: string) => new URL(`u:${url}`),
            load() {
              return {
                // Need to force an invalid type to test bad-type handling.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                contents: 123 as any,
                syntax: 'scss',
              };
            },
          },
        ],
      });
    }).toThrowSassException({
      line: 0,
      includes: `Invalid argument (contents): must be a string but was: ${
        sassImpl === 'sass-embedded' ? 'Number' : 'number'
      }`,
    });
  });

  it('throws an error in async mode', async () => {
    await expectAsync(async () => {
      await compileStringAsync('@import "other";', {
        importers: [
          {
            canonicalize: (url: string) => new URL(`u:${url}`),
            load() {
              return {
                // Need to force an invalid type to test bad-type handling.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                contents: 123 as any,
                syntax: 'scss',
              };
            },
          },
        ],
      });
    }).toThrowSassException({
      line: 0,
      includes: `Invalid argument (contents): must be a string but was: ${
        sassImpl === 'sass-embedded' ? 'Number' : 'number'
      }`,
    });
  });
});

it('throws an ArgumentError when the result sourceMapUrl is missing a scheme', () => {
  expect(() => {
    compileString('@import "other";', {
      importers: [
        {
          canonicalize: (url: string) => new URL(`u:${url}`),
          load() {
            return {
              contents: '',
              syntax: 'scss',
              sourceMapUrl: {} as typeof URL,
            };
          },
        },
      ],
    });
  }).toThrowSassException({
    line: 0,
    includes: 'Invalid argument (sourceMapUrl): must be absolute',
  });
});

/**
 * Returns an importer that asserts that `fromImport` is `expected`, and
 * otherwise imports exclusively empty stylesheets.
 */
function expectFromImport(expected: boolean): Importer<'sync'> {
  return {
    canonicalize(url: string, {fromImport}: {fromImport: boolean}) {
      expect(fromImport).toBe(expected);
      return new URL(`u:${url}`);
    },
    load: () => ({contents: '', syntax: 'scss'}),
  };
}
