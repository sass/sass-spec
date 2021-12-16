// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import p from 'path';
import {URL} from 'url';

import {
  compile,
  compileAsync,
  compileString,
  compileStringAsync,
  OutputStyle,
} from 'sass';

import {skipForImpl, sandbox} from './utils';

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

      it("doesn't take its syntax from the URL's extension", () => {
        // Shouldn't parse the file as the indented syntax.
        expect(
          compileString('a {b: c}', {url: new URL('file:///foo.sass')}).css
        ).toBe('a {\n  b: c;\n}');
      });
    });

    skipForImpl('sass-embedded', () => {
      describe('loadedUrls', () => {
        it('is empty with no URL', () => {
          expect(compileString('a {b: c}').loadedUrls).toEqual([]);
        });

        it('contains the URL if one is passed', () => {
          const url = new URL('file:///foo.scss');
          expect(compileString('a {b: c}', {url}).loadedUrls).toEqual([url]);
        });

        it('contains an immediate dependency', () =>
          sandbox(dir => {
            const url = dir.url('input.scss');
            dir.write({'_other.scss': 'a {b: c}'});
            expect(compileString('@use "other"', {url}).loadedUrls).toEqual([
              url,
              dir.url('_other.scss'),
            ]);
          }));

        it('contains a transitive dependency', () =>
          sandbox(dir => {
            const url = dir.url('input.scss');
            dir.write({
              '_midstream.scss': '@use "upstream"',
              '_upstream.scss': 'a {b: c}',
            });
            expect(compileString('@use "midstream"', {url}).loadedUrls).toEqual(
              [url, dir.url('_midstream.scss'), dir.url('_upstream.scss')]
            );
          }));

        describe('contains a dependency only once', () => {
          it('for @use', () =>
            sandbox(dir => {
              const url = dir.url('input.scss');
              dir.write({
                '_left.scss': '@use "upstream"',
                '_right.scss': '@use "upstream"',
                '_upstream.scss': 'a {b: c}',
              });
              expect(
                compileString('@use "left"; @use "right"', {url}).loadedUrls
              ).toEqual([
                url,
                dir.url('_left.scss'),
                dir.url('_upstream.scss'),
                dir.url('_right.scss'),
              ]);
            }));

          it('for @import', () =>
            sandbox(dir => {
              const url = dir.url('input.scss');
              dir.write({
                '_left.scss': '@import "upstream"',
                '_right.scss': '@import "upstream"',
                '_upstream.scss': 'a {b: c}',
              });
              expect(
                compileString('@import "left"; @import "right"', {url})
                  .loadedUrls
              ).toEqual([
                url,
                dir.url('_left.scss'),
                dir.url('_upstream.scss'),
                dir.url('_right.scss'),
              ]);
            }));
        });
      });
    });

    it('url is used to resolve relative loads', () =>
      sandbox(dir => {
        dir.write({'foo/bar/_other.scss': 'a {b: c}'});

        expect(
          compileString('@use "other";', {
            url: dir.url('foo/bar/style.scss'),
          }).css
        ).toBe('a {\n  b: c;\n}');
      }));

    describe('loadPaths', () => {
      it('is used to resolve loads', () =>
        sandbox(dir => {
          dir.write({'foo/bar/_other.scss': 'a {b: c}'});

          expect(
            compileString('@use "other";', {
              loadPaths: [dir('foo/bar')],
            }).css
          ).toBe('a {\n  b: c;\n}');
        }));

      it('resolves relative paths', () =>
        sandbox(dir => {
          dir.write({'foo/bar/_other.scss': 'a {b: c}'});

          expect(
            compileString('@use "bar/other";', {
              loadPaths: [dir('foo')],
            }).css
          ).toBe('a {\n  b: c;\n}');
        }));

      it("resolves loads using later paths if earlier ones don't match", () =>
        sandbox(dir => {
          dir.write({'baz/_other.scss': 'a {b: c}'});

          expect(
            compileString('@use "other";', {
              loadPaths: [dir('foo'), dir('bar'), dir('baz')],
            }).css
          ).toBe('a {\n  b: c;\n}');
        }));

      it("doesn't take precedence over loads relative to the url", () =>
        sandbox(dir => {
          dir.write({
            'url/_other.scss': 'a {b: url}',
            'load-path/_other.scss': 'a {b: load path}',
          });

          expect(
            compileString('@use "other";', {
              loadPaths: [dir('load-path')],
              url: dir.url('url/input.scss'),
            }).css
          ).toBe('a {\n  b: url;\n}');
        }));

      it('uses earlier paths in preference to later ones', () =>
        sandbox(dir => {
          dir.write({
            'earlier/_other.scss': 'a {b: earlier}',
            'later/_other.scss': 'a {b: later}',
          });

          expect(
            compileString('@use "other";', {
              loadPaths: [dir('earlier'), dir('later')],
            }).css
          ).toBe('a {\n  b: earlier;\n}');
        }));
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
    });
  });

  describe('error', () => {
    skipForImpl('sass-embedded', () => {
      it('requires plain CSS with explicit syntax', () => {
        expect(() =>
          compileString('$a: b; c {d: $a}', {syntax: 'css'})
        ).toThrowSassException({line: 0, noUrl: true});
      });

      it('relative loads fail without a URL', () =>
        sandbox(dir => {
          dir.write({'other.scss': 'a {b: c}'});

          expect(() => compileString('@use "other";')).toThrowSassException({
            line: 0,
            noUrl: true,
          });
        }));

      describe('includes source span information', () => {
        it('in syntax errors', () =>
          sandbox(dir => {
            const url = dir.url('foo.scss');
            expect(() => compileString('a {b:', {url})).toThrowSassException({
              line: 0,
              url,
            });
          }));

        it('in runtime errors', () =>
          sandbox(dir => {
            const url = dir.url('foo.scss');
            expect(() =>
              compileString('@error "oh no"', {url})
            ).toThrowSassException({line: 0, url});
          }));
      });

      it('throws an error for an unrecognized style', () => {
        expect(() =>
          compileString('a {b: c}', {
            style: 'unrecognized style' as OutputStyle,
          })
        ).toThrow();
      });
    });

    it("doesn't throw a Sass exception for an argument error", () => {
      expect(() =>
        compileString('a {b: c}', {
          style: 'unrecognized style' as OutputStyle,
        })
      ).not.toThrowSassException();
    });

    it('is an instance of Error', () => {
      expect(() => compileString('a {b:')).toThrow(Error);
    });
  });
});

describe('compile', () => {
  describe('success', () => {
    it('compiles SCSS for a .scss file', () =>
      sandbox(dir => {
        dir.write({'input.scss': '$a: b; c {d: $a}'});
        expect(compile(dir('input.scss')).css).toBe('c {\n  d: b;\n}');
      }));

    it('compiles SCSS for a file with an unknown extension', () =>
      sandbox(dir => {
        dir.write({'input.asdf': '$a: b; c {d: $a}'});
        expect(compile(dir('input.asdf')).css).toBe('c {\n  d: b;\n}');
      }));

    it('compiles indented syntax for a .sass file', () =>
      sandbox(dir => {
        dir.write({'input.sass': 'a\n  b: c'});
        expect(compile(dir('input.sass')).css).toBe('a {\n  b: c;\n}');
      }));

    it('compiles plain CSS for a .css file', () =>
      sandbox(dir => {
        dir.write({'input.css': 'a {b: c}'});
        expect(compile(dir('input.css')).css).toBe('a {\n  b: c;\n}');
      }));

    skipForImpl('sass-embedded', () => {
      describe('loadedUrls', () => {
        it("includes a relative path's URL", () =>
          sandbox(dir => {
            dir.write({'input.scss': 'a {b: c}'});
            expect(compile(dir('input.scss')).loadedUrls).toEqual([
              dir.url('input.scss'),
            ]);
          }));

        it("includes an absolute path's URL", () =>
          sandbox(dir => {
            const path = p.resolve(dir('input.scss'));
            dir.write({'input.scss': 'a {b: c}'});
            expect(compile(path).loadedUrls).toEqual([dir.url('input.scss')]);
          }));

        it('contains a dependency', () =>
          sandbox(dir => {
            dir.write({
              'input.scss': '@use "other"',
              '_other.scss': 'a {b: c}',
            });
            expect(compile(dir('input.scss')).loadedUrls).toEqual([
              dir.url('input.scss'),
              dir.url('_other.scss'),
            ]);
          }));
      });
    });

    it('the path is used to resolve relative loads', () =>
      sandbox(dir => {
        dir.write({
          'foo/bar/input.scss': '@use "other"',
          'foo/bar/_other.scss': 'a {b: c}',
        });

        expect(compile(dir('foo/bar/input.scss')).css).toBe('a {\n  b: c;\n}');
      }));

    describe('loadPaths', () => {
      it('is used to resolve loads', () =>
        sandbox(dir => {
          dir.write({
            'input.scss': '@use "other"',
            'foo/bar/_other.scss': 'a {b: c}',
          });

          expect(
            compile(dir('input.scss'), {loadPaths: [dir('foo/bar')]}).css
          ).toBe('a {\n  b: c;\n}');
        }));

      it("doesn't take precedence over loads relative to the entrypoint", () =>
        sandbox(dir => {
          dir.write({
            'url/input.scss': '@use "other";',
            'url/_other.scss': 'a {b: url}',
            'load-path/_other.scss': 'a {b: load path}',
          });

          expect(
            compile(dir('url/input.scss'), {loadPaths: [dir('load-path')]}).css
          ).toBe('a {\n  b: url;\n}');
        }));
    });
  });

  skipForImpl('sass-embedded', () => {
    describe('error', () => {
      it('requires plain CSS for a .css file', () =>
        sandbox(dir => {
          dir.write({'input.css': '$a: b; c {d: $a}'});
          expect(() => compile(dir('input.css'))).toThrowSassException({
            line: 0,
            url: dir.url('input.css'),
          });
        }));

      describe("includes the path's URL", () => {
        it('in syntax errors', () =>
          sandbox(dir => {
            dir.write({'input.scss': 'a {b:'});
            expect(() => compile(dir('input.scss'))).toThrowSassException({
              line: 0,
              url: dir.url('input.scss'),
            });
          }));

        it('in runtime errors', () =>
          sandbox(dir => {
            dir.write({'input.scss': '@error "oh no"'});
            expect(() => compile(dir('input.scss'))).toThrowSassException({
              line: 0,
              url: dir.url('input.scss'),
            });
          }));
      });
    });
  });
});

describe('compileStringAsync returns a promise that', () => {
  it('succeeds when compilation succeeds', async () => {
    await expect(compileStringAsync('a {b: c}')).resolves.toMatchObject({
      css: 'a {\n  b: c;\n}',
    });
  });

  skipForImpl('sass-embedded', () => {
    describe('fails when compilation fails', () => {
      it('with a syntax error', async () => {
        await expect(() => compileStringAsync('a {b:')).toThrowSassException({
          line: 0,
        });
      });

      it('with a runtime error', async () => {
        await expect(() =>
          compileStringAsync('@error "oh no";')
        ).toThrowSassException({
          line: 0,
        });
      });
    });
  });
});

describe('compileAsync returns a promise that', () => {
  it('succeeds when compilation succeeds', () =>
    sandbox(async dir => {
      dir.write({'input.scss': 'a {b: c}'});
      await expect(compileAsync(dir('input.scss'))).resolves.toMatchObject({
        css: 'a {\n  b: c;\n}',
      });
    }));

  skipForImpl('sass-embedded', () => {
    describe('fails when compilation fails', () => {
      it('with a syntax error', () =>
        sandbox(async dir => {
          dir.write({'input.scss': 'a {b:'});
          await expect(() =>
            compileAsync(dir('input.scss'))
          ).toThrowSassException({
            line: 0,
          });
        }));

      it('with a runtime error', () =>
        sandbox(async dir => {
          dir.write({'input.scss': '@error "oh no";'});
          await expect(() =>
            compileAsync(dir('input.scss'))
          ).toThrowSassException({
            line: 0,
          });
        }));
    });
  });
});
