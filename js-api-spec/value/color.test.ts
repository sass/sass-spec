// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {SassColor} from 'sass';

import {expectEqualWithHashCode, skipForImpl} from '../utils';

skipForImpl('dart-sass', () => {
  describe('SassColor', () => {
    describe('construction', () => {
      describe('type', () => {
        const value = SassColor.rgb(18, 52, 86);

        it('is a color', () => {
          expect(value.assertColor()).toBe(value);
        });

        it("isn't any other type", () => {
          expect(() => value.assertBoolean()).toThrow();
          expect(() => value.assertFunction()).toThrow();
          expect(() => value.assertMap()).toThrow();
          expect(value.tryMap()).toBe(null);
          expect(() => value.assertNumber()).toThrow();
          expect(() => value.assertString()).toThrow();
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
      const value = SassColor.rgb(18, 52, 86);

      it('has RGB channels', () => {
        expect(value.red).toBe(18);
        expect(value.green).toBe(52);
        expect(value.blue).toBe(86);
      });

      it('has HSL channels', () => {
        expect(value.hue).toBe(210);
        expect(value.saturation).toBe(65.3846153846154);
        expect(value.lightness).toBe(20.392156862745097);
      });

      it('has HWB channels', () => {
        expect(value.hue).toBe(210);
        expect(value.whiteness).toBe(7.0588235294117645);
        expect(value.blackness).toBe(66.27450980392157);
      });

      it('has an alpha channel', () => {
        expect(value.alpha).toBe(1);
      });

      it('equals the same color', () => {
        expectEqualWithHashCode(value, SassColor.rgb(18, 52, 86));
        expectEqualWithHashCode(
          value,
          SassColor.hsl(210, 65.3846153846154, 20.392156862745097)
        );
        expectEqualWithHashCode(
          value,
          SassColor.hwb(210, 7.0588235294117645, 66.27450980392157)
        );
      });
    });

    describe('an HSL color', () => {
      const value = SassColor.hsl(120, 42, 42);

      it('has RGB channels', () => {
        expect(value.red).toBe(62);
        expect(value.green).toBe(152);
        expect(value.blue).toBe(62);
      });

      it('has HSL channels', () => {
        expect(value.hue).toBe(120);
        expect(value.saturation).toBe(42);
        expect(value.lightness).toBe(42);
      });

      it('has HWB channels', () => {
        expect(value.hue).toBe(120);
        expect(value.whiteness).toBe(24.313725490196077);
        expect(value.blackness).toBe(40.3921568627451);
      });

      it('has an alpha channel', () => {
        expect(value.alpha).toBe(1);
      });

      it('equals the same color', () => {
        expectEqualWithHashCode(value, SassColor.rgb(62, 152, 62));
        expectEqualWithHashCode(value, SassColor.hsl(120, 42, 42));
        expectEqualWithHashCode(
          value,
          SassColor.hwb(120, 24.313725490196077, 40.3921568627451)
        );
      });
    });

    describe('an HWB color', () => {
      const value = SassColor.hwb(120, 42, 42);

      it('has RGB channels', () => {
        expect(value.red).toBe(107);
        expect(value.green).toBe(148);
        expect(value.blue).toBe(107);
      });

      it('has HSL channels', () => {
        expect(value.hue).toBe(120);
        expect(value.saturation).toBe(16.078431372549026);
        expect(value.lightness).toBe(50);
      });

      it('has HWB channels', () => {
        expect(value.hue).toBe(120);
        expect(value.whiteness).toBe(41.96078431372549);
        expect(value.blackness).toBe(41.96078431372548);
      });

      it('has an alpha channel', () => {
        expect(value.alpha).toBe(1);
      });

      it('equals the same color', () => {
        expectEqualWithHashCode(value, SassColor.rgb(107, 148, 107));
        expectEqualWithHashCode(
          value,
          SassColor.hsl(120, 16.078431372549026, 50)
        );
        expectEqualWithHashCode(
          value,
          SassColor.hwb(120, 41.96078431372549, 41.96078431372548)
        );
      });
    });

    describe('changing color values', () => {
      const value = SassColor.rgb(18, 52, 86);

      describe('changeRgb()', () => {
        it('changes RGB values', () => {
          expect(
            value.changeRgb({red: 0}).equals(SassColor.rgb(0, 52, 86))
          ).toBe(true);
          expect(
            value.changeRgb({green: 0}).equals(SassColor.rgb(18, 0, 86))
          ).toBe(true);
          expect(
            value.changeRgb({blue: 0}).equals(SassColor.rgb(18, 52, 0))
          ).toBe(true);
          expect(
            value.changeRgb({alpha: 0.5}).equals(SassColor.rgb(18, 52, 86, 0.5))
          ).toBe(true);
          expect(
            value
              .changeRgb({red: 0, green: 0, blue: 0, alpha: 0.5})
              .equals(SassColor.rgb(0, 0, 0, 0.5))
          ).toBe(true);
        });

        it('allows valid values', () => {
          expect(value.changeRgb({red: 0}).red).toBe(0);
          expect(value.changeRgb({red: 255}).red).toBe(255);
          expect(value.changeRgb({green: 0}).green).toBe(0);
          expect(value.changeRgb({green: 255}).green).toBe(255);
          expect(value.changeRgb({blue: 0}).blue).toBe(0);
          expect(value.changeRgb({blue: 255}).blue).toBe(255);
          expect(value.changeRgb({alpha: 0}).alpha).toBe(0);
          expect(value.changeRgb({alpha: 1}).alpha).toBe(1);
        });

        it('disallows invalid values', () => {
          expect(() => value.changeRgb({red: -1})).toThrow();
          expect(() => value.changeRgb({red: 256})).toThrow();
          expect(() => value.changeRgb({green: -1})).toThrow();
          expect(() => value.changeRgb({green: 256})).toThrow();
          expect(() => value.changeRgb({blue: -1})).toThrow();
          expect(() => value.changeRgb({blue: 256})).toThrow();
          expect(() => value.changeRgb({alpha: -0.1})).toThrow();
          expect(() => value.changeRgb({alpha: 1.1})).toThrow();
        });
      });

      describe('changeHsl()', () => {
        it('changes HSL values', () => {
          expect(
            value
              .changeHsl({hue: 120})
              .equals(SassColor.hsl(120, 65.3846153846154, 20.392156862745097))
          ).toBe(true);
          expect(
            value
              .changeHsl({saturation: 42})
              .equals(SassColor.hsl(210, 42, 20.392156862745097))
          ).toBe(true);
          expect(
            value
              .changeHsl({lightness: 42})
              .equals(SassColor.hsl(210, 65.3846153846154, 42))
          ).toBe(true);
          expect(
            value
              .changeHsl({alpha: 0.5})
              .equals(
                SassColor.hsl(210, 65.3846153846154, 20.392156862745097, 0.5)
              )
          ).toBe(true);
          expect(
            value
              .changeHsl({
                hue: 120,
                saturation: 42,
                lightness: 42,
                alpha: 0.5,
              })
              .equals(SassColor.hsl(120, 42, 42, 0.5))
          ).toBe(true);
        });

        it('allows valid values', () => {
          expect(value.changeHsl({saturation: 0}).saturation).toBe(0);
          expect(value.changeHsl({saturation: 100}).saturation).toBe(100);
          expect(value.changeHsl({lightness: 0}).lightness).toBe(0);
          expect(value.changeHsl({lightness: 100}).lightness).toBe(100);
          expect(value.changeHsl({alpha: 0}).alpha).toBe(0);
          expect(value.changeHsl({alpha: 1}).alpha).toBe(1);
        });

        it('disallows invalid values', () => {
          expect(() => value.changeHsl({saturation: -0.1})).toThrow();
          expect(() => value.changeHsl({saturation: 100.1})).toThrow();
          expect(() => value.changeHsl({lightness: -0.1})).toThrow();
          expect(() => value.changeHsl({lightness: 100.1})).toThrow();
          expect(() => value.changeHsl({alpha: -0.1})).toThrow();
          expect(() => value.changeHsl({alpha: 1.1})).toThrow();
        });
      });

      describe('changeHwb()', () => {
        it('changes HWB values', () => {
          expect(
            value
              .changeHwb({hue: 120})
              .equals(SassColor.hwb(120, 7.0588235294117645, 66.27450980392157))
          ).toBe(true);
          expect(
            value
              .changeHwb({whiteness: 42})
              .equals(SassColor.hwb(210, 42, 66.27450980392157))
          ).toBe(true);
          expect(
            value
              .changeHwb({whiteness: 50})
              .equals(SassColor.hwb(210, 50, 66.27450980392157))
          ).toBe(true);
          expect(
            value
              .changeHwb({blackness: 42})
              .equals(SassColor.hwb(210, 7.0588235294117645, 42))
          ).toBe(true);
          expect(
            value
              .changeHwb({alpha: 0.5})
              .equals(
                SassColor.hwb(210, 7.0588235294117645, 66.27450980392157, 0.5)
              )
          ).toBe(true);
          expect(
            value
              .changeHwb({hue: 120, whiteness: 42, blackness: 42, alpha: 0.5})
              .equals(SassColor.hwb(120, 42, 42, 0.5))
          ).toBe(true);
        });

        it('allows valid values', () => {
          expect(value.changeHwb({whiteness: 0}).whiteness).toBe(0);
          expect(value.changeHwb({whiteness: 100}).whiteness).toBe(60.0);
          expect(value.changeHwb({blackness: 0}).blackness).toBe(0);
          expect(value.changeHwb({blackness: 100}).blackness).toBe(
            93.33333333333333
          );
          expect(value.changeHwb({alpha: 0}).alpha).toBe(0);
          expect(value.changeHwb({alpha: 1}).alpha).toBe(1);
        });

        it('disallows invalid values', () => {
          expect(() => value.changeHwb({whiteness: -0.1})).toThrow();
          expect(() => value.changeHwb({whiteness: 100.1})).toThrow();
          expect(() => value.changeHwb({blackness: -0.1})).toThrow();
          expect(() => value.changeHwb({blackness: 100.1})).toThrow();
          expect(() => value.changeHwb({alpha: -0.1})).toThrow();
          expect(() => value.changeHwb({alpha: 1.1})).toThrow();
        });
      });

      describe('changeAlpha()', () => {
        it('changes the alpha value', () => {
          expect(
            value.changeAlpha(0.5).equals(SassColor.rgb(18, 52, 86, 0.5))
          ).toBe(true);
        });

        it('allows valid alphas', () => {
          expect(value.changeAlpha(0).alpha).toBe(0);
          expect(value.changeAlpha(1).alpha).toBe(1);
        });

        it('rejects invalid alphas', () => {
          expect(() => value.changeAlpha(-0.1)).toThrow();
          expect(() => value.changeAlpha(1.1)).toThrow();
        });
      });
    });
  });
});
