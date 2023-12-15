// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import type {CompileResult, Importer} from 'sass';
import {
  initAsyncCompiler,
  initCompiler,
  SassString,
  AsyncCompiler,
  Compiler,
} from 'sass';

import {spy, URL} from './utils';

export const functions = {
  'foo($args)': (args: unknown) => new SassString(`${args}`),
};

export const importers: Array<Importer> = [
  {
    canonicalize: (url: string) => new URL(`u:${url}`),
    load: (url: typeof URL) => ({
      contents: `.import {value: ${url.pathname}} @debug "imported";`,
      syntax: 'scss' as const,
    }),
  },
];

export const asyncImporters: Array<Importer> = [
  {
    canonicalize: (url: string) => Promise.resolve(new URL(`u:${url}`)),
    load: (url: typeof URL) => Promise.resolve(importers[0].load(url)),
  },
];

export const getLogger = () => ({debug: spy(() => {})});

/* A trigged importer that executes a callback after a trigger is called */
export function getTriggeredImporter(callback: () => void): {
  importer: Importer;
  triggerComplete: () => void;
} {
  let promiseResolve: (value: unknown) => void;
  const awaitedPromise = new Promise(resolve => {
    promiseResolve = resolve;
  });
  return {
    importer: {
      canonicalize: async () => new URL('foo:bar'),
      load: async () => {
        await awaitedPromise;
        callback();
        return {contents: '', syntax: 'scss' as const};
      },
    },
    triggerComplete: () => promiseResolve(undefined),
  };
}

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

    it('performs compilations in callbacks', () => {
      const nestedImporter: Importer = {
        canonicalize: () => new URL('foo:bar'),
        load: () => ({
          contents: compiler.compileString('x {y: z}').css,
          syntax: 'scss',
        }),
      };
      const result = compiler.compileString('@import "nested"; a {b: c}', {
        importers: [nestedImporter],
      });
      expect(result.css).toEqualIgnoringWhitespace('x {y: z;} a {b: c;}');
    });

    it('throws after being disposed', () => {
      compiler.dispose();
      expect(() => compiler.compileString('$a: b; c {d: $a}')).toThrowError();
    });
  });

  it('errors if constructor invoked directly', () => {
    // Strip types to allow calling private constructor.
    class Untyped {}
    const UntypedCompiler = Compiler as unknown as typeof Untyped;
    expect(() => new UntypedCompiler()).toThrowError(
      /Compiler can not be directly constructed/
    );
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
        .forEach((result, i) => {
          expect(result).toEqualIgnoringWhitespace(
            `.import {value: ${i};} .fn {value: "${i}";}`
          );
        });
      expect(logger.debug).toHaveBeenCalledTimes(runs);
    }, 15_000); // Increase timeout for slow CI

    it('throws after being disposed', async () => {
      await compiler.dispose();
      expect(() =>
        compiler.compileStringAsync('$a: b; c {d: $a}')
      ).toThrowError();
    });

    it('waits for compilations to finish before disposing', async () => {
      let completed = false;
      const {importer, triggerComplete} = getTriggeredImporter(
        () => (completed = true)
      );
      const compilation = compiler.compileStringAsync('@import "slow"', {
        importers: [importer],
      });

      const disposalPromise = compiler.dispose();
      expect(completed).toBeFalse();
      triggerComplete();

      await disposalPromise;
      expect(completed).toBeTrue();
      await expectAsync(compilation).toBeResolved();
    });
  });

  it('errors if constructor invoked directly', () => {
    // Strip types to allow calling private constructor.
    class Untyped {}
    const UntypedAsyncCompiler = AsyncCompiler as unknown as typeof Untyped;
    expect(() => new UntypedAsyncCompiler()).toThrowError(
      /AsyncCompiler can not be directly constructed/
    );
  });
});
