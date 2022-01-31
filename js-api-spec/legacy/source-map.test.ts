// Copyright 2022 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {pathToFileURL} from 'url';
import parseDataURL from 'data-urls';
import * as p from 'path';
import * as sass from 'sass';

import {sandbox} from '../sandbox';
import {skipForImpl} from '../utils';

describe('a basic invocation', () => {
  let css: string;
  let map: {[key: string]: unknown};
  beforeEach(() => {
    const result = sass.renderSync({
      data: 'a {b: c}',
      sourceMap: true,
      outFile: 'out.css',
    });
    css = result.css.toString();
    map = JSON.parse(result.map!.toString()) as {[key: string]: unknown};
  });

  it('includes reasonable-looking mappings', () => {
    expect(map).toContainKey('mappings');
    expect(map['mappings']).toMatch(/^([A-Za-z\d+/=]*[,;]?)*$/);
  });

  it('includes the name of the output file', () =>
    expect(map).toContainEntry(['file', 'out.css']));

  it('includes stdin as a source', () =>
    expect(map).toContainEntry(['sources', ['stdin']]));

  it('includes a source map comment', () =>
    expect(css).toEndWith('\n\n/*# sourceMappingURL=out.css.map */'));
});

describe('the sources list', () => {
  it('contains a relative path to an input file', () =>
    sandbox(dir => {
      dir.write({'test.scss': 'a {b: c}'});

      const map = renderSourceMap({
        file: dir('test.scss'),
        sourceMap: true,
        outFile: dir('out.css'),
      });
      expect(map).toContainEntry(['sources', ['test.scss']]);
    }));

  it('makes the path relative to outFile', () =>
    sandbox(dir => {
      dir.write({'test.scss': 'a {b: c}'});

      const map = renderSourceMap({
        file: dir('test.scss'),
        sourceMap: true,
        outFile: dir('dir/out.css'),
      });
      expect(map).toContainEntry([
        'sources',
        [p.relative(dir('dir'), dir('test.scss')).replace(/\\/g, '/')],
      ]);
    }));

  it("contains an imported file's path", () =>
    sandbox(dir => {
      dir.write({
        'test.scss': `
            @import "other";
            a {b: c}
          `,
        '_other.scss': 'x {y: z}',
      });

      const map = renderSourceMap({
        file: dir('test.scss'),
        sourceMap: true,
        outFile: dir('out.css'),
      });
      expect(map).toContainEntry(['sources', ['_other.scss', 'test.scss']]);
    }));

  it('contains the resolved path of a file imported via includePaths', () =>
    sandbox(dir => {
      dir.write({
        'test.scss': `
            @import "other";
            a {b: c}
          `,
        'subdir/_other.scss': 'x {y: z}',
      });

      const map = renderSourceMap({
        file: dir('test.scss'),
        sourceMap: true,
        includePaths: [dir('subdir')],
        outFile: dir('out.css'),
      });
      expect(map).toContainEntry([
        'sources',
        ['subdir/_other.scss', 'test.scss'],
      ]);
    }));

  skipForImpl('sass-embedded', () => {
    it('contains a URL handled by an importer', () => {
      const map = renderSourceMap({
        data: `
          @import "other";
          a {b: c}
        `,
        sourceMap: true,
        importer: () => ({contents: 'x {y: z}'}),
        outFile: 'out.css',
      });
      expect(map).toContainEntry(['sources', ['other', 'stdin']]);
    });
  });
});

describe("doesn't emit the source map", () => {
  it('without sourceMap', () => {
    const result = sass.renderSync({data: 'a {b: c}', outFile: 'out.css'});
    expect(result.map).toBeUndefined();
    expect(result.css.toString).not.toContain('/*#');
  });

  it('with sourceMap: false', () => {
    const result = sass.renderSync({
      data: 'a {b: c}',
      sourceMap: false,
      outFile: 'out.css',
    });
    expect(result.map).toBeUndefined();
    expect(result.css.toString).not.toContain('/*#');
  });

  it('without outFile', () => {
    const result = sass.renderSync({data: 'a {b: c}', sourceMap: false});
    expect(result.map).toBeUndefined();
    expect(result.css.toString).not.toContain('/*#');
  });
});

describe('with a string sourceMap and no outFile', () => {
  it('emits a source map', () =>
    expect(
      renderSourceMap({data: 'a {b: c}', sourceMap: 'out.css.map'})
    ).toContainEntry(['sources', ['stdin']]));

  it('derives the target URL from the input file', () =>
    sandbox(dir => {
      dir.write({'test.scss': 'a {b: c}'});

      expect(
        renderSourceMap({
          file: dir('test.scss'),
          sourceMap: 'out.css.map',
        })
      ).toContainEntry(['file', pathToFileURL(dir('test.css')).toString()]);
    }));

  it('derives the target URL from the input file without an extension', () =>
    sandbox(dir => {
      dir.write({test: 'a {b: c}'});

      expect(
        renderSourceMap({
          file: dir('test'),
          sourceMap: 'out.css.map',
        })
      ).toContainEntry(['file', pathToFileURL(dir('test.css')).toString()]);
    }));

  it('derives the target URL from stdin', () =>
    expect(
      renderSourceMap({data: 'a {b: c}', sourceMap: 'out.css.map'})
    ).toContainEntry(['file', 'stdin.css']));

  skipForImpl('sass-embedded', () => {
    // Regression test for sass/dart-sass#922
    it('contains a URL handled by an importer when sourceMap is absolute', () =>
      expect(
        renderSourceMap({
          data: `
            @import "other";
            a {b: c}
          `,
          importer: () => ({contents: 'x {y: z}'}),
          sourceMap: p.resolve('out.css.map'),
          outFile: 'out.css',
        })
      ).toContainEntry(['sources', ['other', 'stdin']]));
  });
});

it("with omitSourceMapUrl, doesn't include a source map comment", () => {
  const result = sass.renderSync({
    data: 'a {b: c}',
    sourceMap: true,
    outFile: 'out.css',
    omitSourceMapUrl: true,
  });
  expect(result.map).not.toBeNil();
  expect(result.css.toString).not.toContain('/*#');
});

describe('with a string sourceMap', () => {
  it('uses it in the source map comment', () => {
    const result = sass.renderSync({
      data: 'a {b: c}',
      sourceMap: 'map',
      outFile: 'out.css',
    });
    expect(result.map).not.toBeNil();
    expect(result.css.toString()).toEndWith('\n\n/*# sourceMappingURL=map */');
  });

  it('makes the source map comment relative to the outfile', () => {
    const result = sass.renderSync({
      data: 'a {b: c}',
      sourceMap: 'map',
      outFile: 'dir/out.css',
    });
    expect(result.map).not.toBeNil();
    expect(result.css.toString()).toEndWith(
      '\n\n/*# sourceMappingURL=../map */'
    );
  });

  it('makes the file field relative to the source map location', () =>
    expect(
      renderSourceMap({
        data: 'a {b: c}',
        sourceMap: 'dir/map',
        outFile: 'out.css',
      })
    ).toContainEntry(['file', '../out.css']));

  it('makes the source map comment relative even if the path is absolute', () => {
    const result = sass.renderSync({
      data: 'a {b: c}',
      sourceMap: p.resolve('map'),
      outFile: 'out.css',
    });
    expect(result.map).not.toBeNil();
    expect(result.css.toString()).toEndWith('\n\n/*# sourceMappingURL=map */');
  });

  it('makes the sources list relative to the map location', () =>
    sandbox(dir => {
      dir.write({'test.scss': 'a {b: c}'});

      expect(
        renderSourceMap({
          file: dir('test.scss'),
          sourceMap: dir('map'),
          outFile: 'out.css',
        })
      ).toContainEntry(['sources', ['test.scss']]);
    }));
});

describe('with sourceMapContents', () => {
  it('includes the source contents in the source map', () =>
    expect(
      renderSourceMap({
        data: 'a {b: c}',
        sourceMap: true,
        outFile: 'out.css',
        sourceMapContents: true,
      })
    ).toContainEntry(['sourcesContent', ['a {b: c}']]));

  it("includes an imported file's contents in the source map", () =>
    sandbox(dir => {
      const scss = `
        @import "other";
        a {b: c}
      `;
      dir.write({'test.scss': scss, 'other.scss': 'x {y: z}'});

      expect(
        renderSourceMap({
          file: dir('test.scss'),
          sourceMap: true,
          outFile: 'out.css',
          sourceMapContents: true,
        })
      ).toContainEntry(['sourcesContent', ['x {y: z}', scss]]);
    }));
});

it('with sourceMapEmbed includes the source map in the CSS', () => {
  const result = sass.renderSync({
    data: 'a {b: c}',
    sourceMap: true,
    outFile: 'out.css',
    sourceMapEmbed: true,
  });

  const map = embeddedSourceMap(result.css.toString());
  expect(map).toEqual(JSON.parse(result.map!.toString()));
});

describe('with sourceMapRoot', () => {
  it('includes the root as-is in the map', () =>
    expect(
      renderSourceMap({
        data: 'a {b: c}',
        sourceMap: true,
        outFile: 'out.css',
        sourceMapRoot: 'some random string',
      })
    ).toContainEntry(['sourceRoot', 'some random string']));

  it("doesn't modify the source URLs", () =>
    sandbox(dir => {
      dir.write({'test.scss': 'a {b: c}'});

      const root = pathToFileURL(dir.root).toString();
      const map = renderSourceMap({
        file: dir('test.scss'),
        sourceMap: true,
        outFile: dir('out.css'),
        sourceMapRoot: root,
      });
      expect(map).toContainEntry(['sourceRoot', root]);
      expect(map).toContainEntry(['sources', ['test.scss']]);
    }));
});

/// Renders [options] and returns the decoded source map.
function renderSourceMap(options: sass.LegacyOptions<'sync'>): {
  [key: string]: unknown;
} {
  return JSON.parse(sass.renderSync(options).map!.toString()) as {
    [key: string]: unknown;
  };
}

/// Returns the source map embedded in a `data:` URL in `css`.
function embeddedSourceMap(css: string): {
  [key: string]: unknown;
} {
  const regexp = /\/\*# sourceMappingURL=(.*) \*\/\s*$/;
  expect(css).toMatch(regexp);

  const data = parseDataURL(css.match(regexp)![1]!)!;
  expect(data.mimeType.toString()).toBe('application/json');

  return JSON.parse(Buffer.from(data.body.buffer).toString()) as {
    [key: string]: unknown;
  };
}
