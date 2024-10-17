// Copyright 2024 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {
  compileString,
  deprecations,
  Deprecation,
  Importer,
  Value,
  Version,
  SassColor,
  SassNumber,
} from 'sass';

import {captureStdio, URL} from './utils';

describe('a warning', () => {
  it('is emitted with no flags', done => {
    compileString('a { $b: c !global; }', {
      logger: {
        warn(
          message: string,
          {
            deprecationType,
          }: {deprecation: boolean; deprecationType?: Deprecation}
        ) {
          expect(deprecationType).toEqual(deprecations['new-global']);
          done();
        },
      },
    });
  });

  it('is emitted with different deprecation type silenced', done => {
    compileString('a { $b: c !global; }', {
      logger: {
        warn(
          message: string,
          {
            deprecationType,
          }: {deprecation: boolean; deprecationType?: Deprecation}
        ) {
          expect(deprecationType).toEqual(deprecations['new-global']);
          done();
        },
      },
      silenceDeprecations: ['call-string'],
    });
  });

  it('is not emitted when deprecation silenced', () => {
    const stdio = captureStdio(() => {
      compileString('a { $b: c !global; }', {
        silenceDeprecations: [deprecations['new-global']],
      });
    });
    expect(stdio.err).toBe('');
  });

  it('is not emitted when deprecation id silenced', () => {
    const stdio = captureStdio(() => {
      compileString('a { $b: c !global; }', {
        silenceDeprecations: ['new-global'],
      });
    });
    expect(stdio.err).toBe('');
  });

  it('is emitted for making same deprecation fatal and silent', done => {
    compileString('a { b: c; }', {
      fatalDeprecations: ['new-global'],
      silenceDeprecations: ['new-global'],
      logger: {
        warn(message: string) {
          expect(message).toContain('Ignoring setting to silence');
          done();
        },
      },
    });
  });

  it('is emitted for enabling active deprecation', done => {
    compileString('a { b: c; }', {
      futureDeprecations: ['new-global'],
      logger: {
        warn(message: string) {
          expect(message).toContain('does not need to be explicitly enabled');
          done();
        },
      },
    });
  });
});

describe('an error', () => {
  it('is thrown when deprecation made fatal', () => {
    expect(() =>
      compileString('a { $b: c !global; }', {
        fatalDeprecations: [deprecations['new-global']],
      })
    ).toThrowError();
  });

  it('is thrown when deprecation id made fatal', () => {
    expect(() =>
      compileString('a { $b: c !global; }', {
        fatalDeprecations: [deprecations['new-global']],
      })
    ).toThrowError();
  });

  it('is thrown when version made fatal', () => {
    expect(() =>
      compileString('a { $b: c !global; }', {
        fatalDeprecations: [new Version(1, 17, 2)],
      })
    ).toThrowError();
  });

  it('is thrown and warning emitted when both fatal and silenced', done => {
    expect(() =>
      compileString('a { $b: c !global; }', {
        fatalDeprecations: ['new-global'],
        silenceDeprecations: ['new-global'],
        logger: {
          warn(message: string) {
            expect(message).toContain('Ignoring setting to silence');
            done();
          },
        },
      })
    ).toThrowError();
  });
});

// Excluding these tests since there aren't any future deprecations currently.
xdescribe('for a future deprecation,', () => {
  let importer: Importer;
  beforeEach(() => {
    importer = {
      canonicalize: (url: string) => new URL(`u:${url}`),
      load() {
        return {contents: 'a { b: c; }', syntax: 'scss'};
      },
    };
  });

  it('no warning emitted by default', () => {
    const stdio = captureStdio(() => {
      compileString('@import "a"', {importers: [importer]});
    });
    expect(stdio.err).toBe('');
  });

  it('warning emitted when opted into', done => {
    compileString('@import "a"', {
      importers: [importer],
      futureDeprecations: [deprecations.import],
      logger: {
        warn(
          message: string,
          {
            deprecationType,
          }: {deprecation: boolean; deprecationType?: Deprecation}
        ) {
          expect(deprecationType).toEqual(deprecations.import);
          done();
        },
      },
    });
  });

  it('warning emitted when id opted into', done => {
    compileString('@import "a"', {
      importers: [importer],
      futureDeprecations: ['import'],
      logger: {
        warn(
          message: string,
          {
            deprecationType,
          }: {deprecation: boolean; deprecationType?: Deprecation}
        ) {
          expect(deprecationType).toEqual(deprecations.import);
          done();
        },
      },
    });
  });

  it('it must be enabled to be made fatal', done => {
    compileString('@import "a"', {
      importers: [importer],
      fatalDeprecations: ['import'],
      logger: {
        warn(message: string) {
          expect(message).toContain('deprecation must be enabled');
          done();
        },
      },
    });
  });

  it('silencing it takes precedence', done => {
    compileString('@import "a"', {
      importers: [importer],
      futureDeprecations: ['import'],
      silenceDeprecations: ['import'],
      logger: {
        warn(message: string) {
          expect(message).toContain('cancel each other out');
          done();
        },
      },
    });
  });

  it('warning emitted for silencing it', done => {
    compileString('a { b: c; }', {
      importers: [importer],
      silenceDeprecations: ['import'],
      logger: {
        warn(message: string) {
          expect(message).toContain('deprecation is not yet active');
          done();
        },
      },
    });
  });
});

describe('color deprecations', () => {
  it('emit a warning outside of any compilation', () => {
    const stdio = captureStdio(() => {
      new SassColor({red: 255, green: 0, blue: 0, space: 'rgb'}).red;
    });
    expect(stdio.err).toContain('color-4-api');
  });

  it('emit a warning when compilation not silenced', () => {
    const stdio = captureStdio(() => {
      compileString('a { b: fn(red); }', {
        functions: {
          'fn($color)': (args: Value[]) =>
            new SassNumber(args[0].assertColor().red),
        },
      });
    });
    expect(stdio.err).toContain('color-4-api');
  });

  it('emit no warning when silenced in current compilation', () => {
    const stdio = captureStdio(() => {
      compileString('a { b: fn(red); }', {
        silenceDeprecations: ['color-4-api'],
        functions: {
          'fn($color)': (args: Value[]) =>
            new SassNumber(args[0].assertColor().red),
        },
      });
    });
    expect(stdio.err).toEqual('');
  });

  it('throw an error when made fatal in current compilation', () => {
    expect(() =>
      compileString('a { b: fn(red); }', {
        fatalDeprecations: ['color-4-api'],
        functions: {
          'fn($color)': (args: Value[]) =>
            new SassNumber(args[0].assertColor().red),
        },
      })
    ).toThrowError();
  });
});
