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

describe('Node Package Importer', () => {
  describe('resolves conditional exports', () => {
    ['sass', 'style', 'default'].forEach(key => {
      it(`${key} for root `, () =>
        sandbox(dir => {
          dir.write({
            'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {
                '.': {
                  [key]: './src/sass/_styles.scss',
                },
              },
            }),
          });
          dir.chdir(
            () => {
              const result = compileString('@use "pkg:foo";', {
                importers: [nodePackageImporter],
              });
              expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
            },
            {changeEntryPoint: 'index.js'}
          );
        }));
      it(`${key} for root without '.'`, () =>
        sandbox(dir => {
          dir.write({
            'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {
                [key]: './src/sass/_styles.scss',
              },
            }),
          });
          dir.chdir(
            () => {
              const result = compileString('@use "pkg:foo";', {
                importers: [nodePackageImporter],
              });
              expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
            },
            {changeEntryPoint: 'index.js'}
          );
        }));

      it(`${key} with subpath`, () =>
        sandbox(dir => {
          dir.write({
            'node_modules/foo/src/sass/_other.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {
                './_other.scss': {
                  [key]: './src/sass/_other.scss',
                },
              },
            }),
          });
          dir.chdir(
            () => {
              const result = compileString('@use "pkg:foo/other";', {
                importers: [nodePackageImporter],
              });
              expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
            },
            {changeEntryPoint: 'index.js'}
          );
        }));
      it(`${key} with index`, () =>
        sandbox(dir => {
          dir.write({
            'node_modules/foo/src/sass/_styles.scss': 'd {e: f}',
            'node_modules/foo/src/sass/_other.scss': 'g {h: i}',
            'node_modules/foo/src/sass/subdir/index.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {
                './subdir/index.scss': {
                  [key]: './src/sass/subdir/index.scss',
                },
              },
            }),
          });
          dir.chdir(
            () => {
              const result = compileString('@use "pkg:foo/subdir";', {
                importers: [nodePackageImporter],
              });
              expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
            },
            {changeEntryPoint: 'index.js'}
          );
        }));
    });
    it('compiles with first conditional match found', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/foo/src/sass/_styles.scss': 'd {from: styleCondition}',
          'node_modules/foo/src/sass/_other.scss': 'a {from: sassCondition}',
          'node_modules/foo/package.json': JSON.stringify({
            exports: {
              '.': {
                sass: './src/sass/_other.scss',
                style: './src/sass/_styles.scss',
              },
            },
          }),
        });
        dir.chdir(
          () => {
            expect(
              compileString('@use "pkg:foo";', {
                importers: [nodePackageImporter],
              }).css
            ).toEqualIgnoringWhitespace('a {from: sassCondition;}');
          },
          {changeEntryPoint: 'index.js'}
        );
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
        dir.chdir(
          () => {
            expect(() =>
              compileString('@use "pkg:foo";', {
                importers: [nodePackageImporter],
              })
            ).toThrowSassException({
              includes: 'multiple potential resolutions',
            });
          },
          {changeEntryPoint: 'index.js'}
        );
      }));
    it('resolves string export', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/foo/src/sass/_styles.scss': 'd {e: f}',
          'node_modules/foo/src/sass/_other.scss': 'a {b: c}',
          'node_modules/foo/package.json': JSON.stringify({
            exports: './src/sass/_other.scss',
          }),
        });
        dir.chdir(
          () => {
            expect(
              compileString('@use "pkg:foo";', {
                importers: [nodePackageImporter],
              }).css
            ).toEqualIgnoringWhitespace('a {b: c;}');
          },
          {changeEntryPoint: 'index.js'}
        );
      }));
    describe('wildcards', () => {
      it('resolves with partial', () =>
        sandbox(dir => {
          dir.write({
            'node_modules/foo/src/sass/_other.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {'./*.scss': './src/sass/*.scss'},
            }),
          });
          dir.chdir(
            () => {
              expect(
                compileString('@use "pkg:foo/other";', {
                  importers: [nodePackageImporter],
                }).css
              ).toEqualIgnoringWhitespace('a {b: c;}');
            },
            {changeEntryPoint: 'index.js'}
          );
        }));
      it('resolves with full wildcard path', () =>
        sandbox(dir => {
          dir.write({
            'node_modules/foo/src/sass/_other.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {'./*': {sass: './src/sass/*'}},
            }),
          });
          dir.chdir(
            () => {
              expect(
                compileString('@use "pkg:foo/other";', {
                  importers: [nodePackageImporter],
                }).css
              ).toEqualIgnoringWhitespace('a {b: c;}');
            },
            {changeEntryPoint: 'index.js'}
          );
        }));
      it('resolves file extension variant', () =>
        sandbox(dir => {
          dir.write({
            'node_modules/foo/src/sass/_other.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {'./sass/*': './src/sass/*'},
            }),
          });
          dir.chdir(
            () => {
              expect(
                compileString('@use "pkg:foo/sass/other";', {
                  importers: [nodePackageImporter],
                }).css
              ).toEqualIgnoringWhitespace('a {b: c;}');
            },
            {changeEntryPoint: 'index.js'}
          );
        }));
      it('resolves multipart paths', () =>
        sandbox(dir => {
          dir.write({
            'node_modules/foo/src/sass/_other.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {'./*.scss': './src/*.scss'},
            }),
          });
          dir.chdir(
            () => {
              expect(
                compileString('@use "pkg:foo/sass/other";', {
                  importers: [nodePackageImporter],
                }).css
              ).toEqualIgnoringWhitespace('a {b: c;}');
            },
            {changeEntryPoint: 'index.js'}
          );
        }));
      it('throws if multiple wildcard exports match', () =>
        sandbox(dir => {
          dir.write({
            'node_modules/foo/src/sass/other.scss': 'a {b: c}',
            'node_modules/foo/src/sass/_other.scss': 'a {b: c}',
            'node_modules/foo/package.json': JSON.stringify({
              exports: {'./*.scss': './src/sass/*.scss'},
            }),
          });
          dir.chdir(
            () => {
              expect(
                () =>
                  compileString('@use "pkg:foo/other";', {
                    importers: [nodePackageImporter],
                  }).css
              ).toThrowSassException({
                includes: 'multiple potential resolutions',
              });
            },
            {changeEntryPoint: 'index.js'}
          );
        }));
    });
  });
  describe('without subpath', () => {
    it('sass key in package.json', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
          'node_modules/foo/package.json': JSON.stringify({
            sass: 'src/sass/_styles.scss',
          }),
        });
        dir.chdir(
          () => {
            const result = compileString('@use "pkg:foo";', {
              importers: [nodePackageImporter],
            });
            expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
          },
          {changeEntryPoint: 'index.js'}
        );
      }));
    it('style key in package.json', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
          'node_modules/foo/package.json': JSON.stringify({
            style: 'src/sass/_styles.scss',
          }),
        });
        dir.chdir(
          () => {
            const result = compileString('@use "pkg:foo";', {
              importers: [nodePackageImporter],
            });
            expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
          },
          {changeEntryPoint: 'index.js'}
        );
      }));

    ['index.scss', 'index.css', '_index.scss', '_index.css'].forEach(
      fileName => {
        it(`loads from ${fileName}`, () =>
          sandbox(dir => {
            dir.write({
              [`node_modules/foo/${fileName}`]: 'a {b: c}',
              'node_modules/foo/package.json': JSON.stringify({}),
            });
            dir.chdir(
              () => {
                const result = compileString('@use "pkg:foo";', {
                  importers: [nodePackageImporter],
                });
                expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
              },
              {changeEntryPoint: 'index.js'}
            );
          }));
      }
    );
    ['index.sass', '_index.sass'].forEach(fileName => {
      it(`loads from ${fileName}`, () =>
        sandbox(dir => {
          dir.write({
            [`node_modules/foo/${fileName}`]: 'a \n b: c',
            'node_modules/foo/package.json': JSON.stringify({}),
          });
          dir.chdir(
            () => {
              const result = compileString('@use "pkg:foo";', {
                importers: [nodePackageImporter],
              });
              expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
            },
            {changeEntryPoint: 'index.js'}
          );
        }));
    });
  });

  it('with subpath, resolves relative to package root', () =>
    sandbox(dir => {
      dir.write({
        'node_modules/bar/src/styles/sass/index.scss': 'a {b: c}',
        'node_modules/bar/package.json': JSON.stringify({}),
      });
      dir.chdir(
        () => {
          const result = compileString('@use "pkg:bar/src/styles/sass";', {
            importers: [nodePackageImporter],
          });
          expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
        },
        {changeEntryPoint: 'index.js'}
      );
    }));

  describe('resolves from packages', () => {
    it('resolves from secondary @use', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
          '_vendor.scss': '@use "pkg:bah";',
        });
        dir.chdir(
          () => {
            const result = compileString('@use "vendor";', {
              importers: [
                nodePackageImporter,
                {
                  findFileUrl: file => dir.url(file),
                },
              ],
            });
            expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
          },
          {changeEntryPoint: 'index.js'}
        );
      }));
    it('resolves from secondary @use pkg root', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': '@use "pkg:bar";',
          'node_modules/bah/package.json': JSON.stringify({}),
          'node_modules/bar/index.scss': 'a {b: c}',
          'node_modules/bar/package.json': JSON.stringify({}),
        });
        dir.chdir(
          () => {
            const result = compileString('@use "pkg:bah";', {
              importers: [nodePackageImporter],
            });
            expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
          },
          {changeEntryPoint: 'index.js'}
        );
      }));
    it('resolves most proximate node_module', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': '@use "pkg:bar";',
          'node_modules/bah/package.json': JSON.stringify({}),
          'node_modules/bar/index.scss': 'e {from: root}',
          'node_modules/bar/package.json': JSON.stringify({}),
          'node_modules/bah/node_modules/bar/index.scss':
            'a {from: submodule;}',
          'node_modules/bah/node_modules/bar/package.json': JSON.stringify({}),
        });
        dir.chdir(
          () => {
            const result = compileString('@use "pkg:bah";', {
              importers: [nodePackageImporter],
            });
            expect(result.css).toEqualIgnoringWhitespace(
              'a {from: submodule;}'
            );
          },
          {changeEntryPoint: 'index.js'}
        );
      }));
    it('resolves sub node_module', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': '@use "pkg:bar";',
          'node_modules/bah/package.json': JSON.stringify({}),
          'node_modules/bah/node_modules/bar/index.scss': 'a {b: c}',
          'node_modules/bah/node_modules/bar/package.json': JSON.stringify({}),
        });
        dir.chdir(
          () => {
            const result = compileString('@use "pkg:bah";', {
              importers: [nodePackageImporter],
            });
            expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
          },
          {changeEntryPoint: 'index.js'}
        );
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
          {changeEntryPoint: 'deeply/nested/file/index.js'}
        );
      }));
    it('fails if no match found', () => {
      sandbox(dir => {
        dir.chdir(
          () => {
            expect(() =>
              compileString('@use "pkg:bah";', {
                importers: [nodePackageImporter],
              })
            ).toThrowSassException({
              includes: "Can't find stylesheet to import",
            });
          },
          {changeEntryPoint: 'index.js'}
        );
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
        dir.chdir(
          () => {
            const result = compile('./_index.scss', {
              importers: [
                nodePackageImporter,
                {
                  findFileUrl: file => dir.url(file),
                },
              ],
            });
            expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
          },
          {changeEntryPoint: 'index.js'}
        );
      }));
    it('compileString', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
        });
        dir.chdir(
          () => {
            const result = compileString('@use "pkg:bah";', {
              importers: [nodePackageImporter],
            });
            expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
          },
          {changeEntryPoint: 'index.js'}
        );
      }));
    it('compileAsync', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
          '_index.scss': '@use "pkg:bah";',
        });
        return dir.chdir(
          async () => {
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
          },
          {changeEntryPoint: 'index.js'}
        );
      }));
    it('compileStringAsync', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
        });
        return dir.chdir(
          async () => {
            const result = await compileStringAsync('@use "pkg:bah";', {
              importers: [nodePackageImporter],
            });
            expect(result.css).toEqualIgnoringWhitespace('a {b: c;}');
            return result;
          },
          {changeEntryPoint: 'index.js'}
        );
      }));
    it('render string', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
        });
        return dir.chdir(
          async () => {
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
          },
          {changeEntryPoint: 'index.js'}
        );
      }));
    it('render file', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
          'index.scss': '@use "pkg:bah";',
        });
        return dir.chdir(
          async () => {
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
          },
          {changeEntryPoint: 'index.js'}
        );
      }));
    it('renderSync file', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
          'index.scss': '@use "pkg:bah";',
        });
        return dir.chdir(
          () => {
            const result = renderSync({
              file: 'index.scss',
              pkgImporter: 'node',
            }).css.toString();
            expect(result).toEqualIgnoringWhitespace('a { b: c;}');
          },
          {changeEntryPoint: 'index.js'}
        );
      }));
    it('renderSync data', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': JSON.stringify({}),
        });
        return dir.chdir(
          () => {
            const result = renderSync({
              data: '@use "pkg:bah"',
              pkgImporter: 'node',
            }).css.toString();
            expect(result).toEqualIgnoringWhitespace('a { b: c;}');
          },
          {changeEntryPoint: 'index.js'}
        );
      }));
  });
});
