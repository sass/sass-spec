// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {
  Value,
  SassCalculation,
  SassNumber,
  SassString,
  CalculationOperation,
  CalculationOperator,
  CalculationInterpolation,
  compileString,
  sassTrue,
  sassFalse,
} from 'sass';
import {List} from 'immutable';

import '../utils';

const validCalculationValues = [
  new SassNumber(1),
  new SassString('1', {quotes: false}),
  SassCalculation.calc(new SassNumber(1)),
  new CalculationOperation('+', new SassNumber(1), new SassNumber(1)),
  new CalculationInterpolation(''),
];
const invalidCalculationValues = [new SassString('1', {quotes: true})];

describe('SassCalculation', () => {
  describe('construction', () => {
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
      expect(() => calculation.assertColor()).toThrow();
      expect(() => calculation.assertFunction()).toThrow();
      expect(() => calculation.assertMap()).toThrow();
      expect(calculation.tryMap()).toBe(null);
      expect(() => calculation.assertNumber()).toThrow();
      expect(() => calculation.assertString()).toThrow();
    });
  });

  describe('calc', () => {
    it('correctly stores name and arguments', () => {
      const result = SassCalculation.calc(new SassNumber(1));
      expect(result.name).toBe('calc');
      expect(result.arguments).toEqualWithHash(List([new SassNumber(1)]));
    });

    it('rejects invalid arguments', () => {
      for (const value of invalidCalculationValues) {
        expect(() => SassCalculation.calc(value)).toThrow();
      }
    });

    it('accepts valid arguments', () => {
      for (const value of validCalculationValues) {
        expect(() => SassCalculation.calc(value)).not.toThrow();
      }
    });
  });

  describe('min', () => {
    it('correctly stores name and arguments', () => {
      const result = SassCalculation.min([
        new SassNumber(1),
        new SassNumber(2),
      ]);
      expect(result.name).toBe('min');
      expect(result.arguments).toEqualWithHash(
        List([new SassNumber(1), new SassNumber(2)])
      );
    });

    it('rejects invalid arguments', () => {
      for (const value of invalidCalculationValues) {
        expect(() => SassCalculation.min([value, new SassNumber(2)])).toThrow();
        expect(() => SassCalculation.min([new SassNumber(1), value])).toThrow();
      }
    });

    it('accepts valid arguments', () => {
      for (const value of validCalculationValues) {
        expect(() =>
          SassCalculation.min([value, new SassNumber(2)])
        ).not.toThrow();
        expect(() =>
          SassCalculation.min([new SassNumber(1), value])
        ).not.toThrow();
      }
    });
  });

  describe('max', () => {
    it('correctly stores name and arguments', () => {
      const result = SassCalculation.max([
        new SassNumber(1),
        new SassNumber(2),
      ]);
      expect(result.name).toBe('max');
      expect(result.arguments).toEqualWithHash(
        List([new SassNumber(1), new SassNumber(2)])
      );
    });

    it('rejects invalid arguments', () => {
      for (const value of invalidCalculationValues) {
        expect(() => SassCalculation.max([value, new SassNumber(2)])).toThrow();
        expect(() => SassCalculation.max([new SassNumber(1), value])).toThrow();
      }
    });

    it('accepts valid arguments', () => {
      for (const value of validCalculationValues) {
        expect(() =>
          SassCalculation.max([value, new SassNumber(2)])
        ).not.toThrow();
        expect(() =>
          SassCalculation.max([new SassNumber(1), value])
        ).not.toThrow();
      }
    });
  });

  describe('clamp', () => {
    it('correctly stores name and arguments', () => {
      const result = SassCalculation.clamp(
        new SassNumber(1),
        new SassNumber(2),
        new SassNumber(3)
      );
      expect(result.name).toBe('clamp');
      expect(result.arguments).toEqualWithHash(
        List([new SassNumber(1), new SassNumber(2), new SassNumber(3)])
      );
    });

    it('rejects invalid arguments', () => {
      for (const value of invalidCalculationValues) {
        expect(() =>
          SassCalculation.clamp(value, new SassNumber(2), new SassNumber(3))
        ).toThrow();
        expect(() =>
          SassCalculation.clamp(new SassNumber(1), value, new SassNumber(3))
        ).toThrow();
        expect(() =>
          SassCalculation.clamp(new SassNumber(1), new SassNumber(2), value)
        ).toThrow();
      }
    });

    it('accepts valid arguments', () => {
      for (const value of validCalculationValues) {
        expect(() =>
          SassCalculation.clamp(value, new SassNumber(2), new SassNumber(3))
        ).not.toThrow();
        expect(() =>
          SassCalculation.clamp(new SassNumber(1), value, new SassNumber(3))
        ).not.toThrow();
        expect(() =>
          SassCalculation.clamp(new SassNumber(1), new SassNumber(2), value)
        ).not.toThrow();
      }
    });

    /* When `clamp()` is called with less than three arguments, the list of
       accepted values is much narrower */
    const validClampValues = [
      new SassString('1', {quotes: false}),
      new CalculationInterpolation('1'),
    ];
    const invalidClampValues = [
      new SassNumber(1),
      new SassString('1', {quotes: true}),
    ];

    it('rejects invalid values for one argument', () => {
      for (const value of invalidClampValues) {
        expect(() => SassCalculation.clamp(value)).toThrow();
      }
    });

    it('accepts valid values for one argument', () => {
      for (const value of validClampValues) {
        expect(() => SassCalculation.clamp(value)).not.toThrow();
      }
    });

    it('rejects invalid values for two arguments', () => {
      for (const value of invalidClampValues) {
        expect(() => SassCalculation.clamp(value, value)).toThrow();
      }
    });

    it('accepts valid values for two arguments', () => {
      for (const value of validClampValues) {
        expect(() => SassCalculation.clamp(value, value)).not.toThrow();
      }
    });
  });

  describe('simplifies', () => {
    it('calc()', () => {
      const fn = () =>
        SassCalculation.calc(
          new CalculationOperation('+', new SassNumber(1), new SassNumber(2))
        );

      expect(
        compileString('a {b: foo()}', {
          functions: {'foo()': fn},
        }).css
      ).toBe('a {\n  b: 3;\n}');
    });

    it('clamp()', () => {
      const fn = () =>
        SassCalculation.clamp(
          new SassNumber(1),
          new SassNumber(2),
          new SassNumber(3)
        );

      expect(
        compileString('a {b: foo()}', {
          functions: {'foo()': fn},
        }).css
      ).toBe('a {\n  b: 2;\n}');
    });

    it('min()', () => {
      const fn = () =>
        SassCalculation.min([new SassNumber(1), new SassNumber(2)]);

      expect(
        compileString('a {b: foo()}', {
          functions: {'foo()': fn},
        }).css
      ).toBe('a {\n  b: 1;\n}');
    });

    it('max()', () => {
      const fn = () =>
        SassCalculation.max([new SassNumber(1), new SassNumber(2)]);

      expect(
        compileString('a {b: foo()}', {
          functions: {'foo()': fn},
        }).css
      ).toBe('a {\n  b: 2;\n}');
    });

    it('operations', () => {
      const fn = () =>
        SassCalculation.calc(
          new CalculationOperation(
            '+',
            SassCalculation.min([new SassNumber(3), new SassNumber(4)]),
            new CalculationOperation(
              '*',
              SassCalculation.max([new SassNumber(5), new SassNumber(6)]),
              new CalculationOperation(
                '-',
                new SassNumber(3),
                new CalculationOperation(
                  '/',
                  new SassNumber(4),
                  new SassNumber(5)
                )
              )
            )
          )
        );

      expect(
        compileString('a {b: foo()}', {
          functions: {'foo()': fn},
        }).css
      ).toBe('a {\n  b: 16.2;\n}');
    });
  });

  const primitiveValues: [any, string][] = [
    [new SassString('quoted', {quotes: true}), '"quoted"'],
    [new SassString('unquoted', {quotes: false}), 'unquoted'],
    [new SassNumber(1), '1'],
    [sassTrue, 'true'],
    [sassFalse, 'false'],
  ];
  describe('does not simplify', () => {
    for (const [value, output] of primitiveValues) {
      it(value.toString(), () => {
        expect(
          compileString('a {b: foo()}', {
            functions: {'foo()': () => value},
          }).css
        ).toBe(`a {\n  b: ${output};\n}`);
      });
    }
  });

  describe('throws when simplifying', () => {
    it('calc() with more than one argument', () => {
      const fn = () =>
        // @ts-expect-error: Call `calc` with the wrong number of arguments
        SassCalculation.calc(new SassNumber(1), new SassNumber(2));
      expect(() =>
        compileString('a {b: foo()}', {
          functions: {'foo()': fn},
        })
      ).toThrow();
    });

    it('clamp() with the wrong number of arguments', () => {
      const fn = () => SassCalculation.clamp(new SassNumber(1));
      expect(() =>
        compileString('a {b: foo()}', {
          functions: {'foo()': fn},
        })
      ).toThrow();
    });

    it('an unknown calculation function', () => {
      // @ts-expect-error: Use of private constructor
      const fn = () => new SassCalculation('foo', []);
      expect(() =>
        compileString('a {b: foo()}', {
          functions: {'foo()': fn},
        })
      ).toThrow();
    });
  });
});

describe('CalculationOperation', () => {
  const validOperators = ['+', '-', '*', '/'];
  const invalidOperators = ['||', '&&', 'plus', 'minus', ''];

  describe('construction', () => {
    it('rejects invalid operators', () => {
      for (const operator of invalidOperators) {
        expect(
          () =>
            new CalculationOperation(
              operator as CalculationOperator,
              new SassNumber(1),
              new SassNumber(2)
            )
        ).toThrow();
      }
    });

    it('accepts valid operators', () => {
      for (const operator of validOperators) {
        expect(
          () =>
            new CalculationOperation(
              operator as CalculationOperator,
              new SassNumber(1),
              new SassNumber(2)
            )
        ).not.toThrow();
      }
    });

    it('rejects invalid operands', () => {
      for (const operand of invalidCalculationValues) {
        expect(
          () => new CalculationOperation('+', operand, new SassNumber(1))
        ).toThrow();
        expect(
          () => new CalculationOperation('+', new SassNumber(1), operand)
        ).toThrow();
      }
    });

    it('accepts valid operands', () => {
      for (const operand of validCalculationValues) {
        expect(
          () => new CalculationOperation('+', operand, new SassNumber(1))
        ).not.toThrow();
        expect(
          () => new CalculationOperation('+', new SassNumber(1), operand)
        ).not.toThrow();
      }
    });
  });

  describe('stores', () => {
    let operation: CalculationOperation;
    beforeEach(() => {
      operation = new CalculationOperation(
        '+',
        new SassNumber(1),
        new SassNumber(2)
      );
    });

    it('operator', () => {
      expect(operation.operator).toBe('+');
    });

    it('left', () => {
      expect(operation.left).toEqual(new SassNumber(1));
    });

    it('right', () => {
      expect(operation.right).toEqual(new SassNumber(2));
    });
  });
});

describe('CalculationInterpolation', () => {
  it('stores value', () => {
    expect(new CalculationInterpolation('1').value).toEqual('1');
  });
});
