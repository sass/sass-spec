// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {
  compile,
  compileAsync,
  compileString,
  compileStringAsync,
  render,
  renderSync,
  nodePackageImporter,
  NodePackageImporter,
  LegacyException,
  LegacyResult,
} from 'sass';

import {sandbox} from './sandbox';

const testPackageImporter = ({
  input,
  output,
  files,
}: {
  input: string;
  output: string;
  files: {[path: string]: string};
}) =>
  sandbox(dir => {
    dir.write(files);
    dir.chdir(() => {
      const result = compileString(input, {
        importers: [nodePackageImporter],
      });
      expect(result.css).toEqualIgnoringWhitespace(output);
    });
  });

describe('Node Package Importer', () => {
  describe('resolves conditional exports', () => {
    ['sass', 'style', 'default'].forEach(key => {
      it(`${key} for root `, () =>
        testPackageImporter({
          input: '@use "pkg:foo";',
          output: 'a {b: c;}',
          files: {
            'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {
                '.': {
                  [key]: './src/sass/_styles.scss',
                },
              },
            }),
          },
        }));

      it(`${key} for root without '.'`, () =>
        testPackageImporter({
          input: '@use "pkg:foo";',
          output: 'a {b: c;}',
          files: {
            'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {
                [key]: './src/sass/_styles.scss',
              },
            }),
          },
        }));

      it(`${key} with subpath`, () =>
        testPackageImporter({
          input: '@use "pkg:foo/styles";',
          output: 'a {b: c;}',
          files: {
            'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {
                './_styles.scss': {
                  [key]: './src/sass/_styles.scss',
                },
              },
            }),
          },
        }));

      it(`${key} with index`, () =>
        testPackageImporter({
          input: '@use "pkg:foo/subdir";',
          output: 'a {b: c;}',
          files: {
            'node_modules/foo/src/sass/subdir/index.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {
                './subdir/index.scss': {
                  [key]: './src/sass/subdir/index.scss',
                },
              },
            }),
          },
        }));
    });

    it('compiles with first conditional match found', () =>
      testPackageImporter({
        input: '@use "pkg:foo";',
        output: 'a {from: sassCondition;}',
        files: {
          'node_modules/foo/src/sass/_styles.scss': 'd {from: styleCondition}',
          'node_modules/foo/src/sass/_sass.scss': 'a {from: sassCondition}',
          'node_modules/foo/package.json': JSON.stringify({
            exports: {
              '.': {
                sass: './src/sass/_sass.scss',
                style: './src/sass/_styles.scss',
              },
            },
          }),
        },
      }));

    it('throws if multiple exported paths match', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/foo/src/sass/_styles.scss': 'd {e: f}',
          'node_modules/foo/src/sass/_other.scss': 'a {b: c}',
          'node_modules/foo/package.json': JSON.stringify({
            exports: {
              './index.scss': {sass: './src/sass/_other.scss'},
              './_index.sass': {sass: './src/sass/_styles.scss'},
            },
          }),
        });
        dir.chdir(() => {
          expect(() =>
            compileString('@use "pkg:foo";', {
              importers: [nodePackageImporter],
            })
          ).toThrowSassException({
            includes: 'multiple potential resolutions',
          });
        });
      }));

    it('resolves string export', () =>
      testPackageImporter({
        input: '@use "pkg:foo";',
        output: 'a {b: c;}',
        files: {
          'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
          'node_modules/foo/package.json': JSON.stringify({
            exports: './src/sass/_styles.scss',
          }),
        },
      }));

    describe('wildcards', () => {
      it('resolves with partial', () =>
        testPackageImporter({
          input: '@use "pkg:foo/styles";',
          output: 'a {b: c;}',
          files: {
            'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {'./*.scss': './src/sass/*.scss'},
            }),
          },
        }));

      it('resolves with full wildcard path and sass conditional export', () =>
        testPackageImporter({
          input: '@use "pkg:foo/styles";',
          output: 'a {b: c;}',
          files: {
            'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {'./*': {sass: './src/sass/*'}},
            }),
          },
        }));

      it('resolves file extension variant', () =>
        testPackageImporter({
          input: '@use "pkg:foo/sass/styles";',
          output: 'a {b: c;}',
          files: {
            'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {'./sass/*': './src/sass/*'},
            }),
          },
        }));

      it('resolves multipart paths', () =>
        testPackageImporter({
          input: '@use "pkg:foo/sass/styles";',
          output: 'a {b: c;}',
          files: {
            'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {'./*.scss': './src/*.scss'},
            }),
          },
        }));

      it('throws if multiple wildcard exports match', () =>
        sandbox(dir => {
          dir.write({
            'node_modules/foo/src/sass/styles.scss': 'a {b: c}',
            'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {'./*.scss': './src/sass/*.scss'},
            }),
          });
          dir.chdir(() => {
            expect(
              () =>
                compileString('@use "pkg:foo/styles";', {
                  importers: [nodePackageImporter],
                }).css
            ).toThrowSassException({
              includes: 'multiple potential resolutions',
            });
          });
        }));
    });
  });

  describe('without subpath', () => {
    it('sass key in package.json', () =>
      testPackageImporter({
        input: '@use "pkg:foo";',
        output: 'a {b: c;}',
        files: {
          'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
          'node_modules/foo/package.json': JSON.stringify({
            sass: 'src/sass/_styles.scss',
          }),
        },
      }));

    it('style key in package.json', () =>
      testPackageImporter({
        input: '@use "pkg:foo";',
        output: 'a {b: c;}',
        files: {
          'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
          'node_modules/foo/package.json': JSON.stringify({
            style: 'src/sass/_styles.scss',
          }),
        },
      }));

    ['index.scss', 'index.css', '_index.scss', '_index.css'].forEach(
      fileName => {
        it(`loads from ${fileName}`, () =>
          testPackageImporter({
            input: '@use "pkg:foo";',
            output: 'a {b: c;}',
            files: {
              [`node_modules/foo/${fileName}`]: 'a {b: c}',
              'node_modules/foo/package.json': JSON.stringify({}),
            },
          }));
      }
    );
    ['index.sass', '_index.sass'].forEach(fileName => {
      it(`loads from ${fileName}`, () =>
        testPackageImporter({
          input: '@use "pkg:foo";',
          output: 'a {b: c;}',
          files: {
            [`node_modules/foo/${fileName}`]: 'a \n b: c',
            'node_modules/foo/package.json': JSON.stringify({}),
          },
        }));
    });
  });

  it('with subpath, resolves relative to package root', () =>
    testPackageImporter({
      input: '@use "pkg:bar/src/styles/sass";',
      output: 'a {b: c;}',
      files: {
        'node_modules/bar/src/styles/sass/index.scss': 'a {b: c}',
        'node_modules/bar/package.json': JSON.stringify({}),
      },
    }));

  describe('resolves from packages', () => {
    it('resolves from secondary @use', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
          '_vendor.scss': '@use "pkg:bah";',
        });
        dir.chdir(() => {
          const result = compileString('@use "vendor";', {
            importers: [
              nodePackageImporter,
              {
                findFileUrl: file => dir.url(file),
              },
            ],
          });
          expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
        });
      }));

    it('resolves from secondary @use pkg root', () =>
      testPackageImporter({
        input: '@use "pkg:bah";',
        output: 'a {b: c;}',
        files: {
          'node_modules/bah/index.scss': '@use "pkg:bar";',
          'node_modules/bah/package.json': JSON.stringify({}),
          'node_modules/bar/index.scss': 'a {b: c}',
          'node_modules/bar/package.json': JSON.stringify({}),
        },
      }));

    it('relative import in package', () =>
      testPackageImporter({
        input: '@use "pkg:foo";',
        output: 'a {db: c;}',
        files: {
          'node_modules/foo/scss/styles.scss': '@use "mixins/banner";',
          'node_modules/foo/scss/mixins/_banner.scss': 'a {b: c;}',
          'node_modules/foo/package.json': JSON.stringify({
            sass: 'scss/styles.scss',
          }),
        },
      }));

    it('resolves most proximate node_module', () =>
      testPackageImporter({
        input: '@use "pkg:bah";',
        output: 'a {from: submodule;}',
        files: {
          'node_modules/bah/index.scss': '@use "pkg:bar";',
          'node_modules/bah/package.json': JSON.stringify({}),
          'node_modules/bar/index.scss': 'e {from: root}',
          'node_modules/bar/package.json': JSON.stringify({}),
          'node_modules/bah/node_modules/bar/index.scss':
            'a {from: submodule;}',
          'node_modules/bah/node_modules/bar/package.json': JSON.stringify({}),
        },
      }));

    it('resolves sub node_module', () =>
      testPackageImporter({
        input: '@use "pkg:bah";',
        output: 'a {b: c;}',
        files: {
          'node_modules/bah/index.scss': '@use "pkg:bar";',
          'node_modules/bah/package.json': JSON.stringify({}),
          'node_modules/bah/node_modules/bar/index.scss': 'a {b: c}',
          'node_modules/bah/node_modules/bar/package.json': JSON.stringify({}),
        },
      }));

    it('resolves node_module above cwd', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bar/index.scss': 'a {b: c}',
          'node_modules/bar/package.json': JSON.stringify({}),
        });
        dir.chdir(
          () => {
            const result = compileString('@use "pkg:bar";', {
              importers: [nodePackageImporter],
            });
            return expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
          },
          {entryPoint: 'deeply/nested/file/index.js'}
        );
      }));

    it('resolves in scoped package', () =>
      testPackageImporter({
        input: '@use "pkg:@foo/bar";',
        output: 'a {b: c;}',
        files: {
          'node_modules/@foo/bar/src/sass/_styles.scss': 'a {b: c}',
          'node_modules/@foo/bar/package.json': JSON.stringify({
            exports: './src/sass/_styles.scss',
          }),
        },
      }));

    it('resolves from secondary @use in scoped packages', () =>
      testPackageImporter({
        input: '@use "pkg:@foo/bah";',
        output: 'a {b: c;}',
        files: {
          'node_modules/@foo/bah/index.scss': '@use "pkg:@foo/bar";',
          'node_modules/@foo/bah/package.json': JSON.stringify({}),
          'node_modules/@foo/bar/index.scss': 'a {b: c}',
          'node_modules/@foo/bar/package.json': JSON.stringify({}),
        },
      }));

    it('fails if no match found', () => {
      sandbox(dir => {
        dir.chdir(() => {
          expect(() =>
            compileString('@use "pkg:bah";', {
              importers: [nodePackageImporter],
            })
          ).toThrowSassException({
            includes: "Can't find stylesheet to import",
          });
        });
      });
    });
  });

  it('faked Node Package Importer fails', () =>
    sandbox(dir => {
      dir.write({'foo/index.scss': 'a {from: dir}'});

      const foo = {_NodePackageImporterBrand: ''} as NodePackageImporter;

      expect(() =>
        compileString('@use "pkg:foo";', {
          importers: [foo],
        })
      ).toThrow();
    }));

  describe('compilation methods', () => {
    it('compile', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
          '_index.scss': '@use "pkg:bah";',
        });
        dir.chdir(() => {
          const result = compile('./_index.scss', {
            importers: [
              nodePackageImporter,
              {
                findFileUrl: file => dir.url(file),
              },
            ],
          });
          expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
        });
      }));

    it('compileString', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
        });
        dir.chdir(() => {
          const result = compileString('@use "pkg:bah";', {
            importers: [nodePackageImporter],
          });
          expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
        });
      }));

    it('compileAsync', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
          '_index.scss': '@use "pkg:bah";',
        });
        return dir.chdir(async () => {
          const result = await compileAsync('./_index.scss', {
            importers: [
              nodePackageImporter,
              {
                findFileUrl: file => dir.url(file),
              },
            ],
          });
          expect(result.css).toEqualIgnoringWhitespace('a { b: c;}');
          return result;
        });
      }));

    it('compileStringAsync', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
        });
        return dir.chdir(async () => {
          const result = await compileStringAsync('@use "pkg:bah";', {
            importers: [nodePackageImporter],
          });
          expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
          return result;
        });
      }));

    it('render string', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
        });
        return dir.chdir(async () => {
          return await new Promise(resolve => {
            render(
              {
                data: '@use "pkg:bah"',
                pkgImporter: 'node',
              },
              (err?: LegacyException, result?: LegacyResult) => {
                expect(err).toBeFalsy();
                expect(result!.css.toString()).toEqualIgnoringWhitespace(
                  'a { b: c; }'
                );
                resolve(undefined);
              }
            );
          });
        });
      }));

    it('render file', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
          'index.scss': '@use "pkg:bah";',
        });
        return dir.chdir(async () => {
          return await new Promise(resolve => {
            render(
              {
                file: 'index.scss',
                pkgImporter: 'node',
              },
              (err?: LegacyException, result?: LegacyResult) => {
                expect(err).toBeFalsy();
                expect(result!.css.toString()).toEqualIgnoringWhitespace(
                  'a { b: c; }'
                );
                resolve(undefined);
              }
            );
          });
        });
      }));

    it('renderSync file', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
          'index.scss': '@use "pkg:bah";',
        });
        return dir.chdir(() => {
          const result = renderSync({
            file: 'index.scss',
            pkgImporter: 'node',
          }).css.toString();
          expect(result).toEqualIgnoringWhitespace('a { b: c;}');
        });
      }));

    it('renderSync data', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
        });
        return dir.chdir(() => {
          const result = renderSync({
            data: '@use "pkg:bah"',
            pkgImporter: 'node',
          }).css.toString();
          expect(result).toEqualIgnoringWhitespace('a { b: c;}');
        });
      }));
  });
});
