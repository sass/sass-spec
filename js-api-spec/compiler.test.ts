// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {initCompiler, initAsyncCompiler} from 'sass';
import type {Compiler, AsyncCompiler} from 'sass';
import {sandbox} from './sandbox';

describe('Compiler', () => {
  let compiler: Compiler;
  beforeEach(() => {
    compiler = initCompiler();
  });
  describe('compileString', () => {
    it('performs multiple compilations', () => {
      expect(compiler.compileString('$a: b; c {d: $a}').css).toBe(
        'c {\n  d: b;\n}'
      );
      expect(compiler.compileString('$a: 1; c {d: $a}').css).toBe(
        'c {\n  d: 1;\n}'
      );
    });
    it('throws after being disposed', () => {
      compiler.dispose();
      expect(() => compiler.compileString('$a: b; c {d: $a}')).toThrow();
    });
  });
  describe('compile', () => {
    it('performs multiple compilations', () => {
      sandbox(dir => {
        dir.write({'input.scss': '$a: b; c {d: $a}'});
        dir.write({'input2.scss': '$a: 1; c {d: $a}'});
        expect(compiler.compile(dir('input.scss')).css).toBe('c {\n  d: b;\n}');
        expect(compiler.compile(dir('input2.scss')).css).toBe(
          'c {\n  d: 1;\n}'
        );
      });
    });
    it('throws after being disposed', () => {
      sandbox(dir => {
        dir.write({'input.scss': '$a: b; c {d: $a}'});
        compiler.dispose();
        expect(() => compiler.compile(dir('input.scss'))).toThrow();
      });
    });
  });
});

describe('AsyncCompiler', () => {
  let compiler: AsyncCompiler;
  beforeEach(async () => {
    compiler = await initAsyncCompiler();
  });
  describe('compileStringAsync', () => {
    it('performs multiple compilations', async () => {
      expect((await compiler.compileStringAsync('$a: b; c {d: $a}')).css).toBe(
        'c {\n  d: b;\n}'
      );
      expect((await compiler.compileStringAsync('$a: 1; c {d: $a}')).css).toBe(
        'c {\n  d: 1;\n}'
      );
    });
    it('throws after being disposed', async () => {
      await compiler.dispose();
      await expectAsync(
        compiler.compileStringAsync('$a: b; c {d: $a}')
      ).toThrowSassException({line: 0});
    });
  });
  describe('compileAsync', () => {
    it('performs multiple compilations', async () => {
      await sandbox(async dir => {
        dir.write({'input.scss': '$a: b; c {d: $a}'});
        dir.write({'input2.scss': '$a: 1; c {d: $a}'});
        expect((await compiler.compileAsync(dir('input.scss'))).css).toBe(
          'c {\n  d: b;\n}'
        );
        expect((await compiler.compileAsync(dir('input2.scss'))).css).toBe(
          'c {\n  d: 1;\n}'
        );
      });
    });
    it('throws after being disposed', async () => {
      await sandbox(async dir => {
        dir.write({'input.scss': '$a: b; c {d: $a}'});
        await compiler.dispose();
        await expectAsync(
          compiler.compileAsync(dir('input.scss'))
        ).toThrowSassException({line: 0});
      });
    });
  });
});
