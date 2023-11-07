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
  FileImporter,
} from 'sass';

import {sandbox, SandboxDirectory} from './sandbox';

const fileImporter = (dir: SandboxDirectory): FileImporter => ({
  findFileUrl: file => dir.url(file),
});

function manifestBuilder(overrides?: {[key: string]: string | Object}) {
  return JSON.stringify({
    name: 'foo',
    version: '1.0.0',
    description: 'Verifying proposed pkg: loading algorithm',
    scripts: {
      test: 'echo "Error: no test specified" && exit 1',
    },
    author: 'Package Author',
    license: 'ISC',
    ...overrides,
  });
}

function exportsBuilder(key: string) {
  return {
    exports: {
      '.': {
        [key]: './src/sass/_styles.scss',
      },
      './colors/index.scss': {
        [key]: './src/sass/colors/index.scss',
      },
      './_variables.scss': {
        [key]: './src/sass/_variables.scss',
      },
    },
  };
}

describe('Node Package Importer', () => {
  describe('resolves conditional exports', () => {
    ['sass', 'style', 'default'].forEach(key => {
      it(`${key} at root`, () =>
        sandbox(dir => {
          dir.write({
            'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
            'node_modules/foo/package.json': manifestBuilder(
              exportsBuilder(key)
            ),
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
      it(`${key} at root without non-pathed exports`, () =>
        sandbox(dir => {
          dir.write({
            'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
            'node_modules/foo/package.json': manifestBuilder({
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
            'node_modules/foo/src/sass/_styles.scss': 'd {e: f}',
            'node_modules/foo/src/sass/_variables.scss': 'a {b: c}',
            'node_modules/foo/package.json': manifestBuilder(
              exportsBuilder(key)
            ),
          });
          dir.chdir(
            () => {
              const result = compileString('@use "pkg:foo/variables";', {
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
            'node_modules/foo/src/sass/_variables.scss': 'g {h: i}',
            'node_modules/foo/src/sass/colors/index.scss': 'a {b: c}',
            'node_modules/foo/package.json': manifestBuilder(
              exportsBuilder(key)
            ),
          });
          dir.chdir(
            () => {
              const result = compileString('@use "pkg:foo/colors";', {
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
          'node_modules/foo/src/sass/_styles.scss': 'd {e: f}',
          'node_modules/foo/src/sass/_variables.scss':
            'a {from: sassCondition}',
          'node_modules/foo/package.json': manifestBuilder({
            exports: {
              '.': {
                sass: './src/sass/_variables.scss',
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
          'node_modules/foo/src/sass/_variables.scss': 'a {b: c}',
          'node_modules/foo/package.json': manifestBuilder({
            exports: {
              './index.scss': {sass: './src/sass/_variables.scss'},
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
          'node_modules/foo/src/sass/_variables.scss': 'a {b: c}',
          'node_modules/foo/package.json': manifestBuilder({
            exports: './src/sass/_variables.scss',
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
            'node_modules/foo/src/sass/_variables.scss': 'a {b: c}',
            'node_modules/foo/package.json': manifestBuilder({
              exports: {'./*.scss': './src/sass/*.scss'},
            }),
          });
          dir.chdir(
            () => {
              expect(
                compileString('@use "pkg:foo/variables";', {
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
            'node_modules/foo/src/sass/_variables.scss': 'a {b: c}',
            'node_modules/foo/package.json': manifestBuilder({
              exports: {'./sass/*': './src/sass/*'},
            }),
          });
          dir.chdir(
            () => {
              expect(
                compileString('@use "pkg:foo/sass/variables";', {
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
            'node_modules/foo/src/sass/_variables.scss': 'a {b: c}',
            'node_modules/foo/package.json': manifestBuilder({
              exports: {'./*.scss': './src/*.scss'},
            }),
          });
          dir.chdir(
            () => {
              expect(
                compileString('@use "pkg:foo/sass/variables";', {
                  importers: [nodePackageImporter],
                }).css
              ).toEqualIgnoringWhitespace('a {b: c;}');
            },
            {changeEntryPoint: 'index.js'}
          );
        }));
      it('throws if multiple wildcard export match', () =>
        sandbox(dir => {
          dir.write({
            'node_modules/foo/src/sass/variables.scss': 'a {b: c}',
            'node_modules/foo/src/sass/_variables.scss': 'a {b: c}',
            'node_modules/foo/package.json': manifestBuilder({
              exports: {'./*.scss': './src/sass/*.scss'},
            }),
          });
          dir.chdir(
            () => {
              expect(
                () =>
                  compileString('@use "pkg:foo/variables";', {
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
          'node_modules/foo/package.json': manifestBuilder({
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
          'node_modules/foo/package.json': manifestBuilder({
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

    ['index.scss', 'index.css', '_index.scss', '_index.css'].forEach(
      fileName => {
        it(`loads from ${fileName}`, () =>
          sandbox(dir => {
            dir.write({
              [`node_modules/foo/${fileName}`]: 'a {b: c}',
              'node_modules/foo/package.json': manifestBuilder(),
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
            'node_modules/foo/package.json': manifestBuilder(),
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
  xdescribe('with subpath', () => {
    xit('resolves relative to package root');
  });

  describe('resolves from packages', () => {
    it('resolves from entry point', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': manifestBuilder(),
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
    it('resolves from secondary @use', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': manifestBuilder(),
          '_vendor.scss': '@use "pkg:bah";',
        });
        dir.chdir(
          () => {
            const result = compileString('@use "vendor";', {
              importers: [nodePackageImporter, fileImporter(dir)],
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
          'node_modules/bah/package.json': manifestBuilder(),
          'node_modules/bar/index.scss': 'a {b: c}',
          'node_modules/bar/package.json': manifestBuilder(),
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
          'node_modules/bah/package.json': manifestBuilder(),
          'node_modules/bar/index.scss': 'e {from: root}',
          'node_modules/bar/package.json': manifestBuilder(),
          'node_modules/bah/node_modules/bar/index.scss': 'a {b: c}',
          'node_modules/bah/node_modules/bar/package.json': manifestBuilder(),
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
    it('resolves sub node_module', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': '@use "pkg:bar";',
          'node_modules/bah/package.json': manifestBuilder(),
          'node_modules/bah/node_modules/bar/index.scss': 'a {b: c}',
          'node_modules/bah/node_modules/bar/package.json': manifestBuilder(),
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
          'node_modules/bar/package.json': manifestBuilder(),
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
    it('throws if no match found', () => {
      sandbox(dir => {
        dir.chdir(
          () => {
            expect(() =>
              compileString('@use "pkg:bah";', {
                importers: [nodePackageImporter],
              })
            ).toThrowSassException({
              includes: "Node Package 'bah' could not be found",
            });
          },
          {changeEntryPoint: 'index.js'}
        );
      });
    });
  });
  xit('fake Node Package Importer', () =>
    sandbox(dir => {
      dir.write({'foo/index.scss': 'a {from: dir}'});

      const foo = {_NodePackageImporterBrand: ''} as NodePackageImporter;

      const result = compileString('@use "pkg:foo";', {
        importers: [foo],
        // loadPaths: [dir('dir')],
      });
      expect(result.css).toEqualIgnoringWhitespace('a { from: dir;}');
    }));
  describe('compilation methods', () => {
    it('compile', () =>
      sandbox(dir => {
        dir.write({
          'node_modules/bah/index.scss': 'a {b: c}',
          'node_modules/bah/package.json': manifestBuilder(),
          '_index.scss': '@use "pkg:bah";',
        });
        dir.chdir(
          () => {
            const result = compile('./_index.scss', {
              importers: [nodePackageImporter, fileImporter(dir)],
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
          'node_modules/bah/package.json': manifestBuilder(),
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
          'node_modules/bah/package.json': manifestBuilder(),
          '_index.scss': '@use "pkg:bah";',
        });
        return dir.chdir(
          async () => {
            const result = await compileAsync('./_index.scss', {
              importers: [nodePackageImporter, fileImporter(dir)],
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
          'node_modules/bah/package.json': manifestBuilder(),
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
          'node_modules/bah/package.json': manifestBuilder(),
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
          'node_modules/bah/package.json': manifestBuilder(),
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
          'node_modules/bah/package.json': manifestBuilder(),
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
          'node_modules/bah/package.json': manifestBuilder(),
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
