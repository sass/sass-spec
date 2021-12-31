// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import * as p from 'path';
import * as sass from 'sass';

import {sandbox} from '../sandbox';
import {skipForImpl, captureStdio, captureStdioAsync} from '../utils';

skipForImpl('sass-embedded', () => {
  describe('renderSync()', () => {
    it('one of data and file must be set', () => {
      expect(() =>
        sass.renderSync({} as sass.LegacyOptions<'sync'>)
      ).toThrowLegacyException();
    });

    describe('with file:', () => {
      it('renders a file', () =>
        sandbox(dir => {
          dir.write({'test.scss': 'a {b: c}'});
          expect(
            sass.renderSync({file: dir('test.scss')}).css.toString()
          ).toEqualIgnoringWhitespace('a { b: c; }');
        }));

      it('renders a file from a relative path', () =>
        sandbox(dir => {
          dir.write({'test.scss': 'a {b: c}'});
          dir.chdir(() => {
            expect(
              sass.renderSync({file: 'test.scss'}).css.toString()
            ).toEqualIgnoringWhitespace('a { b: c; }');
          });
        }));

      it('renders a file with the indented syntax', () =>
        sandbox(dir => {
          dir.write({'test.sass': 'a\n  b: c'});
          expect(
            sass.renderSync({file: dir('test.sass')}).css.toString()
          ).toEqualIgnoringWhitespace('a { b: c; }');
        }));

      describe('loads', () => {
        it('suppports relative imports for a file', () =>
          sandbox(dir => {
            dir.write({
              '_other.scss': 'a {b: c}',
              'importer.scss': '@import "other";',
            });
            expect(
              sass.renderSync({file: dir('importer.scss')}).css.toString()
            ).toEqualIgnoringWhitespace('a { b: c; }');
          }));

        // Regression test for sass/dart-sass#284
        it('supports relative imports for a file from a relative path', () =>
          sandbox(dir => {
            dir.write({
              '_other.scss': 'a {b: c}',
              'subdir/importer.scss': '@import "../other";',
            });
            dir.chdir(() => {
              expect(
                sass.renderSync({file: 'subdir/importer.scss'}).css.toString()
              ).toEqualIgnoringWhitespace('a { b: c; }');
            });
          }));

        it('supports absolute path imports', () =>
          sandbox(dir => {
            dir.write({
              '_other.scss': 'a {b: c}',
              // Node Sass parses imports as paths, not as URLs, so the absolute
              // path should work here.
              'importer.scss': `@import "${dir('_other.scss').replace(
                /\\/g,
                '\\\\'
              )}";`,
            });
            expect(
              sass.renderSync({file: dir('importer.scss')}).css.toString()
            ).toEqualIgnoringWhitespace('a { b: c; }');
          }));

        it('supports import-only files', () =>
          sandbox(dir => {
            dir.write({
              '_other.scss': 'a {b: regular}',
              '_other.import.scss': 'a {b: import-only}',
              'importer.scss': '@import "other";',
            });
            expect(
              sass.renderSync({file: dir('importer.scss')}).css.toString()
            ).toEqualIgnoringWhitespace('a { b: import-only; }');
          }));

        it('supports mixed `@use` and `@import`', () =>
          sandbox(dir => {
            dir.write({
              '_other.scss': 'a {b: regular}',
              '_other.import.scss': 'a {b: import-only}',
              'importer.scss': '@use "other"; @import "other";',
            });
            expect(
              sass.renderSync({file: dir('importer.scss')}).css.toString()
            ).toEqualIgnoringWhitespace(
              'a { b: regular; } a { b: import-only; }'
            );
          }));
      });
    });

    describe('with data:', () => {
      it('renders a string', () =>
        expect(
          sass.renderSync({data: 'a {b: c}'}).css.toString()
        ).toEqualIgnoringWhitespace('a { b: c; }'));

      describe('loads', () => {
        it('supports load paths', () =>
          sandbox(dir => {
            dir.write({'test.scss': 'a {b: c}'});
            expect(
              sass
                .renderSync({data: '@import "test"', includePaths: [dir.root]})
                .css.toString()
            ).toEqualIgnoringWhitespace('a { b: c; }');
          }));

        it('supports SASS_PATH', () =>
          sandbox(dir => {
            dir.write({
              'dir1/test1.scss': 'a {b: c}',
              'dir2/test2.scss': 'x {y: z}',
            });

            withSassPath([dir('dir1'), dir('dir2')], () =>
              expect(
                sass
                  .renderSync({data: '@import "test1"; @import "test2"'})
                  .css.toString()
              ).toEqualIgnoringWhitespace('a { b: c; } x { y: z; }')
            );
          }));

        it('load paths take precedence over SASS_PATH', () =>
          sandbox(dir => {
            dir.write({
              'dir1/test.scss': 'a {b: c}',
              'dir2/test.scss': 'x {y: z}',
            });

            withSassPath([dir('dir1')], () =>
              expect(
                sass
                  .renderSync({
                    data: '@import "test"',
                    includePaths: [dir('dir2')],
                  })
                  .css.toString()
              ).toEqualIgnoringWhitespace('x { y: z; }')
            );
          }));

        // Regression test for sass/dart-sass#314
        it('a file imported through a relative load path supports relative imports', () =>
          sandbox(dir => {
            dir.write({
              'sub/_midstream.scss': '@import "upstream"',
              'sub/_upstream.scss': 'a {b: c}',
            });

            expect(
              sass
                .renderSync({
                  data: '@import "sub/midstream"',
                  includePaths: [p.relative(process.cwd(), dir.root)],
                })
                .css.toString()
            ).toEqualIgnoringWhitespace('a { b: c; }');
          }));
      });
    });

    describe('with both data: and file:', () => {
      it('uses the data parameter as a source', () =>
        sandbox(dir => {
          dir.write({'test.scss': 'a {b: c}'});
          expect(
            sass
              .renderSync({file: dir('test.scss'), data: 'x {y: z}'})
              .css.toString()
          ).toEqualIgnoringWhitespace('x { y: z; }');
        }));

      it("doesn't require the file path to exist", () =>
        sandbox(dir =>
          expect(
            sass
              .renderSync({file: dir('non-existent.scss'), data: 'a {b: c}'})
              .css.toString()
          ).toEqualIgnoringWhitespace('a { b: c; }')
        ));

      it('resolves loads relative to the file path to exist', () =>
        sandbox(dir => {
          dir.write({'_other.scss': 'a {b: c}'});
          expect(
            sass
              .renderSync({file: dir('test.scss'), data: '@import "other"'})
              .css.toString()
          ).toEqualIgnoringWhitespace('a { b: c; }');
        }));
    });
  });
});

describe('render()', () => {
  it('renders a string', done => {
    sass.render({data: 'a {b: c}'}, (err, result) => {
      expect(err).toBeFalsy();
      expect(result!.css.toString()).toBe('a {\n  b: c;\n}');
      done();
    });
  });

  it('throws a LegacyException', done => {
    sass.render({data: 'a {b: }'}, (err, result) => {
      expect(result).toBeFalsy();
      const error = err as sass.LegacyException;
      expect(error.formatted).toBeString();
      expect(error.line).toBe(1);
      expect(error.column).toBeNumber();
      expect(error.status).toBeNumber();
      expect(error.file).toBe('stdin');
      done();
    });
  });
});

skipForImpl('sass-embedded', () => {
  describe('messages', () => {
    it('emits warnings on stderr by default', () => {
      const stdio = captureStdio(() => sass.renderSync({data: '@warn heck'}));
      expect(stdio.out).toBeEmpty();
      expect(stdio.err).not.toBeEmpty();
    });

    it('emits debug messages on stderr by default', () => {
      const stdio = captureStdio(() => sass.renderSync({data: '@debug heck'}));
      expect(stdio.out).toBeEmpty();
      expect(stdio.err).not.toBeEmpty();
    });
  });

  describe('options', () => {
    describe('indentedSyntax', () => {
      it('renders the indented syntax', () =>
        expect(
          sass
            .renderSync({data: 'a\n  b: c', indentedSyntax: true})
            .css.toString()
        ).toEqualIgnoringWhitespace('a { b: c; }'));

      it('takes precedence over the file extension', () =>
        sandbox(dir => {
          dir.write({'test.scss': 'a\n  b: c'});
          expect(
            sass
              .renderSync({file: dir('test.scss'), indentedSyntax: true})
              .css.toString()
          ).toEqualIgnoringWhitespace('a { b: c; }');
        }));
    });

    describe('outputStyle', () => {
      it('supports the expanded output style', () =>
        expect(
          sass
            .renderSync({data: 'a {b: c}', outputStyle: 'expanded'})
            .css.toString()
        ).toEqualIgnoringWhitespace('a {\n  b: c;\n}'));

      it('supports the compressed output style', () =>
        expect(
          sass
            .renderSync({data: 'a {b: c}', outputStyle: 'compressed'})
            .css.toString()
        ).toEqualIgnoringWhitespace('a{b:c}'));

      it("doesn't support unknown output styles", () =>
        expect(() =>
          sass.renderSync({
            data: 'a {b: c}',
            outputStyle: 'abcd' as sass.OutputStyle,
          })
        ).toThrowLegacyException());
    });

    describe('indentType', () => {
      it('allows tab indentation', () =>
        expect(
          sass.renderSync({data: 'a {b: c}', indentType: 'tab'}).css.toString()
        ).toBe('a {\n\t\tb: c;\n}'));

      it('allows unknown indentation names', () =>
        expect(
          sass
            .renderSync({data: 'a {b: c}', indentType: 'abcd' as 'space'})
            .css.toString()
        ).toBe('a {\n  b: c;\n}'));
    });

    describe('charset', () => {
      it('adds a @charset by default for non-ASCII stylesheets', () =>
        expect(
          sass.renderSync({data: 'a {b: é}'}).css.toString()
        ).toEqualIgnoringWhitespace('@charset "UTF-8"; a { b: é; }'));

      it("doesn't add a @charset if charset is false", () =>
        expect(
          sass.renderSync({data: 'a {b: é}', charset: false}).css.toString()
        ).toEqualIgnoringWhitespace('a { b: é; }'));
    });

    describe('linefeed', () => {
      it('supports cr', () =>
        expect(
          sass.renderSync({data: 'a {b: c}', linefeed: 'cr'}).css.toString()
        ).toBe('a {\r  b: c;\r}'));

      it('supports crlf', () =>
        expect(
          sass.renderSync({data: 'a {b: c}', linefeed: 'crlf'}).css.toString()
        ).toBe('a {\r\n  b: c;\r\n}'));

      it('supports lfcr', () =>
        expect(
          sass.renderSync({data: 'a {b: c}', linefeed: 'lfcr'}).css.toString()
        ).toBe('a {\n\r  b: c;\n\r}'));

      it('supports unknown names', () =>
        expect(
          sass
            .renderSync({data: 'a {b: c}', linefeed: 'abcd' as 'cr'})
            .css.toString()
        ).toBe('a {\n  b: c;\n}'));
    });

    describe('indentWidth', () => {
      it('allows a number', () =>
        expect(
          sass.renderSync({data: 'a {b: c}', indentWidth: 10}).css.toString()
        ).toBe('a {\n          b: c;\n}'));

      it('allows a string', () =>
        expect(
          sass
            .renderSync({
              data: 'a {b: c}',
              indentWidth: '1' as unknown as number,
            })
            .css.toString()
        ).toBe('a {\n b: c;\n}'));
    });

    describe('quietDeps', () => {
      describe('in a relative load from the entrypoint', () => {
        it('emits @warn', () =>
          sandbox(dir => {
            dir.write({
              'test.scss': '@use "other"',
              '_other.scss': '@warn heck',
            });

            const stdio = captureStdio(() =>
              sass.renderSync({file: dir('test.scss'), quietDeps: true})
            );
            expect(stdio.out).toBeEmpty();
            expect(stdio.err).toContain('heck');
          }));

        it('emits @debug', () =>
          sandbox(dir => {
            dir.write({
              'test.scss': '@use "other"',
              '_other.scss': '@debug heck',
            });

            const stdio = captureStdio(() =>
              sass.renderSync({file: dir('test.scss'), quietDeps: true})
            );
            expect(stdio.out).toBeEmpty();
            expect(stdio.err).toContain('heck');
          }));

        it('emits parser warnings', () =>
          sandbox(dir => {
            dir.write({
              'test.scss': '@use "other"',
              '_other.scss': 'a {b: c && d}',
            });

            const stdio = captureStdio(() =>
              sass.renderSync({file: dir('test.scss'), quietDeps: true})
            );
            expect(stdio.out).toBeEmpty();
            expect(stdio.err).toContain('&&');
          }));

        it('emits evaluation warnings', () =>
          sandbox(dir => {
            dir.write({
              'test.scss': '@use "other"',
              '_other.scss': '#{blue} {b: c}',
            });

            const stdio = captureStdio(() =>
              sass.renderSync({file: dir('test.scss'), quietDeps: true})
            );
            expect(stdio.out).toBeEmpty();
            expect(stdio.err).toContain('blue');
          }));
      });

      describe('in a load path load', () => {
        it('emits @warn', () =>
          sandbox(dir => {
            dir.write({
              'test.scss': '@use "other"',
              'dir/_other.scss': '@warn heck',
            });

            const stdio = captureStdio(() =>
              sass.renderSync({
                file: dir('test.scss'),
                quietDeps: true,
                includePaths: [dir('dir')],
              })
            );
            expect(stdio.out).toBeEmpty();
            expect(stdio.err).toContain('heck');
          }));

        it('emits @debug', () =>
          sandbox(dir => {
            dir.write({
              'test.scss': '@use "other"',
              'dir/_other.scss': '@debug heck',
            });

            const stdio = captureStdio(() =>
              sass.renderSync({
                file: dir('test.scss'),
                quietDeps: true,
                includePaths: [dir('dir')],
              })
            );
            expect(stdio.out).toBeEmpty();
            expect(stdio.err).toContain('heck');
          }));

        it("doesn't emit parser warnings", () =>
          sandbox(dir => {
            dir.write({
              'test.scss': '@use "other"',
              'dir/_other.scss': 'a {b: c && d}',
            });

            const stdio = captureStdio(() =>
              sass.renderSync({
                file: dir('test.scss'),
                quietDeps: true,
                includePaths: [dir('dir')],
              })
            );
            expect(stdio.out).toBeEmpty();
            expect(stdio.err).toBeEmpty();
          }));

        it("doesn't emit evaluation warnings", () =>
          sandbox(dir => {
            dir.write({
              'test.scss': '@use "other"',
              'dir/_other.scss': '#{blue} {b: c}',
            });

            const stdio = captureStdio(() =>
              sass.renderSync({
                file: dir('test.scss'),
                quietDeps: true,
                includePaths: [dir('dir')],
              })
            );
            expect(stdio.out).toBeEmpty();
            expect(stdio.err).toBeEmpty();
          }));
      });
    });

    describe('verbose', () => {
      const data = `
      $_: call("inspect", null);
      $_: call("rgb", 0, 0, 0);
      $_: call("nth", null, 1);
      $_: call("join", null, null);
      $_: call("if", true, 1, 2);
      $_: call("hsl", 0, 100%, 100%);
      $_: 1/2;
      $_: 1/3;
      $_: 1/4;
      $_: 1/5;
      $_: 1/6;
      $_: 1/7;
    `;

      it("when it's true, prints all deprecation warnings", () => {
        const stdio = captureStdio(() =>
          sass.renderSync({
            data,
            verbose: true,
          })
        );
        expect(stdio.out).toBeEmpty();
        expect(stdio.err.match(/call\(\)/g)).toBeArrayOfSize(6);
        expect(stdio.err.match(/math\.div/g)).toBeArrayOfSize(6);
      });

      it("when it's false, prints only five of each deprecation warning", () => {
        const stdio = captureStdio(() =>
          sass.renderSync({
            data,
          })
        );
        expect(stdio.out).toBeEmpty();
        expect(stdio.err.match(/call\(\)/g)).toBeArrayOfSize(5);
        expect(stdio.err.match(/math\.div/g)).toBeArrayOfSize(5);
      });
    });

    describe('logger', () => {
      describe('render', () => {
        it('emits to stderr by default', async () => {
          const stdio = await captureStdioAsync(async () => {
            await new Promise((resolve, reject) => {
              sass.render({data: '@warn heck; @debug heck'}, (err, result) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(result);
                }
              });
            });
          });

          expect(stdio.out).toBeEmpty();
          expect(stdio.err).not.toBeEmpty();
        });

        it("doesn't emit to stderr with callbacks", async () => {
          const stdio = await captureStdioAsync(async () => {
            await new Promise((resolve, reject) => {
              sass.render(
                {
                  data: '@warn heck warn; @debug heck debug',
                  logger: {
                    warn(message) {
                      expect(message).toBe('heck warn');
                    },
                    debug(message) {
                      expect(message).toBe('heck debug');
                    },
                  },
                },
                (err, result) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(result);
                  }
                }
              );
            });
          });

          expect(stdio.out).toBeEmpty();
          expect(stdio.err).toBeEmpty();
        });
      });
    });
  });

  describe('the result object', () => {
    it('includes the filename', () =>
      sandbox(dir => {
        dir.write({'test.scss': 'a {b: c}'});
        expect(sass.renderSync({file: dir('test.scss')}).stats.entry).toBe(
          dir('test.scss')
        );
      }));

    it('includes data without a filename', () =>
      expect(sass.renderSync({data: 'a {b: c}'}).stats.entry).toBe('data'));

    it('includes timing information', () => {
      const {stats} = sass.renderSync({data: 'a {b: c}'});
      expect(stats.start).toBeNumber();
      expect(stats.end).toBeNumber();
      expect(stats.start).toBeLessThanOrEqual(stats.end);
      expect(stats.duration).toBe(stats.end - stats.start);
    });

    describe('includedFiles', () => {
      it('contains the root path with a file: parameter', () =>
        sandbox(dir => {
          dir.write({'test.scss': 'a {b: c}'});
          expect(
            sass.renderSync({file: dir('test.scss')}).stats.includedFiles
          ).toContain(p.resolve(dir('test.scss')));
        }));

      it("doesn't contain the root path with a data: parameter", () =>
        expect(
          sass.renderSync({data: 'a {b: c}'}).stats.includedFiles
        ).toBeEmpty());

      it('contains imported paths', () =>
        sandbox(dir => {
          dir.write({
            '_other.scss': 'a {b: c}',
            'test.scss': '@import "other"',
          });
          expect(
            sass.renderSync({file: dir('test.scss')}).stats.includedFiles
          ).toContain(p.resolve(dir('_other.scss')));
        }));

      it('only contains each path once', () =>
        sandbox(dir => {
          dir.write({
            '_other.scss': 'a {b: c}',
            'test.scss': '@import "other"',
          });
          expect(
            sass
              .renderSync({file: dir('test.scss')})
              .stats.includedFiles.filter(
                path => path === p.resolve(dir('_other.scss'))
              )
          ).toBeArrayOfSize(1);
        }));
    });
  });

  describe('throws a LegacyException', () => {
    it('for a parse error in a file', () =>
      sandbox(dir => {
        dir.write({'test.scss': 'a {b: }'});
        expect(
          () => sass.renderSync({file: dir('test.scss')}).stats.includedFiles
        ).toThrowLegacyException({line: 1, file: p.resolve(dir('test.scss'))});
      }));

    it('for a parse error in a string', () =>
      expect(
        () => sass.renderSync({data: 'a {b: }'}).stats.includedFiles
      ).toThrowLegacyException({line: 1, file: 'stdin'}));

    it('for a runtime error in a file', () =>
      sandbox(dir => {
        dir.write({'test.scss': 'a {b: 1 % a}'});
        expect(
          () => sass.renderSync({file: dir('test.scss')}).stats.includedFiles
        ).toThrowLegacyException({line: 1, file: p.resolve(dir('test.scss'))});
      }));

    it('for a runtime error in a string', () =>
      expect(
        () => sass.renderSync({data: 'a {b: 1 % a}'}).stats.includedFiles
      ).toThrowLegacyException({line: 1, file: 'stdin'}));
  });
});

// Runs `callback` with the `SASS_PATH` environment variable set to `paths`.
function withSassPath<T>(paths: string[], callback: () => T): T {
  const oldValue = process.env.SASS_PATH;
  process.env.SASS_PATH = paths.join(p.delimiter);

  try {
    return callback();
  } finally {
    process.env.SASS_PATH = oldValue;
  }
}
