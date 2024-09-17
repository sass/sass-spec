// Copyright 2024 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import fs from 'fs';
import yaml from 'js-yaml';
import {deprecations, renderSync, Deprecation, Version} from 'sass';
import {captureStdio} from './utils';

describe('a warning from the JS API', () => {
  it('is emitted with no flags', () => {
    const stdio = captureStdio(() => {
      renderSync({
        data: 'a { b: c; }',
      });
    });
    expect(stdio.err).toContain('legacy JS API');
  });

  it('is not emitted when deprecation silenced', () => {
    const stdio = captureStdio(() => {
      renderSync({
        data: 'a { b: c; }',
        silenceDeprecations: [deprecations['legacy-js-api']],
      });
    });
    expect(stdio.err).toBe('');
  });
});

describe('deprecation type', () => {
  const deprecationsMap = deprecations as unknown as {
    [key: string]: Deprecation;
  };
  const obsoleteDeprecations: {[key: string]: [string, string]} = {};
  const activeDeprecations: {[key: string]: string} = {};
  const futureDeprecations: Set<string> = new Set();
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
      futureDeprecations.add(id);
    }
  }

  // These tests assume that the JS API being tested is backed by Dart Sass.
  // If there's a JS API implementation in the future with a different compiler,
  // then these tests shouldn't be run.
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

  for (const id of futureDeprecations) {
    it(`${id} is a future deprecation`, () => {
      const deprecation = deprecationsMap[id];
      expect(deprecation?.id).toBe(id);
      expect(deprecation?.status).toBe('future');
    });
  }
});
