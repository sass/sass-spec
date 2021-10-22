// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {Value, SassColor} from 'sass';

import {skipForImpl} from '../utils';

skipForImpl('dart-sass', () => {
  describe('SassColor', () => {
    describe('construction', () => {
      describe('type', () => {
        let color: SassColor;
        beforeEach(() => {
          color = SassColor.rgb(18, 52, 86);
        });

        it('is a value', () => {
          expect(color).toBeInstanceOf(Value);
        });

        it('is a color', () => {
          expect(color).toBeInstanceOf(SassColor);
          expect(color.assertColor()).toBe(color);
        });

        it("isn't any other type", () => {
          expect(() => color.assertBoolean()).toThrow();
          expect(() => color.assertFunction()).toThrow();
          expect(() => color.assertMap()).toThrow();
          expect(color.tryMap()).toBe(null);
          expect(() => color.assertNumber()).toThrow();
          expect(() => color.assertString()).toThrow();
        });
      });

      describe('rgb()', () => {
        it('allows valid values', () => {
          expect(() => SassColor.rgb(0, 0, 0, 0)).not.toThrow();
          expect(() => SassColor.rgb(255, 255, 255, 1)).not.toThrow();
        });

        it('disallows invalid values', () => {
          expect(() => SassColor.rgb(-1, 0, 0, 0)).toThrow();
          expect(() => SassColor.rgb(0, -1, 0, 0)).toThrow();
          expect(() => SassColor.rgb(0, 0, -1, 0)).toThrow();
          expect(() => SassColor.rgb(0, 0, 0, -0.1)).toThrow();
          expect(() => SassColor.rgb(256, 0, 0, 0)).toThrow();
          expect(() => SassColor.rgb(0, 256, 0, 0)).toThrow();
          expect(() => SassColor.rgb(0, 0, 256, 0)).toThrow();
          expect(() => SassColor.rgb(0, 0, 0, 1.1)).toThrow();
        });
      });

      describe('hsl()', () => {
        it('allows valid values', () => {
          expect(() => SassColor.hsl(0, 0, 0, 0)).not.toThrow();
          expect(() => SassColor.hsl(4320, 100, 100, 1)).not.toThrow();
        });

        it('disallows invalid values', () => {
          expect(() => SassColor.hsl(0, -0.1, 0, 0)).toThrow();
          expect(() => SassColor.hsl(0, 0, -0.1, 0)).toThrow();
          expect(() => SassColor.hsl(0, 0, 0, -0.1)).toThrow();
          expect(() => SassColor.hsl(0, 100.1, 0, 0)).toThrow();
          expect(() => SassColor.hsl(0, 0, 100.1, 0)).toThrow();
          expect(() => SassColor.hsl(0, 0, 0, 1.1)).toThrow();
        });
      });

      describe('hwb()', () => {
        it('allows valid values', () => {
          expect(() => SassColor.hwb(0, 0, 0, 0)).not.toThrow();
          expect(() => SassColor.hwb(4320, 100, 100, 1)).not.toThrow();
        });

        it('disallows invalid values', () => {
          expect(() => SassColor.hwb(0, -0.1, 0, 0)).toThrow();
          expect(() => SassColor.hwb(0, 0, -0.1, 0)).toThrow();
          expect(() => SassColor.hwb(0, 0, 0, -0.1)).toThrow();
          expect(() => SassColor.hwb(0, 100.1, 0, 0)).toThrow();
          expect(() => SassColor.hwb(0, 0, 100.1, 0)).toThrow();
          expect(() => SassColor.hwb(0, 0, 0, 1.1)).toThrow();
        });
      });
    });

    describe('an RGB color', () => {
      let color: SassColor;
      beforeEach(() => {
        color = SassColor.rgb(18, 52, 86);
      });

      it('has RGB channels', () => {
        expect(color.red).toBe(18);
        expect(color.green).toBe(52);
        expect(color.blue).toBe(86);
      });

      it('has HSL channels', () => {
        expect(color.hue).toBe(210);
        expect(color.saturation).toBe(65.3846153846154);
        expect(color.lightness).toBe(20.392156862745097);
      });

      it('has HWB channels', () => {
        expect(color.hue).toBe(210);
        expect(color.whiteness).toBe(7.0588235294117645);
        expect(color.blackness).toBe(66.27450980392157);
      });

      it('has an alpha channel', () => {
        expect(color.alpha).toBe(1);
      });

      it('equals the same color', () => {
        expect(color).toEqualWithHash(SassColor.rgb(18, 52, 86));
        expect(color).toEqualWithHash(
          SassColor.hsl(210, 65.3846153846154, 20.392156862745097)
        );
        expect(color).toEqualWithHash(
          SassColor.hwb(210, 7.0588235294117645, 66.27450980392157)
        );
      });
    });

    describe('an HSL color', () => {
      let color: SassColor;
      beforeEach(() => {
        color = SassColor.hsl(120, 42, 42);
      });

      it('has RGB channels', () => {
        expect(color.red).toBe(62);
        expect(color.green).toBe(152);
        expect(color.blue).toBe(62);
      });

      it('has HSL channels', () => {
        expect(color.hue).toBe(120);
        expect(color.saturation).toBe(42);
        expect(color.lightness).toBe(42);
      });

      it('has HWB channels', () => {
        expect(color.hue).toBe(120);
        expect(color.whiteness).toBe(24.313725490196077);
        expect(color.blackness).toBe(40.3921568627451);
      });

      it('has an alpha channel', () => {
        expect(color.alpha).toBe(1);
      });

      it('equals the same color', () => {
        expect(color).toEqualWithHash(SassColor.rgb(62, 152, 62));
        expect(color).toEqualWithHash(SassColor.hsl(120, 42, 42));
        expect(color).toEqualWithHash(
          SassColor.hwb(120, 24.313725490196077, 40.3921568627451)
        );
      });
    });

    describe('an HWB color', () => {
      let color: SassColor;
      beforeEach(() => {
        color = SassColor.hwb(120, 42, 42);
      });

      it('has RGB channels', () => {
        expect(color.red).toBe(107);
        expect(color.green).toBe(148);
        expect(color.blue).toBe(107);
      });

      it('has HSL channels', () => {
        expect(color.hue).toBe(120);
        expect(color.saturation).toBe(16.078431372549026);
        expect(color.lightness).toBe(50);
      });

      it('has HWB channels', () => {
        expect(color.hue).toBe(120);
        expect(color.whiteness).toBe(41.96078431372549);
        expect(color.blackness).toBe(41.96078431372548);
      });

      it('has an alpha channel', () => {
        expect(color.alpha).toBe(1);
      });

      it('equals the same color', () => {
        expect(color).toEqualWithHash(SassColor.rgb(107, 148, 107));
        expect(color).toEqualWithHash(
          SassColor.hsl(120, 16.078431372549026, 50)
        );
        expect(color).toEqualWithHash(
          SassColor.hwb(120, 41.96078431372549, 41.96078431372548)
        );
      });
    });

    describe('changing color values', () => {
      let color: SassColor;
      beforeEach(() => {
        color = SassColor.rgb(18, 52, 86);
      });

      describe('changeRgb()', () => {
        it('changes RGB values', () => {
          expect(color.changeRgb({red: 0})).toEqualWithHash(
            SassColor.rgb(0, 52, 86)
          );
          expect(color.changeRgb({green: 0})).toEqualWithHash(
            SassColor.rgb(18, 0, 86)
          );
          expect(color.changeRgb({blue: 0})).toEqualWithHash(
            SassColor.rgb(18, 52, 0)
          );
          expect(color.changeRgb({alpha: 0.5})).toEqualWithHash(
            SassColor.rgb(18, 52, 86, 0.5)
          );
          expect(
            color.changeRgb({red: 0, green: 0, blue: 0, alpha: 0.5})
          ).toEqualWithHash(SassColor.rgb(0, 0, 0, 0.5));
        });

        it('allows valid values', () => {
          expect(color.changeRgb({red: 0}).red).toBe(0);
          expect(color.changeRgb({red: 255}).red).toBe(255);
          expect(color.changeRgb({green: 0}).green).toBe(0);
          expect(color.changeRgb({green: 255}).green).toBe(255);
          expect(color.changeRgb({blue: 0}).blue).toBe(0);
          expect(color.changeRgb({blue: 255}).blue).toBe(255);
          expect(color.changeRgb({alpha: 0}).alpha).toBe(0);
          expect(color.changeRgb({alpha: 1}).alpha).toBe(1);
        });

        it('disallows invalid values', () => {
          expect(() => color.changeRgb({red: -1})).toThrow();
          expect(() => color.changeRgb({red: 256})).toThrow();
          expect(() => color.changeRgb({green: -1})).toThrow();
          expect(() => color.changeRgb({green: 256})).toThrow();
          expect(() => color.changeRgb({blue: -1})).toThrow();
          expect(() => color.changeRgb({blue: 256})).toThrow();
          expect(() => color.changeRgb({alpha: -0.1})).toThrow();
          expect(() => color.changeRgb({alpha: 1.1})).toThrow();
        });
      });

      describe('changeHsl()', () => {
        it('changes HSL values', () => {
          expect(color.changeHsl({hue: 120})).toEqualWithHash(
            SassColor.hsl(120, 65.3846153846154, 20.392156862745097)
          );
          expect(color.changeHsl({saturation: 42})).toEqualWithHash(
            SassColor.hsl(210, 42, 20.392156862745097)
          );
          expect(color.changeHsl({lightness: 42})).toEqualWithHash(
            SassColor.hsl(210, 65.3846153846154, 42)
          );
          expect(color.changeHsl({alpha: 0.5})).toEqualWithHash(
            SassColor.hsl(210, 65.3846153846154, 20.392156862745097, 0.5)
          );
          expect(
            color.changeHsl({
              hue: 120,
              saturation: 42,
              lightness: 42,
              alpha: 0.5,
            })
          ).toEqualWithHash(SassColor.hsl(120, 42, 42, 0.5));
        });

        it('allows valid values', () => {
          expect(color.changeHsl({saturation: 0}).saturation).toBe(0);
          expect(color.changeHsl({saturation: 100}).saturation).toBe(100);
          expect(color.changeHsl({lightness: 0}).lightness).toBe(0);
          expect(color.changeHsl({lightness: 100}).lightness).toBe(100);
          expect(color.changeHsl({alpha: 0}).alpha).toBe(0);
          expect(color.changeHsl({alpha: 1}).alpha).toBe(1);
        });

        it('disallows invalid values', () => {
          expect(() => color.changeHsl({saturation: -0.1})).toThrow();
          expect(() => color.changeHsl({saturation: 100.1})).toThrow();
          expect(() => color.changeHsl({lightness: -0.1})).toThrow();
          expect(() => color.changeHsl({lightness: 100.1})).toThrow();
          expect(() => color.changeHsl({alpha: -0.1})).toThrow();
          expect(() => color.changeHsl({alpha: 1.1})).toThrow();
        });
      });

      describe('changeHwb()', () => {
        it('changes HWB values', () => {
          expect(color.changeHwb({hue: 120})).toEqualWithHash(
            SassColor.hwb(120, 7.0588235294117645, 66.27450980392157)
          );
          expect(color.changeHwb({whiteness: 42})).toEqualWithHash(
            SassColor.hwb(210, 42, 66.27450980392157)
          );
          expect(color.changeHwb({whiteness: 50})).toEqualWithHash(
            SassColor.hwb(210, 50, 66.27450980392157)
          );
          expect(color.changeHwb({blackness: 42})).toEqualWithHash(
            SassColor.hwb(210, 7.0588235294117645, 42)
          );
          expect(color.changeHwb({alpha: 0.5})).toEqualWithHash(
            SassColor.hwb(210, 7.0588235294117645, 66.27450980392157, 0.5)
          );
          expect(
            color.changeHwb({
              hue: 120,
              whiteness: 42,
              blackness: 42,
              alpha: 0.5,
            })
          ).toEqualWithHash(SassColor.hwb(120, 42, 42, 0.5));
        });

        it('allows valid values', () => {
          expect(color.changeHwb({whiteness: 0}).whiteness).toBe(0);
          expect(color.changeHwb({whiteness: 100}).whiteness).toBe(60.0);
          expect(color.changeHwb({blackness: 0}).blackness).toBe(0);
          expect(color.changeHwb({blackness: 100}).blackness).toBe(
            93.33333333333333
          );
          expect(color.changeHwb({alpha: 0}).alpha).toBe(0);
          expect(color.changeHwb({alpha: 1}).alpha).toBe(1);
        });

        it('disallows invalid values', () => {
          expect(() => color.changeHwb({whiteness: -0.1})).toThrow();
          expect(() => color.changeHwb({whiteness: 100.1})).toThrow();
          expect(() => color.changeHwb({blackness: -0.1})).toThrow();
          expect(() => color.changeHwb({blackness: 100.1})).toThrow();
          expect(() => color.changeHwb({alpha: -0.1})).toThrow();
          expect(() => color.changeHwb({alpha: 1.1})).toThrow();
        });
      });

      describe('changeAlpha()', () => {
        it('changes the alpha value', () => {
          expect(color.changeAlpha(0.5)).toEqualWithHash(
            SassColor.rgb(18, 52, 86, 0.5)
          );
        });

        it('allows valid alphas', () => {
          expect(color.changeAlpha(0).alpha).toBe(0);
          expect(color.changeAlpha(1).alpha).toBe(1);
        });

        it('rejects invalid alphas', () => {
          expect(() => color.changeAlpha(-0.1)).toThrow();
          expect(() => color.changeAlpha(1.1)).toThrow();
        });
      });
    });
  });
});
