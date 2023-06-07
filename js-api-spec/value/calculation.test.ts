// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {Value, SassCalculation, SassNumber} from 'sass';

import '../utils';

describe('SassCalculation', () => {
  describe('construction', () => {
    describe('calc', () => {
      let calculation: SassCalculation;
      beforeEach(() => {
        calculation = SassCalculation.calc(new SassNumber(1));
      });

      it('is a value', () => {
        expect(calculation).toBeInstanceOf(Value);
      });

      it('is a calculation', () => {
        expect(calculation).toBeInstanceOf(SassCalculation);
        expect(calculation.assertCalculation()).toBe(calculation);
      });

      it("isn't any other type", () => {
        expect(() => calculation.assertBoolean()).toThrow();
        expect(() => calculation.assertFunction()).toThrow();
        expect(() => calculation.assertMap()).toThrow();
        expect(calculation.tryMap()).toBe(null);
        expect(() => calculation.assertNumber()).toThrow();
        expect(() => calculation.assertString()).toThrow();
      });
    });
  });
});
