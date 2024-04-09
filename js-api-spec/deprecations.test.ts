// Copyright 2024 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {
  compileString,
  deprecations,
  Deprecation,
  Deprecations,
  Importer,
  Version,
} from 'sass';

import {captureStdio, URL} from './utils';

/**
 * Map from obsolete deprecation IDs to version pairs.
 *
 * The first version is the version this deprecation type was deprecated in,
 * while the second version is the version it was made obsolete in.
 */
const obsoleteDeprecations: {[key in keyof Deprecations]?: [string, string]} =
  {};

/** Map from active deprecation IDs to the version they were deprecated in. */
const activeDeprecations: {[key in keyof Deprecations]?: string} = {
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
  'importer-without-url': '1.75.0',
};

/**
 * List of future deprecation IDs.
 *
 * This is only structured as an object to allow us to use a mapped object type
 * to ensure that all deprecation IDs listed here are included in the JS API
 * spec.
 */
const futureDeprecations: {[key in keyof Deprecations]?: true} = {import: true};

/**
 * This is a temporary synchronization check to ensure that any new deprecation
 * types are added to all five of these locations:
 * - lib/src/deprecation.dart in sass/dart-sass
 * - js-api-doc/deprecations.d.ts in sass/sass
 * - spec/js-api/deprecations.d.ts.md in sass/sass
 * - lib/src/deprecations.ts in sass/embedded-host-node
 * - js-api-spec/deprecations.test.ts in sass/sass-spec (this file)
 *
 * Work to replace these manual changes with generated code from a single
 * source-of-truth is tracked in sass/sass#3827
 */
it('there are no extra or missing deprecation types', () => {
  const expectedDeprecations = [
    ...Object.keys(obsoleteDeprecations),
    ...Object.keys(activeDeprecations),
    ...Object.keys(futureDeprecations),
    'user-authored',
  ];
  const actualDeprecations = Object.keys(deprecations);
  const extraDeprecations = actualDeprecations.filter(
    deprecation => !expectedDeprecations.includes(deprecation)
  );
  expect(extraDeprecations).toBeEmptyArray();
  const missingDeprecations = expectedDeprecations.filter(
    deprecation => !actualDeprecations.includes(deprecation)
  );
  expect(missingDeprecations).toBeEmptyArray();
});

describe('deprecation type', () => {
  const deprecationsMap = deprecations as unknown as {
    [key: string]: Deprecation;
  };

  for (const [id, versions] of Object.entries(obsoleteDeprecations)) {
    if (!versions) continue;
    const [deprecatedIn, obsoleteIn] = versions;
    it(`${id} deprecated in ${deprecatedIn} and obsolete in ${obsoleteIn}`, () => {
      const deprecation = deprecationsMap[id];
      expect(deprecation?.id).toBe(id);
      expect(deprecation?.status).toBe('obsolete');
      expect(deprecation?.deprecatedIn).toEqual(Version.parse(deprecatedIn));
      expect(deprecation?.obsoleteIn).toEqual(Version.parse(obsoleteIn));
    });
  }

  for (const [id, version] of Object.entries(activeDeprecations)) {
    it(`${id} deprecated in ${version}`, () => {
      const deprecation = deprecationsMap[id];
      expect(deprecation?.id).toBe(id);
      expect(deprecation?.status).toBe('active');
      expect(deprecation?.deprecatedIn).toEqual(Version.parse(version));
    });
  }

  for (const [id] of Object.entries(futureDeprecations)) {
    it(`${id} is a future deprecation`, () => {
      const deprecation = deprecationsMap[id];
      expect(deprecation?.id).toBe(id);
      expect(deprecation?.status).toBe('future');
    });
  }
});

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

describe('for a future deprecation,', () => {
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
