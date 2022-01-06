// Copyright 2021 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import * as p from 'path';
import * as sass from 'sass';

import {sandbox} from '../sandbox';
import {skipForImpl} from '../utils';

skipForImpl('sass-embedded', () => {
  describe('rejects a signature', () => {
    it('with an invalid argument list', () => {
      expect(() =>
        sass.renderSync({
          data: '',
          functions: {'foo(': () => sass.types.Null.NULL},
        })
      ).toThrowLegacyException();
    });

    it("that's an empty string", () => {
      expect(() =>
        sass.renderSync({data: '', functions: {'': () => sass.types.Null.NULL}})
      ).toThrowLegacyException();
    });

    it("that's just an argument list", () => {
      expect(() =>
        sass.renderSync({
          data: '',
          functions: {'($var)': () => sass.types.Null.NULL},
        })
      ).toThrowLegacyException();
    });

    it('with an invalid identifier', () => {
      expect(() =>
        sass.renderSync({
          data: '',
          functions: {'~~~': () => sass.types.Null.NULL},
        })
      ).toThrowLegacyException();
    });
  });

  describe('allows a signature', () => {
    it('with no argument list', () => {
      expect(
        sass
          .renderSync({
            data: 'a {b: foo()}',
            functions: {
              foo: () => new sass.types.Number(12),
            },
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: 12; }');
    });

    it('with an empty argument list', () => {
      expect(
        sass
          .renderSync({
            data: 'a {b: foo()}',
            functions: {
              'foo()': () => new sass.types.Number(12),
            },
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: 12; }');
    });
  });

  describe('are dash-normalized', () => {
    it('when defined with dashes', () => {
      expect(
        sass
          .renderSync({
            data: 'a {b: foo_bar()}',
            functions: {
              'foo-bar': () => new sass.types.Number(12),
            },
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: 12; }');
    });

    it('when defined with underscores', () => {
      expect(
        sass
          .renderSync({
            data: 'a {b: foo-bar()}',
            functions: {
              foo_bar: () => new sass.types.Number(12),
            },
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: 12; }');
    });
  });

  describe('rejects function calls that', () => {
    it('have too few arguments', () => {
      expect(() =>
        sass.renderSync({
          data: 'a {b: foo()}',
          functions: {'foo($var)': () => sass.types.Null.NULL},
        })
      ).toThrowLegacyException({line: 1});
    });

    it('have too many arguments', () => {
      expect(() =>
        sass.renderSync({
          data: 'a {b: foo(1, 2)}',
          functions: {'foo($var)': () => sass.types.Null.NULL},
        })
      ).toThrowLegacyException({line: 1});
    });

    it('passes a non-existent named argument', () => {
      expect(() =>
        sass.renderSync({
          data: 'a {b: foo($var: 1)}',
          functions: {'foo()': () => sass.types.Null.NULL},
        })
      ).toThrowLegacyException({line: 1});
    });
  });

  describe('passes arguments', () => {
    it('by position', () => {
      expect(
        sass
          .renderSync({
            data: 'a {b: last(1px, 2em)}',
            functions: {
              'last($value1, $value2)': (value1, value2) => value2,
            },
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: 2em; }');
    });

    it('by name', () => {
      expect(
        sass
          .renderSync({
            data: 'a {b: last($value2: 1px, $value1: 2em)}',
            functions: {
              'last($value1, $value2)': (value1, value2) => value2,
            },
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: 1px; }');
    });

    it('by splat', () => {
      expect(
        sass
          .renderSync({
            data: 'a {b: last((1px 2em)...)}',
            functions: {
              'last($value1, $value2)': (value1, value2) => value2,
            },
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: 2em; }');
    });

    it('by arglist', () => {
      expect(
        sass
          .renderSync({
            data: 'a {b: last(1px, 2em)}',
            functions: {
              'last($args...)': args => {
                const argList = args as sass.types.List;
                return argList.getValue(argList.getLength() - 1)!;
              },
            },
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: 2em; }');
    });
  });

  describe('rejects a return value that', () => {
    it("isn't a Sass value", () => {
      expect(() =>
        sass.renderSync({
          data: 'a {b: foo()}',
          functions: {foo: () => 10 as unknown as sass.LegacyValue},
        })
      ).toThrowLegacyException({line: 1});
    });

    it('is null', () => {
      expect(() =>
        sass.renderSync({
          data: 'a {b: foo()}',
          functions: {foo: () => null as unknown as sass.LegacyValue},
        })
      ).toThrowLegacyException({line: 1});
    });
  });

  describe('this', () => {
    it('includes default option values', () => {
      const fn = jest.fn(function (this: sass.LegacyPluginThis) {
        const options = this.options;
        expect(options.includePaths).toEqual(process.cwd());
        expect(options.precision).toEqual(10);
        expect(options.style).toEqual(1);
        expect(options.indentType).toBe(0);
        expect(options.indentWidth).toBe(2);
        expect(options.linefeed).toBe('\n');
        return sass.types.Null.NULL;
      });

      sass.renderSync({data: 'a {b: foo()}', functions: {foo: fn}});
      expect(fn).toHaveBeenCalled();
    });

    it('includes the data when rendering via data', () => {
      const fn = jest.fn(function (this: sass.LegacyPluginThis) {
        const options = this.options;
        expect(options.data).toEqual('a {b: foo()}');
        expect(options.file).toBeUndefined();
        return sass.types.Null.NULL;
      });

      sass.renderSync({data: 'a {b: foo()}', functions: {foo: fn}});
      expect(fn).toHaveBeenCalled();
    });

    it('includes the filename when rendering via file', () => {
      sandbox(dir => {
        dir.write({'test.scss': 'a {b: foo()}'});

        const fn = jest.fn(function (this: sass.LegacyPluginThis) {
          const options = this.options;
          expect(options.data).toBeUndefined();
          expect(options.file).toEqual(dir('test.scss'));
          return sass.types.Null.NULL;
        });

        sass.renderSync({file: dir('test.scss'), functions: {foo: fn}});
        expect(fn).toHaveBeenCalled();
      });
    });

    it('includes other include paths', () => {
      sandbox(dir => {
        const fn = jest.fn(function (this: sass.LegacyPluginThis) {
          expect(this.options.includePaths).toBe(
            `${process.cwd()}${p.delimiter}${dir.root}`
          );
          return sass.types.Null.NULL;
        });

        sass.renderSync({
          data: 'a {b: foo()}',
          functions: {foo: fn},
          includePaths: [dir.root],
        });

        expect(fn).toHaveBeenCalled();
      });
    });

    describe('can override', () => {
      it('indentWidth', () => {
        const fn = jest.fn(function (this: sass.LegacyPluginThis) {
          expect(this.options.indentWidth).toBe(5);
          return sass.types.Null.NULL;
        });

        sass.renderSync({
          data: 'a {b: foo()}',
          functions: {foo: fn},
          indentWidth: 5,
        });

        expect(fn).toHaveBeenCalled();
      });

      it('indentType', () => {
        const fn = jest.fn(function (this: sass.LegacyPluginThis) {
          expect(this.options.indentType).toBe(1);
          return sass.types.Null.NULL;
        });

        sass.renderSync({
          data: 'a {b: foo()}',
          functions: {foo: fn},
          indentType: 'tab',
        });

        expect(fn).toHaveBeenCalled();
      });

      it('linefeed', () => {
        const fn = jest.fn(function (this: sass.LegacyPluginThis) {
          expect(this.options.linefeed).toBe('\r');
          return sass.types.Null.NULL;
        });

        sass.renderSync({
          data: 'a {b: foo()}',
          functions: {foo: fn},
          linefeed: 'cr',
        });

        expect(fn).toHaveBeenCalled();
      });
    });

    it('has a circular reference', () => {
      const fn = jest.fn(function (this: sass.LegacyPluginThis) {
        expect(this.options.context).toBe(this);
        return sass.types.Null.NULL;
      });

      sass.renderSync({data: 'a {b: foo()}', functions: {foo: fn}});
      expect(fn).toHaveBeenCalled();
    });

    describe('includes render stats with', () => {
      it('a start time', () => {
        const start = new Date();

        const fn = jest.fn(function (this: sass.LegacyPluginThis) {
          expect(this.options.result.stats.start).toBeGreaterThanOrEqual(
            start.getTime()
          );
          return sass.types.Null.NULL;
        });

        sass.renderSync({data: 'a {b: foo()}', functions: {foo: fn}});
        expect(fn).toHaveBeenCalled();
      });

      it('a data entry', () => {
        const fn = jest.fn(function (this: sass.LegacyPluginThis) {
          expect(this.options.result.stats.entry).toBe('data');
          return sass.types.Null.NULL;
        });

        sass.renderSync({data: 'a {b: foo()}', functions: {foo: fn}});
        expect(fn).toHaveBeenCalled();
      });

      it('a file entry', () => {
        sandbox(dir => {
          dir.write({'test.scss': 'a {b: foo()}'});

          const fn = jest.fn(function (this: sass.LegacyPluginThis) {
            expect(this.options.result.stats.entry).toBe(dir('test.scss'));
            return sass.types.Null.NULL;
          });

          sass.renderSync({file: dir('test.scss'), functions: {foo: fn}});
          expect(fn).toHaveBeenCalled();
        });
      });
    });
  });

  it('gracefully handles an error from the function', () => {
    expect(() =>
      sass.renderSync({
        data: 'a {b: foo()}',
        functions: {
          foo: () => {
            throw 'aw beans';
          },
        },
      })
    ).toThrowLegacyException({line: 1, includes: 'aw beans'});
  });

  describe('render()', () => {
    it('runs a synchronous function', done => {
      sass.render(
        {
          data: 'a {b: foo()}',
          functions: {
            foo: () => new sass.types.Number(1),
          },
        },
        (err, result) => {
          expect(result!.css.toString()).toEqualIgnoringWhitespace(
            'a { b: 1; }'
          );
          done();
        }
      );
    });

    it('runs an asynchronous function', done => {
      sass.render(
        {
          data: 'a {b: foo()}',
          functions: {
            foo: (fooDone: sass.LegacyAsyncFunctionDone) => {
              setTimeout(() => fooDone(new sass.types.Number(1)), 0);
            },
          },
        },
        (err, result) => {
          expect(result!.css.toString()).toEqualIgnoringWhitespace(
            'a { b: 1; }'
          );
          done();
        }
      );
    });

    it('reports a synchronous error', done => {
      sass.render(
        {
          data: 'a {b: foo()}',
          functions: {
            foo: () => {
              throw 'aw beans';
            },
          },
        },
        err => {
          expect(`${err}`).toContain('aw beans');
          done();
        }
      );
    });

    it('reports a synchronous sass.types.Error', done => {
      sass.render(
        {
          data: 'a {b: foo()}',
          functions: {
            foo: () => {
              return new sass.types.Error('aw beans');
            },
          },
        },
        err => {
          expect(`${err}`).toContain('aw beans');
          done();
        }
      );
    });

    it('reports an asynchronous sass.types.Error', done => {
      sass.render(
        {
          data: 'a {b: foo()}',
          functions: {
            foo: (fooDone: sass.LegacyAsyncFunctionDone) => {
              setTimeout(() => fooDone(new sass.types.Error('aw beans')), 0);
            },
          },
        },
        err => {
          expect(`${err}`).toContain('aw beans');
          done();
        }
      );
    });

    it('reports a null return', done => {
      sass.render(
        {
          data: 'a {b: foo()}',
          functions: {
            foo: (fooDone: sass.LegacyAsyncFunctionDone) => {
              setTimeout(() => fooDone(null as unknown as sass.LegacyValue), 0);
            },
          },
        },
        err => {
          expect(err).toBeObject();
          done();
        }
      );
    });

    it('reports a call to done without arguments', done => {
      sass.render(
        {
          data: 'a {b: foo()}',
          functions: {
            foo: (fooDone: sass.LegacyAsyncFunctionDone) => {
              setTimeout(() => (fooDone as () => void)(), 0);
            },
          },
        },
        err => {
          expect(err).toBeObject();
          done();
        }
      );
    });
  });

  // The legacy API doesn't provide any representation of first-class functions,
  // but they shouldn't crash or be corrupted.
  it('a function is passed through as-is', () => {
    expect(
      sass
        .renderSync({
          data: "a {b: call(id(get-function('str-length')), 'foo')}",
          functions: {'id($value)': value => value},
        })
        .css.toString()
    ).toEqualIgnoringWhitespace('a { b: 3; }');
  });
});
