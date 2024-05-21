// Copyright 2024 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import fs from 'fs';
import yaml from 'js-yaml';
import {
  compileString,
  deprecations,
  Deprecation,
  Importer,
  Version,
} from 'sass';

import {captureStdio, URL} from './utils';

describe('deprecation type', () => {
  const deprecationsMap = deprecations as unknown as {
    [key: string]: Deprecation;
  };
  const obsoleteDeprecations: {[key: string]: [string, string]} = {};
  const activeDeprecations: {[key: string]: string} = {};
  const futureDeprecations: {[key: string]: true} = {};
  const data = yaml.load(
    fs.readFileSync('js-api-spec/node_modules/sass/deprecations.yaml', 'utf8')
  ) as {
    [key: string]: {
      'dart-sass':
        | {status: 'future'}
        | {status: 'active'; deprecated: string}
        | {status: 'obsolete'; deprecated: string; obsolete: string};
    };
  };
  for (const [id, deprecation] of Object.entries(data)) {
    const dartSass = deprecation['dart-sass'];
    if (dartSass.status === 'obsolete') {
      obsoleteDeprecations[id] = [dartSass.deprecated, dartSass.obsolete];
    } else if (dartSass.status === 'active') {
      activeDeprecations[id] = dartSass.deprecated;
    } else if (dartSass.status === 'future') {
      futureDeprecations[id] = true;
    }
  }

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
