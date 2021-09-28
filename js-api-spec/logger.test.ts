// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {compileString, Logger} from 'sass';

import {skipForImpl, captureStdio} from './utils';

skipForImpl('embedded-host', () => {
  it('emits debug to stderr by default', () => {
    const stdio = captureStdio(() => {
      compileString('@debug heck');
    });
    expect(stdio.out).toBeEmpty();
    expect(stdio.err).not.toBeEmpty();
  });

  describe('with @warn', () => {
    it('passes the message and stack trace to the logger', done => {
      compileString(
        `@mixin foo {@warn heck}
         @include foo;`,
        {
          logger: {
            warn(message, {deprecation, span, stack}) {
              expect(message).toBe('heck');
              expect(span).toBeNull();
              expect(stack).toBeString();
              expect(deprecation).toBeFalse();
              done();
            },
          },
        }
      );
    });

    it('stringifies the argument', done => {
      compileString('@warn #abc', {
        logger: {
          warn(message) {
            expect(message).toBe('#abc');
            done();
          },
        },
      });
    });

    it("doesn't inspect the argument", done => {
      compileString('@warn null', {
        logger: {
          warn(message) {
            expect(message).toBe('');
            done();
          },
        },
      });
    });

    it('emits to stderr by default', () => {
      const stdio = captureStdio(() => {
        compileString('@warn heck');
      });
      expect(stdio.out).toBeEmpty();
      expect(stdio.err).not.toBeEmpty();
    });

    it("doesn't emit warnings with a warn callback", () => {
      const stdio = captureStdio(() => {
        compileString('@warn heck', {
          logger: {warn() {}},
        });
      });
      expect(stdio.out).toBeEmpty();
      expect(stdio.err).toBeEmpty();
    });

    it('still emits warning with only a debug callback', () => {
      const stdio = captureStdio(() => {
        compileString('@warn heck', {
          logger: {debug() {}},
        });
      });
      expect(stdio.out).toBeEmpty();
      expect(stdio.err).not.toBeEmpty();
    });

    it("doesn't emit warnings with Logger.silent", () => {
      const stdio = captureStdio(() => {
        compileString('@warn heck', {logger: Logger.silent});
      });
      expect(stdio.out).toBeEmpty();
      expect(stdio.err).toBeEmpty();
    });
  });

  describe('with @debug', () => {
    it('passes the message and span to the logger', done => {
      compileString('@debug heck', {
        logger: {
          debug(message, {span}) {
            expect(message).toBe('heck');
            expect(span.start.line).toBe(0);
            expect(span.start.column).toBe(0);
            expect(span.end.line).toBe(0);
            expect(span.end.column).toBe(11);
            done();
          },
        },
      });
    });

    it('stringifies the argument', done => {
      compileString('@debug #abc', {
        logger: {
          debug(message) {
            expect(message).toBe('#abc');
            done();
          },
        },
      });
    });

    it('inspects the argument', done => {
      compileString('@debug null', {
        logger: {
          debug(message) {
            expect(message).toBe('null');
            done();
          },
        },
      });
    });

    it('emits to stderr by default', () => {
      const stdio = captureStdio(() => {
        compileString('@debug heck');
      });
      expect(stdio.out).toBeEmpty();
      expect(stdio.err).not.toBeEmpty();
    });

    it("doesn't emit debugs with a debug callback", () => {
      const stdio = captureStdio(() => {
        compileString('@debug heck', {
          logger: {debug() {}},
        });
      });
      expect(stdio.out).toBeEmpty();
      expect(stdio.err).toBeEmpty();
    });

    it('still emits debugs with only a warn callback', () => {
      const stdio = captureStdio(() => {
        compileString('@debug heck', {
          logger: {warn() {}},
        });
      });
      expect(stdio.out).toBeEmpty();
      expect(stdio.err).not.toBeEmpty();
    });

    it("doesn't emit debugs with Logger.silent", () => {
      const stdio = captureStdio(() => {
        compileString('@debug heck', {logger: Logger.silent});
      });
      expect(stdio.out).toBeEmpty();
      expect(stdio.err).toBeEmpty();
    });
  });
});
