// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {List} from 'immutable';

import {Value, SassNumber} from 'sass';
import '../utils';

const precision = 10;

describe('Sass number', () => {
  describe('unitless', () => {
    describe('integer', () => {
      let number: SassNumber;
      beforeEach(() => {
        number = new SassNumber(123);
      });

      describe('construction', () => {
        it('is a value', () => {
          expect(number).toBeInstanceOf(Value);
        });

        it('is a number', () => {
          expect(number).toBeInstanceOf(SassNumber);
          expect(() => number.assertNumber()).not.toThrow();
        });

        it('has no units', () => {
          expect(number.numeratorUnits.isEmpty()).toBe(true);
          expect(number.denominatorUnits.isEmpty()).toBe(true);
          expect(number.hasUnits).toBe(false);
          expect(number.hasUnit('px')).toBe(false);
          expect(() => number.assertNoUnits()).not.toThrow();
          expect(() => number.assertUnit('px')).toThrow();
        });

        it("isn't any other type", () => {
          expect(() => number.assertBoolean()).toThrow();
          expect(() => number.assertColor()).toThrow();
          expect(() => number.assertFunction()).toThrow();
          expect(() => number.assertMap()).toThrow();
          expect(number.tryMap()).toBe(null);
          expect(() => number.assertString()).toThrow();
        });
      });

      describe('value', () => {
        it('has the correct value', () => {
          expect(number.value).toBe(123);
        });

        it('is an int', () => {
          expect(number.isInt).toBe(true);
          expect(number.asInt).toBe(123);
          expect(number.assertInt()).toBe(123);
        });

        it('clamps within the given range', () => {
          expect(number.assertInRange(0, 123)).toBe(123);
          expect(number.assertInRange(123, 123)).toBe(123);
          expect(number.assertInRange(123, 1000)).toBe(123);
        });

        it('rejects a value outside the range', () => {
          expect(() => number.assertInRange(0, 122)).toThrow();
          expect(() => number.assertInRange(124, 1000)).toThrow();
        });
      });

      describe('equality', () => {
        it('equals the same number', () => {
          expect(number).toEqualWithHash(new SassNumber(123));
        });

        it('equals the same number within precision tolerance', () => {
          expect(number).toEqualWithHash(
            new SassNumber(123 + Math.pow(10, -precision - 2))
          );
          expect(number).toEqualWithHash(
            new SassNumber(123 - Math.pow(10, -precision - 2))
          );
        });

        it("doesn't equal a different number", () => {
          expect(number).not.toEqualWithHash(new SassNumber(122));
          expect(number).not.toEqualWithHash(new SassNumber(124));
          expect(number).not.toEqualWithHash(
            new SassNumber(123 + Math.pow(10, -precision - 1))
          );
          expect(number).not.toEqualWithHash(
            new SassNumber(123 - Math.pow(10, -precision - 1))
          );
        });

        it("doesn't equal a number with units", () => {
          expect(number).not.toEqualWithHash(new SassNumber(123, 'px'));
        });
      });

      it('is not compatible with a unit', () => {
        expect(number.compatibleWithUnit('px')).toBe(false);
        expect(number.compatibleWithUnit('abc')).toBe(false);
      });

      describe('convert', () => {
        it('can be converted to unitless', () => {
          expect(number.convert([], [])).toEqualWithHash(new SassNumber(123));
        });

        it('can be converted to match unitless', () => {
          expect(number.convertToMatch(new SassNumber(456))).toEqualWithHash(
            new SassNumber(123)
          );
        });

        it('cannot be converted to a unit', () => {
          expect(() => number.convert(['px'], [])).toThrow();
        });

        it('cannot be converted to match a unit', () => {
          expect(() =>
            number.convertToMatch(new SassNumber(456, 'px'))
          ).toThrow();
        });

        it('can convert its value to unitless', () => {
          expect(number.convertValue([], [])).toEqual(123);
        });

        it('can convert its value to match unitless', () => {
          expect(number.convertValueToMatch(new SassNumber(456))).toEqual(123);
        });

        it('cannot convert its value to a unit', () => {
          expect(() => number.convertValue(['px'], [])).toThrow();
        });

        it('cannot convert its value to match a unit', () => {
          expect(() =>
            number.convertValueToMatch(new SassNumber(456, 'px'))
          ).toThrow();
        });
      });

      describe('coerce', () => {
        it('can be coerced to unitless', () => {
          expect(number.coerce([], [])).toEqualWithHash(new SassNumber(123));
        });

        it('can be coerced to match unitless', () => {
          expect(number.coerceToMatch(new SassNumber(456))).toEqualWithHash(
            new SassNumber(123)
          );
        });

        it('can be coerced to a unit', () => {
          expect(number.coerce(['px'], [])).toEqualWithHash(
            new SassNumber(123, {
              numeratorUnits: ['px'],
            })
          );
        });

        it('can be coerced to match a unit', () => {
          expect(
            number.coerceToMatch(
              new SassNumber(456, {
                numeratorUnits: ['px'],
              })
            )
          ).toEqualWithHash(
            new SassNumber(123, {
              numeratorUnits: ['px'],
            })
          );
        });

        it('can coerce its value to unitless', () => {
          expect(number.coerceValue([], [])).toEqual(123);
        });

        it('can coerce its value to match unitless', () => {
          expect(number.coerceValueToMatch(new SassNumber(456))).toEqual(123);
        });

        it('can coerce its value to a unit', () => {
          expect(number.coerceValue(['px'], [])).toEqual(123);
        });

        it('can coerce its value to match a unit', () => {
          expect(
            number.coerceValueToMatch(
              new SassNumber(456, {
                numeratorUnits: ['px'],
              })
            )
          ).toEqual(123);
        });
      });
    });

    describe('fuzzy integer', () => {
      let number: SassNumber;
      beforeEach(() => {
        number = new SassNumber(123.000000000001);
      });

      it('has the correct value', () => {
        expect(number.value).toBe(123.000000000001);
      });

      it('is an int', () => {
        expect(number.isInt).toBe(true);
        expect(number.asInt).toBe(123);
        expect(number.assertInt()).toBe(123);
      });

      it('clamps within the given range', () => {
        expect(number.assertInRange(0, 123)).toBe(123);
        expect(number.assertInRange(123, 123)).toBe(123);
        expect(number.assertInRange(123, 1000)).toBe(123);
      });

      it('rejects a value outside the range', () => {
        expect(() => number.assertInRange(0, 122)).toThrow();
        expect(() => number.assertInRange(124, 1000)).toThrow();
      });

      it('equals the same number', () => {
        expect(number).toEqualWithHash(
          new SassNumber(123 + Math.pow(10, -precision - 2))
        );
      });

      it('equals the same number within precision tolerance', () => {
        expect(number).toEqualWithHash(new SassNumber(123));
        expect(number).toEqualWithHash(
          new SassNumber(123 - Math.pow(10, -precision - 2))
        );
      });
    });

    describe('double', () => {
      let number: SassNumber;
      beforeEach(() => {
        number = new SassNumber(123.456);
      });

      it('has the correct value', () => {
        expect(number.value).toBe(123.456);
      });

      it('is not an int', () => {
        expect(number.isInt).toBe(false);
        expect(number.asInt).toBe(null);
        expect(() => number.assertInt()).toThrow();
      });
    });
  });

  describe('single numerator unit', () => {
    let number: SassNumber;
    beforeEach(() => {
      number = new SassNumber(123, 'px');
    });

    describe('construction', () => {
      it('has that unit', () => {
        expect(number.numeratorUnits).toEqualWithHash(List(['px']));
        expect(number.hasUnits).toBe(true);
        expect(number.hasUnit('px')).toBe(true);
        expect(() => number.assertUnit('px')).not.toThrow();
        expect(() => number.assertNoUnits()).toThrow();
      });

      it('has no other units', () => {
        expect(number.denominatorUnits.isEmpty()).toBe(true);
        expect(number.hasUnit('in')).toBe(false);
        expect(() => number.assertUnit('in')).toThrow();
      });
    });

    describe('compatibility', () => {
      it('is compatible with the same unit', () => {
        expect(number.compatibleWithUnit('px')).toBe(true);
      });

      it('is compatible with a compatible unit', () => {
        expect(number.compatibleWithUnit('in')).toBe(true);
      });

      it('is incompatible with an incompatible unit', () => {
        expect(number.compatibleWithUnit('abc')).toBe(false);
      });
    });

    describe('convert', () => {
      it('cannot be converted to unitless', () => {
        expect(() => number.convert([], [])).toThrow();
      });

      it('cannot be converted to match unitless', () => {
        expect(() => number.convertToMatch(new SassNumber(456))).toThrow();
      });

      it('can be converted to compatible units', () => {
        expect(number.convert(['px'], [])).toEqualWithHash(number);
        expect(number.convert(['in'], [])).toEqualWithHash(
          new SassNumber(1.28125, 'in')
        );
      });

      it('can be converted to match compatible units', () => {
        expect(
          number.convertToMatch(new SassNumber(456, 'px'))
        ).toEqualWithHash(number);
        expect(
          number.convertToMatch(new SassNumber(456, 'in'))
        ).toEqualWithHash(new SassNumber(1.28125, 'in'));
      });

      it('cannot be converted to incompatible units', () => {
        expect(() => number.convert(['abc'], [])).toThrow();
      });

      it('cannot be converted to match incompatible units', () => {
        expect(() =>
          number.convertToMatch(new SassNumber(456, 'abc'))
        ).toThrow();
      });

      it('cannot convert its value to unitless', () => {
        expect(() => number.convertValue([], [])).toThrow();
      });

      it('cannot convert its value to match unitless', () => {
        expect(() => number.convertValueToMatch(new SassNumber(456))).toThrow();
      });

      it('can convert its value to compatible units', () => {
        expect(number.convertValue(['px'], [])).toBe(123);
        expect(number.convertValue(['in'], [])).toBe(1.28125);
      });

      it('can convert its value to match compatible units', () => {
        expect(number.convertValueToMatch(new SassNumber(456, 'px'))).toBe(123);
        expect(number.convertValueToMatch(new SassNumber(456, 'in'))).toBe(
          1.28125
        );
      });

      it('cannot convert its value to incompatible units', () => {
        expect(() => number.convertValue(['abc'], [])).toThrow();
      });

      it('cannot convert its value to match incompatible units', () => {
        expect(() =>
          number.convertValueToMatch(new SassNumber(456, 'abc'))
        ).toThrow();
      });
    });

    describe('coerce', () => {
      it('can be coerced to unitless', () => {
        expect(number.coerce([], [])).toEqualWithHash(new SassNumber(123));
      });

      it('can be coerced to match unitless', () => {
        expect(number.coerceToMatch(new SassNumber(456))).toEqualWithHash(
          new SassNumber(123)
        );
      });

      it('can be coerced to compatible units', () => {
        expect(number.coerce(['px'], [])).toEqualWithHash(number);
        expect(number.coerce(['in'], [])).toEqualWithHash(
          new SassNumber(1.28125, 'in')
        );
      });

      it('can be coerced to match compatible units', () => {
        expect(number.coerceToMatch(new SassNumber(456, 'px'))).toEqualWithHash(
          number
        );
        expect(number.coerceToMatch(new SassNumber(456, 'in'))).toEqualWithHash(
          new SassNumber(1.28125, 'in')
        );
      });

      it('cannot be coerced to incompatible units', () => {
        expect(() => number.coerce(['abc'], [])).toThrow();
      });

      it('cannot be coerced to match incompatible units', () => {
        expect(() =>
          number.coerceToMatch(new SassNumber(456, 'abc'))
        ).toThrow();
      });

      it('can coerce its value to unitless', () => {
        expect(number.coerceValue([], [])).toBe(123);
      });

      it('can coerce its value to match unitless', () => {
        expect(number.coerceValueToMatch(new SassNumber(456))).toBe(123);
      });

      it('can coerce its value to compatible units', () => {
        expect(number.coerceValue(['px'], [])).toBe(123);
        expect(number.coerceValue(['in'], [])).toBe(1.28125);
      });

      it('can coerce its value to match compatible units', () => {
        expect(number.coerceValueToMatch(new SassNumber(456, 'px'))).toBe(123);
        expect(number.coerceValueToMatch(new SassNumber(456, 'in'))).toBe(
          1.28125
        );
      });

      it('cannot coerce its value to incompatible units', () => {
        expect(() => number.coerceValue(['abc'], [])).toThrow();
      });

      it('cannot coerce its value to match incompatible units', () => {
        expect(() =>
          number.coerceValueToMatch(new SassNumber(456, 'abc'))
        ).toThrow();
      });
    });

    describe('equality', () => {
      it('equals the same number', () => {
        expect(number).toEqualWithHash(new SassNumber(123, 'px'));
      });

      it('equals an equivalent number', () => {
        expect(number).toEqualWithHash(new SassNumber(1.28125, 'in'));
      });

      it("doesn't equal a unitless number", () => {
        expect(number).not.toEqualWithHash(new SassNumber(123));
      });

      it("doesn't equal a number with different units", () => {
        expect(number).not.toEqualWithHash(new SassNumber(123, 'abc'));
        expect(number).not.toEqualWithHash(
          new SassNumber(123, {numeratorUnits: ['px', 'px']})
        );
        expect(number).not.toEqualWithHash(
          new SassNumber(123, {
            numeratorUnits: ['px'],
            denominatorUnits: ['abc'],
          })
        );
        expect(number).not.toEqualWithHash(
          new SassNumber(123, {denominatorUnits: ['px']})
        );
      });
    });
  });

  describe('numerator and denominator units', () => {
    let number: SassNumber;
    beforeEach(() => {
      number = new SassNumber(123, {
        numeratorUnits: ['px'],
        denominatorUnits: ['ms'],
      });
    });

    describe('construction', () => {
      it('has those units', () => {
        expect(number.hasUnits).toBe(true);
        expect(number.hasUnit('px')).toBe(false);
        expect(() => number.assertUnit('px')).toThrow();
        expect(() => number.assertNoUnits()).toThrow();
      });

      it('does not simplify incompatible units', () => {
        expect(number.numeratorUnits).toEqualWithHash(List(['px']));
        expect(number.denominatorUnits).toEqualWithHash(List(['ms']));
      });

      it('simplifies compatible units', () => {
        const number = new SassNumber(123, {
          numeratorUnits: ['px', 's'],
          denominatorUnits: ['ms'],
        });
        expect(number.value).toBe(123000);
        expect(number.numeratorUnits).toEqualWithHash(List(['px']));
        expect(number.denominatorUnits.isEmpty()).toBe(true);
      });

      it('does not simplify unknown units', () => {
        const number = new SassNumber(123, {
          numeratorUnits: ['abc'],
          denominatorUnits: ['def'],
        });
        expect(number.value).toBe(123);
        expect(number.numeratorUnits).toEqualWithHash(List(['abc']));
        expect(number.denominatorUnits).toEqualWithHash(List(['def']));
      });
    });

    describe('compatibility', () => {
      it('is incompatible with the numerator unit', () => {
        expect(number.compatibleWithUnit('px')).toBe(false);
      });

      it('is incompatible with the denominator unit', () => {
        expect(number.compatibleWithUnit('ms')).toBe(false);
      });
    });

    describe('convert', () => {
      it('cannot be converted to unitless', () => {
        expect(() => number.convert([], [])).toThrow();
      });

      it('cannot be converted to match unitless', () => {
        expect(() => number.convertToMatch(new SassNumber(456))).toThrow();
      });

      it('can be converted to compatible units', () => {
        expect(number.convert(['px'], ['ms'])).toEqualWithHash(number);
        expect(number.convert(['in'], ['s'])).toEqualWithHash(
          new SassNumber(1281.25, {
            numeratorUnits: ['in'],
            denominatorUnits: ['s'],
          })
        );
      });

      it('can be converted to match compatible units', () => {
        expect(
          number.convertToMatch(
            new SassNumber(456, {
              numeratorUnits: ['px'],
              denominatorUnits: ['ms'],
            })
          )
        ).toEqualWithHash(number);
        expect(
          number.convertToMatch(
            new SassNumber(456, {
              numeratorUnits: ['in'],
              denominatorUnits: ['s'],
            })
          )
        ).toEqualWithHash(
          new SassNumber(1281.25, {
            numeratorUnits: ['in'],
            denominatorUnits: ['s'],
          })
        );
      });

      it('cannot be converted to incompatible units', () => {
        expect(() => number.convert(['abc'], [])).toThrow();
      });

      it('cannot be converted to match incompatible units', () => {
        expect(() =>
          number.convertToMatch(new SassNumber(456, 'abc'))
        ).toThrow();
      });

      it('cannot convert its value to unitless', () => {
        expect(() => number.convertValue([], [])).toThrow();
      });

      it('cannot convert its value to match unitless', () => {
        expect(() => number.convertValueToMatch(new SassNumber(456))).toThrow();
      });

      it('can convert its value to compatible units', () => {
        expect(number.convertValue(['px'], ['ms'])).toBe(123);
        expect(number.convertValue(['in'], ['s'])).toBe(1281.25);
      });

      it('can convert its value to match compatible units', () => {
        expect(
          number.convertValueToMatch(
            new SassNumber(456, {
              numeratorUnits: ['px'],
              denominatorUnits: ['ms'],
            })
          )
        ).toBe(123);
        expect(
          number.convertValueToMatch(
            new SassNumber(456, {
              numeratorUnits: ['in'],
              denominatorUnits: ['s'],
            })
          )
        ).toBe(1281.25);
      });

      it('cannot convert its value to incompatible units', () => {
        expect(() => number.convertValue(['abc'], [])).toThrow();
      });

      it('cannot convert its value to match incompatible units', () => {
        expect(() =>
          number.convertValueToMatch(new SassNumber(456, 'abc'))
        ).toThrow();
      });
    });

    describe('coerce', () => {
      it('can be coerced to unitless', () => {
        expect(number.coerce([], [])).toEqualWithHash(new SassNumber(123));
      });

      it('can be coerced to match unitless', () => {
        expect(number.coerceToMatch(new SassNumber(456))).toEqualWithHash(
          new SassNumber(123)
        );
      });

      it('can be coerced to compatible units', () => {
        expect(number.coerce(['px'], ['ms'])).toEqualWithHash(number);
        expect(number.coerce(['in'], ['s'])).toEqualWithHash(
          new SassNumber(1281.25, {
            numeratorUnits: ['in'],
            denominatorUnits: ['s'],
          })
        );
      });

      it('can be coerced to match compatible units', () => {
        expect(
          number.coerceToMatch(
            new SassNumber(456, {
              numeratorUnits: ['px'],
              denominatorUnits: ['ms'],
            })
          )
        ).toEqualWithHash(number);
        expect(
          number.coerceToMatch(
            new SassNumber(456, {
              numeratorUnits: ['in'],
              denominatorUnits: ['s'],
            })
          )
        ).toEqualWithHash(
          new SassNumber(1281.25, {
            numeratorUnits: ['in'],
            denominatorUnits: ['s'],
          })
        );
      });

      it('cannot be coerced to incompatible units', () => {
        expect(() => number.coerce(['abc'], [])).toThrow();
      });

      it('cannot be coerced to match incompatible units', () => {
        expect(() =>
          number.coerceToMatch(
            new SassNumber(456, {
              numeratorUnits: ['abc'],
              denominatorUnits: [],
            })
          )
        ).toThrow();
      });

      it('can coerce its value to unitless', () => {
        expect(number.coerceValue([], [])).toBe(123);
      });

      it('can coerce its value to match unitless', () => {
        expect(
          number.coerceValueToMatch(
            new SassNumber(456, {
              numeratorUnits: [],
              denominatorUnits: [],
            })
          )
        ).toBe(123);
      });

      it('can coerce its value to compatible units', () => {
        expect(number.coerceValue(['px'], ['ms'])).toBe(123);
        expect(number.coerceValue(['in'], ['s'])).toBe(1281.25);
      });

      it('can coerce its value to match compatible units', () => {
        expect(
          number.coerceValueToMatch(
            new SassNumber(456, {
              numeratorUnits: ['px'],
              denominatorUnits: ['ms'],
            })
          )
        ).toBe(123);
        expect(
          number.coerceValueToMatch(
            new SassNumber(456, {
              numeratorUnits: ['in'],
              denominatorUnits: ['s'],
            })
          )
        ).toBe(1281.25);
      });

      it('cannot coerce its value to incompatible units', () => {
        expect(() => number.coerceValue(['abc'], [])).toThrow();
      });

      it('cannot coerce its value to match incompatible units', () => {
        expect(() =>
          number.coerceValueToMatch(
            new SassNumber(456, {
              numeratorUnits: ['abc'],
              denominatorUnits: [],
            })
          )
        ).toThrow();
      });
    });

    describe('equality', () => {
      it('equals the same number', () => {
        expect(number).toEqualWithHash(
          new SassNumber(123, {
            numeratorUnits: ['px'],
            denominatorUnits: ['ms'],
          })
        );
      });

      it('equals an equivalent number', () => {
        expect(number).toEqualWithHash(
          new SassNumber(1281.25, {
            numeratorUnits: ['in'],
            denominatorUnits: ['s'],
          })
        );
      });

      it("doesn't equal a unitless number", () => {
        expect(number).not.toEqualWithHash(new SassNumber(24.6));
      });

      it("doesn't equal a number with different units", () => {
        expect(number).not.toEqualWithHash(new SassNumber(123, 'px'));
        expect(number).not.toEqualWithHash(
          new SassNumber(123, {denominatorUnits: ['ms']})
        );
        expect(number).not.toEqualWithHash(
          new SassNumber(123, {
            numeratorUnits: ['ms'],
            denominatorUnits: ['px'],
          })
        );
        expect(number).not.toEqualWithHash(
          new SassNumber(123, {
            numeratorUnits: ['in'],
            denominatorUnits: ['s'],
          })
        );
      });
    });
  });

  // TODO: add explicit tests for conversions between all compatible unit types
});
