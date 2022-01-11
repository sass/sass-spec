// Copyright 2022 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import * as sass from 'sass';

import {skipForImpl} from '../../utils';
import {parseValue} from './utils';

skipForImpl('sass-embedded', () => {
  describe('from a parameter', () => {
    it('true is true', () =>
      expect(parseValue('true', sass.types.Boolean).getValue()).toBeTrue());

    it('false is false', () =>
      expect(parseValue('false', sass.types.Boolean).getValue()).toBeFalse());
  });

  describe('from a constant', () => {
    it('true is true', () => {
      const value = sass.types.Boolean.TRUE;
      expect(value).toBeInstanceOf(sass.types.Boolean);
      expect(value.getValue()).toBeTrue();
    });

    it('false is false', () => {
      const value = sass.types.Boolean.FALSE;
      expect(value).toBeInstanceOf(sass.types.Boolean);
      expect(value.getValue()).toBeFalse();
    });
  });

  describe('the constructor throws', () => {
    it('with a parameter', () =>
      expect(
        () => new (sass.types.Boolean as new (value: boolean) => unknown)(true)
      ).toThrow());

    it('with no parameters', () =>
      expect(() => new (sass.types.Boolean as new () => unknown)()).toThrow());
  });

  describe('the convenience accessor', () => {
    it('sass.TRUE exists', () =>
      expect(sass.TRUE).toBe(sass.types.Boolean.TRUE));

    it('sass.FALSE exists', () =>
      expect(sass.FALSE).toBe(sass.types.Boolean.FALSE));
  });
});
