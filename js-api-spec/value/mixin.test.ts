// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {SassMixin, compileString} from 'sass';

import {spy} from '../utils';

it('can round-trip a mixin reference from Sass', () => {
  const fn = spy(args => {
    expect(args).toBeArrayOfSize(1);
    expect(args[0]).toBeInstanceOf(SassMixin);
    args[0].assertMixin();
    return args[0];
  });

  expect(
    compileString(
      `
      @use 'sass:meta';

      @mixin a() {
        a {
          b: c;
        }
      }

      @include meta.apply(foo(meta.get-mixin('a')));
    `,
      {
        functions: {'foo($arg)': fn},
      }
    ).css
  ).toBe('a {\n  b: c;\n}');

  expect(fn).toHaveBeenCalled();
});
