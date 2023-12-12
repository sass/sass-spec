// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import type {AsyncCompiler, Compiler, CompileResult} from 'sass';
import {initAsyncCompiler, initCompiler} from 'sass';

import {
  asyncImporters,
  functions,
  getLogger,
  getTriggeredImporter,
  importers,
} from './compiler.test';
import {sandbox} from './sandbox';
import {URL} from './utils';

describe('Compiler', () => {
  let compiler: Compiler;

  beforeEach(() => {
    compiler = initCompiler();
  });

  afterEach(() => {
    compiler.dispose();
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

    it('performs compilations in callbacks', () =>
      sandbox(dir => {
        dir.write({'input-nested.scss': 'x {y: z}'});
        const nestedImporter = {
          canonicalize: () => new URL('foo:bar'),
          load: () => ({
            contents: compiler.compile(dir('input-nested.scss')).css,
            syntax: 'scss' as const,
          }),
        };
        dir.write({'input.scss': '@import "nested"; a {b: c}'});
        const result = compiler.compile(dir('input.scss'), {
          importers: [nestedImporter],
        });
        expect(result.css).toEqualIgnoringWhitespace('x {y: z;} a {b: c;}');
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

  describe('compileAsync', () => {
    it(
      'handles multiple concurrent compilations',
      () =>
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
            .forEach((result, i) => {
              expect(result).toEqualIgnoringWhitespace(
                `.import {value: ${i};} .fn {value: "${i}";}`
              );
            });
          expect(logger.debug).toHaveBeenCalledTimes(runs);
        }),
      40_000 // Increase timeout for slow CI
    );

    it('throws after being disposed', () =>
      sandbox(async dir => {
        dir.write({'input.scss': '$a: b; c {d: $a}'});
        await compiler.dispose();
        expect(() => compiler.compileAsync(dir('input.scss'))).toThrowError();
      }));

    it('waits for compilations to finish before disposing', () =>
      sandbox(async dir => {
        let completed = false;
        dir.write({'input.scss': '@import "slow"'});
        const {importer, triggerComplete} = getTriggeredImporter(
          () => (completed = true)
        );
        const compilation = compiler.compileAsync(dir('input.scss'), {
          importers: [importer],
        });
        const disposalPromise = compiler.dispose();
        expect(completed).toBeFalse();
        triggerComplete();

        await disposalPromise;
        expect(completed).toBeTrue();
        await expectAsync(compilation).toBeResolved();
      }));
  });
});
