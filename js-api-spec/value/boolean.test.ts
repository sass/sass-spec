// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {Value, sassTrue, sassFalse, SassBoolean} from 'sass';

describe('Sass boolean', () => {
  describe('sassTrue', () => {
    const value: Value = sassTrue;

    it('is truthy', () => {
      expect(value.isTruthy).toBe(true);
    });

    it('is sassTrue', () => {
      expect(value).toEqualWithHash(sassTrue);
    });

    it('is a value', () => {
      expect(value).toBeInstanceOf(Value);
    });

    it('is a boolean', () => {
      expect(value.assertBoolean()).toBe(sassTrue);
    });

    it('is a SassBoolean instance', () => {
      expect(value).toBeInstanceOf(SassBoolean);
    });

    it("isn't any other type", () => {
      expect(value.assertCalculation).toThrow();
      expect(value.assertColor).toThrow();
      expect(value.assertFunction).toThrow();
      expect(value.assertMap).toThrow();
      expect(value.tryMap()).toBe(null);
      expect(value.assertMixin).toThrow();
      expect(value.assertNumber).toThrow();
      expect(value.assertString).toThrow();
    });
  });

  describe('sassFalse', () => {
    const value: Value = sassFalse;

    it('is falsey', () => {
      expect(value.isTruthy).toBe(false);
    });

    it('is sassFalse', () => {
      expect(value).toEqualWithHash(sassFalse);
    });

    it('is a value', () => {
      expect(value).toBeInstanceOf(Value);
    });

    it('is a boolean', () => {
      expect(value.assertBoolean()).toBe(sassFalse);
    });

    it('is a SassBoolean instance', () => {
      expect(value).toBeInstanceOf(SassBoolean);
    });

    it("isn't any other type", () => {
      expect(value.assertCalculation).toThrow();
      expect(value.assertColor).toThrow();
      expect(value.assertFunction).toThrow();
      expect(value.assertMap).toThrow();
      expect(value.tryMap()).toBe(null);
      expect(value.assertMixin).toThrow();
      expect(value.assertNumber).toThrow();
      expect(value.assertString).toThrow();
    });
  });
});
