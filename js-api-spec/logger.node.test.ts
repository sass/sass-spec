// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {compile, compileAsync} from 'sass';

import {sandbox} from './sandbox';
import {captureStdio, captureStdioAsync} from './utils';

describe('compile', () => {
  it('emits to stderr by default', () =>
    sandbox(dir => {
      dir.write({'style.scss': '@warn heck; @debug heck'});

      const stdio = captureStdio(() => {
        compile(dir('style.scss'));
      });
      expect(stdio.out).toBeEmptyString();
      expect(stdio.err).not.toBeEmptyString();
    }));

  it("doesn't emit to stderr with callbacks", () =>
    sandbox(dir => {
      dir.write({'style.scss': '@warn heck warn; @debug heck debug'});

      const stdio = captureStdio(() => {
        compile(dir('style.scss'), {
          logger: {
            warn(message: string) {
              expect(message).toBe('heck warn');
            },
            debug(message: string) {
              expect(message).toBe('heck debug');
            },
          },
        });
      });
      expect(stdio.out).toBeEmptyString();
      expect(stdio.err).toBeEmptyString();
    }));
});

describe('compileAsync', () => {
  it('emits to stderr by default', () =>
    sandbox(async dir => {
      dir.write({'style.scss': '@warn heck; @debug heck'});

      const stdio = await captureStdioAsync(async () => {
        await compileAsync(dir('style.scss'));
      });
      expect(stdio.out).toBeEmptyString();
      expect(stdio.err).not.toBeEmptyString();
    }));

  it("doesn't emit to stderr with callbacks", () =>
    sandbox(async dir => {
      dir.write({'style.scss': '@warn heck warn; @debug heck debug'});

      const stdio = await captureStdioAsync(async () => {
        await compileAsync(dir('style.scss'), {
          logger: {
            warn(message: string) {
              expect(message).toBe('heck warn');
            },
            debug(message: string) {
              expect(message).toBe('heck debug');
            },
          },
        });
      });
      expect(stdio.out).toBeEmptyString();
      expect(stdio.err).toBeEmptyString();
    }));
});
