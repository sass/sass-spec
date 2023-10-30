// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {
  compile,
  compileString,
  compileStringAsync,
  nodePackageImporter,
  NodePackageImporter,
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
describe('resolves conditional exports', () => {
  it('sass at root', () => {
    sandbox(dir => {
      dir.write({
        'node_modules/foo/src/sass/_styles.scss': 'a {b: c}',
        'node_modules/foo/package.json': manifestBuilder({
          exports: {
            '.': {
              sass: './src/sass/_styles.scss',
              import: './js/index.js',
              require: './js/index.js',
            },
          },
        }),
      });
      dir.chdir(
        () => {
          const result = compileString('@use "pkg:foo";', {
            importers: [nodePackageImporter],
          });
          expect(result.css).toBe('aaa {\n  b: c;\n}');
        },
        {changeEntryPoint: 'index.js'}
      );
    });
  });

  xit('sass with subpath');
  xit('style at root');
  xit('style with subpath');
  xit('style at root');
  xit('style with subpath');
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
          expect(result.css).toBe('a {\n  b: c;\n}');
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
          expect(result.css).toBe('a {\n  b: c;\n}');
        },
        {changeEntryPoint: 'index.js'}
      );
    }));

  ['index.scss', 'index.css', '_index.scss', '_index.css'].forEach(fileName => {
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
            expect(result.css).toBe('a {\n  b: c;\n}');
          },
          {changeEntryPoint: 'index.js'}
        );
      }));
  });
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
            expect(result.css).toBe('a {\n  b: c;\n}');
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
          expect(result.css).toBe('a {\n  b: c;\n}');
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
          expect(result.css).toBe('a {\n  b: c;\n}');
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
          expect(result.css).toBe('a {\n  b: c;\n}');
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
          expect(result.css).toBe('a {\n  b: c;\n}');
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
          expect(result.css).toBe('a {\n  b: c;\n}');
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
          return expect(result.css).toBe('a {\n  b: c;\n}');
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
    expect(result.css).toBe('a {\n  from: dir;\n}');
  }));
xdescribe('compilation methods', () => {
  xit('compile');
  xit('compileString');
  xit('compileAsync');
  xit('compileStringAsync');
  xit('render');
  xit('renderSync');
});
