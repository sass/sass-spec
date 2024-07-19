// Copyright 2022 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import * as fs from 'fs';
import * as p from 'path';
import * as sass from 'sass';

import {sandbox} from '../sandbox';
import {sassImpl, skipForImpl, spy} from '../utils';

it('imports cascade through importers', () =>
  expect(
    sass
      .renderSync({
        data: "@use 'foo'",
        importer: [
          (url: string) => (url === 'foo' ? {contents: '@use "bar"'} : null),
          (url: string) => (url === 'bar' ? {contents: '@use "baz"'} : null),
          (url: string) => (url === 'baz' ? {contents: 'a {b: c}'} : null),
        ],
      })
      .css.toString()
  ).toEqualIgnoringWhitespace('a { b: c; }'));

it('an empty object means an empty file', () =>
  expect(
    sass
      .renderSync({
        data: "@use 'foo'",
        importer: () => ({} as sass.LegacyImporterResult),
      })
      .css.toString()
  ).toEqualIgnoringWhitespace(''));

describe('import precedence:', () => {
  describe('in sandbox dir', () => {
    it('relative file is #1', () =>
      sandbox(dir => {
        dir.write({
          'sub/test.scss': 'a {from: relative}',
          'sub/base.scss': '@use "test"',
        });

        dir.chdir(() =>
          expect(
            sass
              .renderSync({
                file: dir('sub/base.scss'),
                importer: () => ({contents: 'a {from: importer}'}),
              })
              .css.toString()
          ).toEqualIgnoringWhitespace('a { from: relative; }')
        );
      }));

    it('importer is #2', () =>
      sandbox(dir => {
        dir.write({'test.scss': 'a {from: cwd}'});

        dir.chdir(() =>
          expect(
            sass
              .renderSync({
                data: '@use "test"',
                importer: () => ({contents: 'a {from: importer}'}),
              })
              .css.toString()
          ).toEqualIgnoringWhitespace('a { from: importer; }')
        );
      }));

    it('CWD is #3', () =>
      sandbox(dir => {
        dir.write({
          'test.scss': 'a {from: cwd}',
          'sub/test.scss': 'a {from: load path}',
        });

        dir.chdir(() =>
          expect(
            sass
              .renderSync({
                data: '@use "test"',
                includePaths: [dir('sub')],
              })
              .css.toString()
          ).toEqualIgnoringWhitespace('a { from: cwd; }')
        );
      }));

    // Regression test for embedded host.
    it('CWD works when neither importer nor includePaths are specified', () =>
      sandbox(dir => {
        dir.write({
          'sub/test.scss': 'a {from: cwd}',
          'sub/base.scss': '@use "sub/test"',
        });

        dir.chdir(() =>
          expect(
            sass
              .renderSync({
                file: dir('sub/base.scss'),
              })
              .css.toString()
          ).toEqualIgnoringWhitespace('a { from: cwd; }')
        );
      }));

    // Regression test for embedded host.
    it('falls back to load path if imports list is empty', () =>
      sandbox(dir => {
        dir.write({
          'test.scss': 'a {from: load path}',
        });

        expect(
          sass
            .renderSync({
              data: '@use "test"',
              includePaths: [dir.root],
              importer: [],
            })
            .css.toString()
        ).toEqualIgnoringWhitespace('a { from: load path; }');
      }));
  });
});

describe('with contents', () => {
  it('imports a file by contents', () =>
    expect(
      sass
        .renderSync({
          data: '@use "foo"',
          importer: () => ({contents: 'a {b: c}'}),
        })
        .css.toString()
    ).toEqualIgnoringWhitespace('a { b: c; }'));

  it('contents take precedence over file name', () =>
    sandbox(dir => {
      dir.write({'test.scss': 'a {from: path}'});

      expect(
        sass
          .renderSync({
            data: '@use "test"',
            importer: () => ({
              contents: 'a {from: contents}',
              file: dir('test.scss'),
            }),
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { from: contents; }');
    }));

  it('contents use file name as canonical url', () =>
    expect(
      sass.renderSync({
        data: '@use "foo"',
        importer: () => ({
          contents: '',
          file: 'bar',
        }),
      }).stats.includedFiles
    ).toContain('bar'));

  // Regression test for sass/dart-sass#1410.
  it('passes through an absolute file path', () =>
    expect(
      sass.renderSync({
        data: '@use "foo"',
        importer: () => ({
          contents: '',
          file: p.resolve('bar'),
        }),
      }).stats.includedFiles
    ).toContain(p.resolve('bar')));

  // Regression test for sass/dart-sass#2208.
  it('imports the same relative url from different base urls as different files', () =>
    sandbox(dir => {
      const importer = spy((url: string, prev: string) => {
        return url === 'x'
          ? {
              contents: `x {from: ${p.basename(p.dirname(prev))}}`,
              file: p.resolve(p.dirname(prev), 'x.scss'),
            }
          : null;
      });

      dir.write({
        'main.scss': '@use "sub1/test"; @use "sub1/sub2/test" as test2',
        'sub1/test.scss': '@use "x"',
        'sub1/sub2/test.scss': '@use "x"',
      });

      expect(
        sass
          .renderSync({
            file: dir('main.scss'),
            importer,
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('x { from: sub1; } x { from: sub2; }');

      expect(importer).toHaveBeenCalledTimes(2);
    }));
});

describe('with a file redirect', () => {
  it('imports the chosen file', () =>
    sandbox(dir => {
      dir.write({'test.scss': 'a {b: c}'});

      expect(
        sass
          .renderSync({
            data: '@use "foo"',
            importer: () => ({file: dir('test.scss')}),
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: c; }');
    }));

  it('supports the indented syntax', () =>
    sandbox(dir => {
      dir.write({'test.sass': 'a\n  b: c'});

      expect(
        sass
          .renderSync({
            data: '@use "foo"',
            importer: () => ({file: dir('test.sass')}),
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: c; }');
    }));

  it('supports plain CSS', () =>
    sandbox(dir => {
      // An import in plain CSS is only ever interpreted as a plain CSS import.
      dir.write({'test.css': '@import "bar"'});

      expect(
        sass
          .renderSync({
            data: '@use "foo"',
            importer: () => ({file: dir('test.css')}),
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('@import "bar";');
    }));

  it('supports partials', () =>
    sandbox(dir => {
      dir.write({'_target.scss': 'a {b: c}'});

      expect(
        sass
          .renderSync({
            data: '@use "foo"',
            importer: () => ({file: dir('target.scss')}),
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: c; }');
    }));

  it('supports import-only files', () =>
    sandbox(dir => {
      dir.write({
        'target.scss': 'a {b: regular}',
        'target.import.scss': 'a {b: import-only}',
      });

      expect(
        sass
          .renderSync({
            data: '@import "foo"',
            importer: () => ({file: dir('target.scss')}),
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: import-only; }');
    }));

  it('supports mixed `@use` and `@import`', () =>
    sandbox(dir => {
      dir.write({
        'target.scss': 'a {b: regular}',
        'target.import.scss': 'a {b: import-only}',
      });

      expect(
        sass
          .renderSync({
            data: '@use "foo"; @import "foo"',
            importer: () => ({file: dir('target.scss')}),
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: regular; } a { b: import-only; }');
    }));

  it('may be extensionless', () =>
    sandbox(dir => {
      dir.write({'test.scss': 'a {b: c}'});

      expect(
        sass
          .renderSync({
            data: '@use "foo"',
            importer: () => ({file: dir('test')}),
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: c; }');
    }));

  it('is resolved relative to the base file', () =>
    sandbox(dir => {
      dir.write({
        '_other.scss': 'a {b: c}',
        'test.scss': '@use "foo"',
      });

      expect(
        sass
          .renderSync({
            file: dir('test.scss'),
            importer: () => ({file: '_other.scss'}),
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: c; }');
    }));

  it('puts the absolute path in includedFiles', () =>
    sandbox(dir => {
      dir.write({
        '_other.scss': 'a {b: c}',
        'test.scss': '@use "foo"',
      });

      const result = sass.renderSync({
        file: dir('test.scss'),
        importer: () => ({file: '_other.scss'}),
      });

      expect(result.stats.includedFiles).toContain(dir('test.scss'));
      expect(result.stats.includedFiles).toContain(dir('_other.scss'));
    }));

  it('is resolved relative to include paths', () =>
    sandbox(dir => {
      dir.write({
        'test.scss': 'a {b: c}',
      });

      expect(
        sass
          .renderSync({
            data: '@use "foo"',
            includePaths: [dir.root],
            importer: () => ({file: 'test.scss'}),
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: c; }');
    }));

  it('relative to the base file takes precedence over include paths', () =>
    sandbox(dir => {
      dir.write({
        'test.scss': '@use "foo"',
        '_other.scss': 'a {from: relative}',
        'sub/_other.scss': 'a {from: load path}',
      });

      expect(
        sass
          .renderSync({
            file: dir('test.scss'),
            includePaths: [dir('sub')],
            importer: () => ({file: '_other.scss'}),
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { from: relative; }');
    }));

  describe('in the sandbox directory', () => {
    it('is resolved relative to the CWD', () =>
      sandbox(dir => {
        dir.write({'test.scss': 'a {b: c}'});

        dir.chdir(() =>
          expect(
            sass
              .renderSync({
                data: '@use "foo"',
                importer: () => ({file: 'test.scss'}),
              })
              .css.toString()
          ).toEqualIgnoringWhitespace('a { b: c; }')
        );
      }));

    it('file-relative takes precedence over the CWD', () =>
      sandbox(dir => {
        dir.write({
          '_other.scss': 'a {from: cwd}',
          'sub/test.scss': '@use "foo"',
          'sub/_other.scss': 'a {from: relative}',
        });

        dir.chdir(() =>
          expect(
            sass
              .renderSync({
                file: dir('sub/test.scss'),
                importer: () => ({file: '_other.scss'}),
              })
              .css.toString()
          ).toEqualIgnoringWhitespace('a { from: relative; }')
        );
      }));

    it('the CWD takes precedence over include paths', () =>
      sandbox(dir => {
        dir.write({
          '_other.scss': 'a {from: cwd}',
          'test.scss': '@use "foo"',
          'sub/_other.scss': 'a {from: load path}',
        });

        dir.chdir(() =>
          expect(
            sass
              .renderSync({
                file: dir('test.scss'),
                includePaths: [dir('sub')],
                importer: () => ({file: '_other.scss'}),
              })
              .css.toString()
          ).toEqualIgnoringWhitespace('a { from: cwd; }')
        );
      }));
  });
});

describe('the imported URL', () => {
  it('is the exact imported text', () => {
    const importer = spy((url: string) => {
      expect(url).toBe('foo');
      return {contents: ''};
    });

    sass.renderSync({data: '@use "foo"', importer});
    expect(importer).toHaveBeenCalled();
  });

  // Regression test for sass/dart-sass#246.
  skipForImpl('sass-embedded', () => {
    it("doesn't remove ./", () => {
      const importer = spy((url: string) => {
        expect(url).toBe('./foo');
        return {contents: ''};
      });

      sass.renderSync({data: '@import "./foo"', importer});
      expect(importer).toHaveBeenCalled();
    });
  });

  it("isn't resolved relative to the current file", () => {
    const importer = spy((url: string) => {
      if (url === 'foo/bar') return {contents: '@use "baz"'};
      expect(url).toBe('baz');
      return {contents: ''};
    });

    sass.renderSync({data: '@use "foo/bar"', importer});
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('is added to includedFiles', () => {
    const result = sass.renderSync({
      data: '@use "foo"',
      importer: () => ({contents: ''}),
    });
    expect(result.stats.includedFiles).toContain('foo');
  });

  // Regression test for sass/dart-sass#1137.
  it("isn't changed if it's root-relative with no nesting", () => {
    const importer = spy((url: string) => {
      expect(url).toBe('/foo');
      return {contents: ''};
    });

    sass.renderSync({data: '@use "/foo"', importer});
    expect(importer).toHaveBeenCalled();
  });

  // Regression test for sass/embedded-host-node#1137.
  it("isn't changed if it's root-relative with nesting", () => {
    const importer = spy((url: string) => {
      expect(url).toBe('/foo/bar/baz');
      return {contents: ''};
    });

    sass.renderSync({data: '@use "/foo/bar/baz"', importer});
    expect(importer).toHaveBeenCalled();
  });

  it("is converted to a file: URL if it's an absolute Windows path", () => {
    const importer = spy((url: string) => {
      expect(url).toBe('file:///C:/foo');
      return {contents: ''};
    });

    sass.renderSync({data: '@import "C:/foo"', importer});
    expect(importer).toHaveBeenCalled();
  });
});

describe('the previous URL', () => {
  it('is an absolute path for stylesheets from the filesystem', () =>
    sandbox(dir => {
      dir.write({'test.scss': '@use "foo"'});

      const importer = spy((url, prev) => {
        expect(prev).toBe(p.resolve(dir('test.scss')));
        return {contents: ''};
      });

      sass.renderSync({file: dir('test.scss'), importer});
      expect(importer).toHaveBeenCalled();
    }));

  it('is an absolute path for stylesheets redirected to the filesystem', () =>
    sandbox(dir => {
      dir.write({
        'test.scss': '@use "foo"',
        '_other.scss': '@use "baz"',
      });

      const importer = spy((url, prev) => {
        if (url === 'foo') return {file: '_other.scss'};
        expect(url).toBe('baz');
        expect(prev).toBe(dir('_other.scss'));
        return {contents: ''};
      });

      sass.renderSync({file: dir('test.scss'), importer});
      expect(importer).toHaveBeenCalledTimes(2);
    }));

  it('is "stdin" for string stylesheets', () => {
    const importer = spy((url, prev) => {
      expect(prev).toBe('stdin');
      return {contents: ''};
    });

    sass.renderSync({data: '@use "foo"', importer});
    expect(importer).toHaveBeenCalled();
  });

  it('is the imported string for imports from importers', () => {
    const importer1 = spy((url: string) =>
      url === 'foo' ? {contents: '@use "bar"'} : null
    );

    const importer2 = spy((url, prev) => {
      expect(url).toBe('bar');
      expect(prev).toBe('foo');
      return {contents: ''};
    });

    sass.renderSync({
      data: '@use "foo"',
      importer: [importer1, importer2],
    });
    expect(importer1).toHaveBeenCalledTimes(2);
    expect(importer2).toHaveBeenCalled();
  });

  // Regression test for sass/embedded-host-node#120
  it('is passed after a relative import', () =>
    sandbox(dir => {
      dir.write({
        'test.scss': `
          @use "relative";
          @use "importer";
        `,
        '_relative.scss': 'a {b: relative}',
      });

      const importer = spy((url, prev) => {
        expect(url).toBe('importer');
        expect(prev).toBe(dir('test.scss'));
        return {contents: 'a {b: importer}'};
      });

      expect(
        sass.renderSync({file: dir('test.scss'), importer}).css.toString()
      ).toEqualIgnoringWhitespace('a { b: relative; } a { b: importer; }');
      expect(importer).toHaveBeenCalledTimes(1);
    }));
});

describe('this', () => {
  it('includes default option values', () => {
    const importer = spy(function (this: sass.LegacyImporterThis) {
      const options = this.options;
      expect(options.includePaths).toBe(process.cwd());
      expect(options.precision).toEqual(10);
      expect(options.style).toEqual(1);
      expect(options.indentType).toBe(0);
      expect(options.indentWidth).toBe(2);
      expect(options.linefeed).toBe('\n');
      return {contents: ''};
    });

    sass.renderSync({data: '@use "foo"', importer});
    expect(importer).toHaveBeenCalled();
  });

  it('includes the data when rendering via data', () => {
    const importer = spy(function (this: sass.LegacyImporterThis) {
      const options = this.options;
      expect(options.data).toBe('@use "foo"');
      expect(options.file).toBeUndefined();
      return {contents: ''};
    });

    sass.renderSync({data: '@use "foo"', importer});
    expect(importer).toHaveBeenCalled();
  });

  it('includes the filename when rendering via file', () =>
    sandbox(dir => {
      dir.write({'test.scss': '@use "foo"'});

      const importer = spy(function (this: sass.LegacyImporterThis) {
        const options = this.options;

        // Because of the way it wraps legacy importers, the embedded host
        // always includes the source file's contents in `options.data`.
        if (sassImpl !== 'sass-embedded') {
          expect(options.data).toBeUndefined();
        }

        expect(options.file).toBe(dir('test.scss'));
        return {contents: ''};
      });

      sass.renderSync({file: dir('test.scss'), importer});
      expect(importer).toHaveBeenCalled();
    }));

  it('includes other include paths', () =>
    sandbox(dir => {
      const importer = spy(function (this: sass.LegacyImporterThis) {
        expect(this.options.includePaths).toContain(
          `${process.cwd()}${p.delimiter}${dir.root}`
        );
        return {contents: ''};
      });

      sass.renderSync({
        data: '@use "foo"',
        includePaths: [dir.root],
        importer,
      });
      expect(importer).toHaveBeenCalled();
    }));

  skipForImpl('sass-embedded', () => {
    describe('can override', () => {
      it('indentWidth', () => {
        const importer = spy(function (this: sass.LegacyImporterThis) {
          expect(this.options.indentWidth).toBe(5);
          return {contents: ''};
        });

        sass.renderSync({data: '@use "foo"', indentWidth: 5, importer});
        expect(importer).toHaveBeenCalled();
      });

      it('indentType', () => {
        const importer = spy(function (this: sass.LegacyImporterThis) {
          expect(this.options.indentType).toBe(1);
          return {contents: ''};
        });

        sass.renderSync({data: '@use "foo"', indentType: 'tab', importer});
        expect(importer).toHaveBeenCalled();
      });

      it('linefeed', () => {
        const importer = spy(function (this: sass.LegacyImporterThis) {
          expect(this.options.linefeed).toBe('\r');
          return {contents: ''};
        });

        sass.renderSync({data: '@use "foo"', linefeed: 'cr', importer});
        expect(importer).toHaveBeenCalled();
      });
    });
  });

  it('has a circular reference', () => {
    const importer = spy(function (this: sass.LegacyImporterThis) {
      expect(this.options.context).toBe(this);
      return {contents: ''};
    });

    sass.renderSync({data: '@use "foo"', importer});
    expect(importer).toHaveBeenCalled();
  });

  describe('includes render stats with', () => {
    it('a start time', () => {
      const start = new Date();
      const importer = spy(function (this: sass.LegacyImporterThis) {
        expect(this.options.result.stats.start).toBeGreaterThanOrEqual(
          start.getTime()
        );
        return {contents: ''};
      });

      sass.renderSync({data: '@use "foo"', importer});
      expect(importer).toHaveBeenCalled();
    });

    it('a data entry', () => {
      const importer = spy(function (this: sass.LegacyImporterThis) {
        expect(this.options.result.stats.entry).toBe('data');
        return {contents: ''};
      });

      sass.renderSync({data: '@use "foo"', importer});
      expect(importer).toHaveBeenCalled();
    });

    it('a file entry', () =>
      sandbox(dir => {
        dir.write({'test.scss': '@use "foo"'});

        const importer = spy(function (this: sass.LegacyImporterThis) {
          expect(this.options.result.stats.entry).toBe(dir('test.scss'));
          return {contents: ''};
        });

        sass.renderSync({file: dir('test.scss'), importer});
        expect(importer).toHaveBeenCalled();
      }));
  });

  describe("includes a fromImport field that's", () => {
    it('true for an @import', () => {
      const importer = spy(function (this: sass.LegacyImporterThis) {
        expect(this.fromImport).toBeTrue();
        return {contents: ''};
      });

      sass.renderSync({data: '@import "foo"', importer});
      expect(importer).toHaveBeenCalled();
    });

    it('false for a @use', () => {
      const importer = spy(function (this: sass.LegacyImporterThis) {
        expect(this.fromImport).toBeFalse();
        return {contents: ''};
      });

      sass.renderSync({data: '@use "foo"', importer});
      expect(importer).toHaveBeenCalled();
    });

    it('false for a @forward', () => {
      const importer = spy(function (this: sass.LegacyImporterThis) {
        expect(this.fromImport).toBeFalse();
        return {contents: ''};
      });

      sass.renderSync({data: '@forward "foo"', importer});
      expect(importer).toHaveBeenCalled();
    });

    it('false for meta.load-css()', () => {
      const importer = spy(function (this: sass.LegacyImporterThis) {
        expect(this.fromImport).toBeFalse();
        return {contents: ''};
      });

      sass.renderSync({
        data: '@use "sass:meta"; @include meta.load-css("foo")',
        importer,
      });
      expect(importer).toHaveBeenCalled();
    });
  });
});

describe('gracefully handles an error when', () => {
  it('an importer redirects to a non-existent file', () =>
    expect(() =>
      sass.renderSync({
        data: '@use "foo"',
        importer: () => ({file: '_does_not_exist'}),
      })
    ).toThrowLegacyException({line: 1}));

  it('an error is returned', () =>
    expect(() =>
      sass.renderSync({
        data: '@use "foo"',
        importer: () => new Error('oh no'),
      })
    ).toThrowLegacyException({line: 1}));

  it('a subclass of error is returned', () => {
    class MyError extends Error {}

    expect(() =>
      sass.renderSync({
        data: '@use "foo"',
        importer: () => new MyError('oh no'),
      })
    ).toThrowLegacyException({line: 1});
  });

  it('null is returned', () =>
    expect(() =>
      sass.renderSync({
        data: '@use "foo"',
        importer: () => null,
      })
    ).toThrowLegacyException({line: 1}));

  it('undefined is returned', () =>
    expect(() =>
      sass.renderSync({
        data: '@use "foo"',
        importer: () => undefined as unknown as sass.LegacyImporterResult,
      })
    ).toThrowLegacyException({line: 1}));

  it('an unrecognized value is returned', () =>
    expect(() =>
      sass.renderSync({
        data: '@use "foo"',
        importer: () => 10 as unknown as sass.LegacyImporterResult,
      })
    ).toThrowLegacyException({line: 1}));

  it('it occurs in a file with a custom URL scheme', () =>
    expect(() =>
      sass.renderSync({
        data: '@use "foo:bar"',
        importer: () => ({contents: '@error "oh no"'}),
      })
    ).toThrowLegacyException({line: 1, file: 'foo:bar'}));
});

describe('render()', () => {
  it('supports asynchronous importers', done =>
    sass.render(
      {
        data: '@use "foo"',
        importer: ((
          _: string,
          __: string,
          done: (...args: unknown[]) => void
        ) => {
          setTimeout(() => done({contents: 'a {b: c}'}));
        }) as sass.LegacySyncImporter,
      },
      (err?: sass.LegacyException, result?: sass.LegacyResult) => {
        expect(result!.css.toString()).toEqualIgnoringWhitespace('a { b: c; }');
        done();
      }
    ));

  it('supports asynchronous errors', done =>
    sass.render(
      {
        data: '@use "foo"',
        importer: ((
          _: string,
          __: string,
          done: (...args: unknown[]) => void
        ) => {
          setTimeout(() => done(new Error('oh no')));
        }) as sass.LegacySyncImporter,
      },
      (err?: sass.LegacyException) => {
        expect(typeof err).toBe('object');
        done();
      }
    ));

  it('supports synchronous importers', done =>
    sass.render(
      {
        data: '@use "foo"',
        importer: () => ({contents: 'a {b: c}'}),
      },
      (err?: sass.LegacyException, result?: sass.LegacyResult) => {
        expect(result!.css.toString()).toEqualIgnoringWhitespace('a { b: c; }');
        done();
      }
    ));

  it('supports synchronous null returns', done =>
    sass.render(
      {data: '@use "foo"', importer: () => null},
      (err?: sass.LegacyException) => {
        expect(typeof err).toBe('object');
        done();
      }
    ));
});

describe('when importer returns non-string contents', () => {
  it('throws an error in sync mode', () => {
    expect(() => {
      sass.renderSync({
        data: '@use "other";',
        importer() {
          return {
            // Need to force an invalid type to test bad-type handling.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            contents: Buffer.from('not a string') as any,
            syntax: 'scss',
          };
        },
      });
    }).toThrowLegacyException({
      line: 1,
      includes: 'Invalid argument (contents): must be a string but was: Buffer',
    });
  });

  it('throws an error in async mode', done => {
    sass.render(
      {
        data: '@use "other";',
        importer() {
          return {
            // Need to force an invalid type to test bad-type handling.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            contents: Buffer.from('not a string') as any,
            syntax: 'scss',
          };
        },
      },
      (err?: sass.LegacyException) => {
        expect(() => {
          throw err;
        }).toThrowLegacyException({
          line: 1,
          includes: 'Invalid argument (contents): must be a string but was',
        });
        done();
      }
    );
  });
});

// Regression test for sass/dart-sass#1962
it('compiles multiple nested relative imports loaded multiple times across different files', async () => {
  await sandbox(dir => {
    dir.write({
      'src/index.scss': `
        @import "./_a.scss";
        @import "./_includes.scss";
      `,
      'include/_a.scss': '/* A */',
      'include/_b.scss': '/* B */',
      'src/_includes.scss': `
        @import "./_a.scss";
        @import "./_b.scss";
      `,
    });

    const result = sass.renderSync({
      file: dir('src/index.scss'),
      importer: function (url) {
        const path = dir('./include', url);
        if (fs.existsSync(path)) {
          return {
            contents: fs.readFileSync(path, 'utf8'),
          };
        }
        return null;
      },
    });
    expect(result.css.toString()).toBe('/* A */\n/* A */\n/* B */');
  });
});
