// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {Value, sassTrue, sassFalse} from 'sass';
import {expectEqualWithHashCode, skipForImpl} from '../utils';

skipForImpl('dart-sass', () => {
  describe('Sass boolean', () => {
    describe('sassTrue', () => {
      const value: Value = sassTrue;

      it('is truthy', () => {
        expect(value.isTruthy).toBe(true);
      });

      it('is sassTrue', () => {
        expectEqualWithHashCode(value, sassTrue);
      });

      it('is a value', () => {
        expect(value).toBeInstanceOf(Value);
      });

      it('is a boolean', () => {
        expect(value.assertBoolean()).toBe(sassTrue);
      });

      it("isn't any other type", () => {
        expect(value.assertColor).toThrow();
        expect(value.assertFunction).toThrow();
        expect(value.assertMap).toThrow();
        expect(value.tryMap()).toBe(null);
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
        expectEqualWithHashCode(value, sassFalse);
      });

      it('is a value', () => {
        expect(value).toBeInstanceOf(Value);
      });

      it('is a boolean', () => {
        expect(value.assertBoolean()).toBe(sassFalse);
      });

      it("isn't any other type", () => {
        expect(value.assertColor).toThrow();
        expect(value.assertFunction).toThrow();
        expect(value.assertMap).toThrow();
        expect(value.tryMap()).toBe(null);
        expect(value.assertNumber).toThrow();
        expect(value.assertString).toThrow();
      });
    });
  });
});
