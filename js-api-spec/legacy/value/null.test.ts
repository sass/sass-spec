// Copyright 2022 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import * as sass from 'sass';

import {skipForImpl} from '../../utils';
import {parseValue} from './utils';

skipForImpl('sass-embedded', () => {
  it('from a parameter equals NULL', () =>
    expect(parseValue('null', sass.types.Null)).toBe(sass.types.Null.NULL));

  it('the constructor throws', () =>
    expect(() => new sass.types.Null()).toThrow());

  it('the convenience accessor sass.NULL exists', () =>
    expect(sass.NULL).toBe(sass.types.Null.NULL));
});
