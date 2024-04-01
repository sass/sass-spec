// Copyright 2024 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {
  compileString,
  deprecations,
  Deprecation,
  Importer,
  Version,
} from 'sass';

import {captureStdio, URL} from './utils';

// TODO(jathak): Add tests for obsolete deprecations once any actually exist.

describe('deprecation types', () => {
  const activeDeprecations = {
    'call-string': '0.0.0',
    elseif: '1.3.2',
    'moz-document': '1.7.2',
    'relative-canonical': '1.14.2',
    'new-global': '1.17.2',
    'color-module-compat': '1.23.0',
    'slash-div': '1.33.0',
    'bogus-combinators': '1.54.0',
    'strict-unary': '1.55.0',
    'function-units': '1.56.0',
    'duplicate-var-flags': '1.62.0',
    'null-alpha': '1.62.3',
    'abs-percent': '1.65.0',
    'fs-importer-cwd': '1.73.0',
  };
  const futureDeprecations = ['import'];

  const deprecationsMap = deprecations as unknown as {
    [key: string]: Deprecation;
  };

  for (const [id, version] of Object.entries(activeDeprecations)) {
    it(`${id} deprecated in ${version}`, () => {
      const deprecation = deprecationsMap[id];
      expect(deprecation?.id).toBe(id);
      expect(deprecation?.status).toBe('active');
      expect(deprecation?.deprecatedIn).toEqual(Version.parse(version));
    });
  }

  for (const id of futureDeprecations) {
    it(`${id} is a future deprecation`, () => {
      const deprecation = deprecationsMap[id];
      expect(deprecation?.id).toBe(id);
      expect(deprecation?.status).toBe('future');
    });
  }
});

describe('deprecation flags', () => {
  it('warning emitted with no flags', done => {
    compileString('a { $b: c !global; }', {
      logger: {
        warn(
          message: string,
          {deprecationType}: {deprecationType?: Deprecation}
        ) {
          expect(deprecationType).toEqual(deprecations['new-global']);
          done();
        },
      },
    });
  });

  it('warning emitted with different deprecation type silenced', done => {
    compileString('a { $b: c !global; }', {
      logger: {
        warn(
          message: string,
          {deprecationType}: {deprecationType?: Deprecation}
        ) {
          expect(deprecationType).toEqual(deprecations['new-global']);
          done();
        },
      },
      silenceDeprecations: ['call-string'],
    });
  });

  it('no warning emitted when deprecation silenced', () => {
    const stdio = captureStdio(() => {
      compileString('a { $b: c !global; }', {
        silenceDeprecations: [deprecations['new-global']],
      });
    });
    expect(stdio.err).toBe('');
  });

  it('no warning emitted when deprecation id silenced', () => {
    const stdio = captureStdio(() => {
      compileString('a { $b: c !global; }', {
        silenceDeprecations: ['new-global'],
      });
    });
    expect(stdio.err).toBe('');
  });

  it('error thrown when deprecation made fatal', () => {
    expect(() =>
      compileString('a { $b: c !global; }', {
        fatalDeprecations: [deprecations['new-global']],
      })
    ).toThrowError();
  });

  it('error thrown when deprecation id made fatal', () => {
    expect(() =>
      compileString('a { $b: c !global; }', {
        fatalDeprecations: [deprecations['new-global']],
      })
    ).toThrowError();
  });

  it('error thrown when version made fatal', () => {
    expect(() =>
      compileString('a { $b: c !global; }', {
        fatalDeprecations: [new Version(1, 17, 2)],
      })
    ).toThrowError();
  });

  it('fatal takes precedence, but a warning is emitted', done => {
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

  it('warning emitted for making same deprecation fatal and silent', done => {
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

  describe('future deprecation', () => {
    let importer: Importer;
    beforeEach(() => {
      importer = {
        canonicalize: (url: string) => new URL(`u:${url}`),
        load() {
          return {contents: 'a { b: c; }', syntax: 'scss'};
        },
      };
    });

    it('warning emitted when opted into', done => {
      compileString('@import "a"', {
        importers: [importer],
        futureDeprecations: [deprecations.import],
        logger: {
          warn(
            message: string,
            {deprecationType}: {deprecationType?: Deprecation}
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
            {deprecationType}: {deprecationType?: Deprecation}
          ) {
            expect(deprecationType).toEqual(deprecations.import);
            done();
          },
        },
      });
    });

    it('must be enabled to be made fatal', done => {
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

    it('silencing enabled future deprecation takes precedence', done => {
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

    it('warning emitted for silencing future deprecation', done => {
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

    it('warning emitted for enabling active deprecation', done => {
      compileString('a { b: c; }', {
        importers: [importer],
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
});
