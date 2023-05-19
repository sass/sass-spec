// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {compileString, compileStringAsync, Logger, SourceSpan} from 'sass';

import {captureStdio, captureStdioAsync} from './utils';

it('emits debug to stderr by default', () => {
  const stdio = captureStdio(() => {
    compileString('@debug heck');
  });
  expect(stdio.out).toBe('');
  expect(stdio.err).not.toBe('');
});

describe('deprecation warning', () => {
  // Regression test for sass/dart-sass#1790
  it('passes the message and span to the logger', done => {
    compileString('* > { --foo: bar }', {
      logger: {
        warn(message: string, {span}: {span?: SourceSpan}) {
          expect(message).toContain('only valid for nesting');
          expect(span?.start.line).toBe(0);
          expect(span?.start.column).toBe(0);
          expect(span?.end.line).toBe(0);
          expect(span?.end.column).toBe(3);
          done();
        },
      },
    });
  });
});

describe('with @warn', () => {
  it('passes the message and stack trace to the logger', done => {
    compileString(
      `
        @mixin foo {@warn heck}
        @include foo;
      `,
      {
        logger: {
          warn(
            message: string,
            {
              deprecation,
              span,
              stack,
            }: {deprecation: boolean; span?: SourceSpan; stack?: string}
          ) {
            expect(message).toBe('heck');
            expect(span).toBeUndefined();
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
        warn(message: string) {
          expect(message).toBe('#abc');
          done();
        },
      },
    });
  });

  it("doesn't inspect the argument", done => {
    compileString('@warn null', {
      logger: {
        warn(message: string) {
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
    expect(stdio.out).toBe('');
    expect(stdio.err).not.toBe('');
  });

  it("doesn't emit warnings with a warn callback", () => {
    const stdio = captureStdio(() => {
      compileString('@warn heck', {
        logger: {warn() {}},
      });
    });
    expect(stdio.out).toBe('');
    expect(stdio.err).toBe('');
  });

  it('still emits warning with only a debug callback', () => {
    const stdio = captureStdio(() => {
      compileString('@warn heck', {
        logger: {debug() {}},
      });
    });
    expect(stdio.out).toBe('');
    expect(stdio.err).not.toBe('');
  });

  it("doesn't emit warnings with Logger.silent", () => {
    const stdio = captureStdio(() => {
      compileString('@warn heck', {logger: Logger.silent});
    });
    expect(stdio.out).toBe('');
    expect(stdio.err).toBe('');
  });
});

describe('with @debug', () => {
  it('passes the message and span to the logger', done => {
    compileString('@debug heck', {
      logger: {
        debug(message: string, {span}: {span?: SourceSpan}) {
          expect(message).toBe('heck');
          expect(span?.start.line).toBe(0);
          expect(span?.start.column).toBe(0);
          expect(span?.end.line).toBe(0);
          expect(span?.end.column).toBe(11);
          done();
        },
      },
    });
  });

  it('stringifies the argument', done => {
    compileString('@debug #abc', {
      logger: {
        debug(message: string) {
          expect(message).toBe('#abc');
          done();
        },
      },
    });
  });

  it('inspects the argument', done => {
    compileString('@debug null', {
      logger: {
        debug(message: string) {
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
    expect(stdio.out).toBe('');
    expect(stdio.err).not.toBe('');
  });

  it("doesn't emit debugs with a debug callback", () => {
    const stdio = captureStdio(() => {
      compileString('@debug heck', {
        logger: {debug() {}},
      });
    });
    expect(stdio.out).toBe('');
    expect(stdio.err).toBe('');
  });

  it('still emits debugs with only a warn callback', () => {
    const stdio = captureStdio(() => {
      compileString('@debug heck', {
        logger: {warn() {}},
      });
    });
    expect(stdio.out).toBe('');
    expect(stdio.err).not.toBe('');
  });

  it("doesn't emit debugs with Logger.silent", () => {
    const stdio = captureStdio(() => {
      compileString('@debug heck', {logger: Logger.silent});
    });
    expect(stdio.out).toBe('');
    expect(stdio.err).toBe('');
  });
});

describe('compileStringAsync', () => {
  it('emits to stderr by default', async () => {
    const stdio = await captureStdioAsync(async () => {
      await compileStringAsync('@warn heck; @debug heck');
    });
    expect(stdio.out).toBe('');
    expect(stdio.err).not.toBe('');
  });

  it("doesn't emit to stderr with callbacks", async () => {
    const stdio = await captureStdioAsync(async () => {
      await compileStringAsync('@warn heck warn; @debug heck debug', {
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
    expect(stdio.out).toBe('');
    expect(stdio.err).toBe('');
  });
});
