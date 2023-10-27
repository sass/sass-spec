// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {
  compile,
  compileString,
  compileStringAsync,
  nodePackageImporter,
  NodePackageImporter,
} from 'sass';

import {sandbox} from './sandbox';

function manifestBuilder(overrides?: {[key: string]: string}) {
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
xdescribe('resolves conditional exports', () => {
  xit('sass at root');
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

it('resolves from package', () =>
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
