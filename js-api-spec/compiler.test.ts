// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import type {AsyncCompiler, Compiler, CompileResult} from 'sass';
import {initAsyncCompiler, initCompiler, SassString} from 'sass';

import {sandbox} from './sandbox';
import {spy, URL} from './utils';

const functions = {'foo($args)': (args: unknown) => new SassString(`${args}`)};

const importers = [
  {
    canonicalize: (url: string) => new URL(`u:${url}`),
    load: (url: typeof URL) => ({
      contents: `.import {value: ${url.pathname}} @debug "imported";`,
      syntax: 'scss' as const,
    }),
  },
];

const asyncImporters = [
  {
    canonicalize: (url: string) =>
      Promise.resolve(importers[0].canonicalize(url)),
    load: (url: typeof URL) => Promise.resolve(importers[0].load(url)),
  },
];

const getLogger = () => ({debug: spy(() => {})});

/* Sort the output of the example CSS so it can be compared */
const sortCompiled = (a: string, b: string) => {
  const aMatch = a.match(/value: (\d+);/);
  const bMatch = b.match(/value: (\d+);/);
  if (!aMatch || !bMatch) {
    throw new Error(
      `Failed to parse ${a} or ${b} as numbers to determine sort order`
    );
  }
  return Number(aMatch[1]) - Number(bMatch[1]);
};

describe('Compiler', () => {
  let compiler: Compiler;

  beforeEach(() => {
    compiler = initCompiler();
  });

  afterEach(() => {
    compiler.dispose();
  });

  describe('compileString', () => {
    it('performs complete compilations', () => {
      const logger = getLogger();
      const result = compiler.compileString(
        '@import "bar"; .fn {value: foo(baz)}',
        {importers, functions, logger}
      );
      expect(result.css).toEqualIgnoringWhitespace(
        '.import {value: bar;} .fn {value: "baz";}'
      );
      expect(logger.debug).toHaveBeenCalledTimes(1);
    });

    it('throws after being disposed', () => {
      compiler.dispose();
      expect(() => compiler.compileString('$a: b; c {d: $a}')).toThrowError();
    });
  });

  describe('compile', () => {
    it('performs complete compilations', () =>
      sandbox(dir => {
        const logger = getLogger();
        dir.write({'input.scss': '@import "bar"; .fn {value: foo(bar)}'});
        const result = compiler.compile(dir('input.scss'), {
          importers,
          functions,
          logger,
        });
        expect(result.css).toEqualIgnoringWhitespace(
          '.import {value: bar;} .fn {value: "bar";}'
        );
        expect(logger.debug).toHaveBeenCalledTimes(1);
      }));

    it('throws after being disposed', () =>
      sandbox(dir => {
        dir.write({'input.scss': '$a: b; c {d: $a}'});
        compiler.dispose();
        expect(() => compiler.compile(dir('input.scss'))).toThrowError();
      }));
  });
});

describe('AsyncCompiler', () => {
  let compiler: AsyncCompiler;
  const runs = 1000; // Number of concurrent compilations to run

  beforeEach(async () => {
    compiler = await initAsyncCompiler();
  });

  afterEach(async () => {
    await compiler.dispose();
  });

  describe('compileStringAsync', () => {
    it('handles multiple concurrent compilations', async () => {
      const logger = getLogger();
      const compilations = Array(runs)
        .fill(0)
        .map((_, i) =>
          compiler.compileStringAsync(
            `@import "${i}"; .fn {value: foo(${i})}`,
            {importers: asyncImporters, functions, logger}
          )
        );
      Array.from(await Promise.all(compilations))
        .map((result: CompileResult) => result.css)
        .sort(sortCompiled)
        .forEach((result, i) => {
          expect(result).toEqualIgnoringWhitespace(
            `.import {value: ${i};} .fn {value: "${i}";}`
          );
        });
      expect(logger.debug).toHaveBeenCalledTimes(runs);
    });

    it('throws after being disposed', async () => {
      await compiler.dispose();
      expect(() =>
        compiler.compileStringAsync('$a: b; c {d: $a}')
      ).toThrowError();
    });

    it('waits for compilations to finish before disposing', async () => {
      const compilation = compiler.compileStringAsync('$a: b; c {d: $a}');
      await compiler.dispose();
      await expectAsync(compilation).toBeResolved();
    });
  });

  describe('compileAsync', () => {
    it('handles multiple concurrent compilations', () =>
      sandbox(async dir => {
        const logger = getLogger();
        const compilations = Array(runs)
          .fill(0)
          .map((_, i) => {
            const filename = `input-${i}.scss`;
            dir.write({
              [filename]: `@import "${i}"; .fn {value: foo(${i})}`,
            });
            return compiler.compileAsync(dir(filename), {
              importers: asyncImporters,
              functions,
              logger,
            });
          });
        Array.from(await Promise.all(compilations))
          .map((result: CompileResult) => result.css)
          .sort(sortCompiled)
          .forEach((result, i) => {
            expect(result).toEqualIgnoringWhitespace(
              `.import {value: ${i};} .fn {value: "${i}";}`
            );
          });
        expect(logger.debug).toHaveBeenCalledTimes(runs);
      }));

    it('throws after being disposed', async () => {
      sandbox(async dir => {
        dir.write({'input.scss': '$a: b; c {d: $a}'});
        await compiler.dispose();
        expect(() => compiler.compileAsync(dir('input.scss'))).toThrowError();
      });
    });

    it('waits for compilations to finish before disposing', () =>
      sandbox(async dir => {
        dir.write({'input.scss': '$a: b; c {d: $a}'});
        const compilation = compiler.compileAsync(dir('input.scss'));
        await compiler.dispose();
        await expectAsync(compilation).toBeResolved();
      }));
  });
});
