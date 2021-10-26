// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import * as sass from 'sass';

import {skipForImpl, captureStdio, captureStdioAsync} from '../utils';

describe('render()', () => {
  it('renders a string', done => {
    sass.render({data: 'a {b: c}'}, (err, result) => {
      expect(err).toBeFalsy();
      expect(result!.css.toString()).toBe('a {\n  b: c;\n}');
      done();
    });
  });
});

skipForImpl('sass-embedded', () => {
  describe('logger', () => {
    describe('render', () => {
      it('emits to stderr by default', async () => {
        const stdio = await captureStdioAsync(async () => {
          await new Promise((resolve, reject) => {
            sass.render({data: '@warn heck; @debug heck'}, (err, result) => {
              if (err) {
                reject(err);
              } else {
                resolve(result);
              }
            });
          });
        });

        expect(stdio.out).toBeEmpty();
        expect(stdio.err).not.toBeEmpty();
      });

      it("doesn't emit to stderr with callbacks", async () => {
        const stdio = await captureStdioAsync(async () => {
          await new Promise((resolve, reject) => {
            sass.render(
              {
                data: '@warn heck warn; @debug heck debug',
                logger: {
                  warn(message) {
                    expect(message).toBe('heck warn');
                  },
                  debug(message) {
                    expect(message).toBe('heck debug');
                  },
                },
              },
              (err, result) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(result);
                }
              }
            );
          });
        });

        expect(stdio.out).toBeEmpty();
        expect(stdio.err).toBeEmpty();
      });
    });
  });
});
