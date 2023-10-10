// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {Value, SassColor} from 'sass';

import {skipForImpl} from '../utils';

/** A utility function for creating an RGB color without specifying a space. */
function legacyRGB(
  red: number,
  green: number,
  blue: number,
  alpha?: number
): SassColor {
  return new SassColor({red, green, blue, alpha});
}

/** A utility function for creating an RGB color. */
function rgb(
  red: number,
  green: number,
  blue: number,
  alpha?: number
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'rgb'});
}

/** A utility function for creating an HSL color without specifying a space. */
function legacyHsl(
  hue: number,
  saturation: number,
  lightness: number,
  alpha?: number
): SassColor {
  return new SassColor({hue, saturation, lightness, alpha});
}

/** A utility function for creating an HSL color. */
function hsl(
  hue: number,
  saturation: number,
  lightness: number,
  alpha?: number
): SassColor {
  return new SassColor({hue, saturation, lightness, alpha, space: 'hsl'});
}

/** A utility function for creating an HWB color without specifying a space. */
function legacyHwb(
  hue: number,
  whiteness: number,
  blackness: number,
  alpha?: number
): SassColor {
  return new SassColor({hue, whiteness, blackness, alpha});
}

/** A utility function for creating an HWB color. */
function hwb(
  hue: number,
  whiteness: number,
  blackness: number,
  alpha?: number
): SassColor {
  return new SassColor({hue, whiteness, blackness, alpha, space: 'hwb'});
}

/** A utility function for creating a Lab color. */
function lab(
  lightness: number,
  a: number,
  b: number,
  alpha?: number
): SassColor {
  return new SassColor({lightness, a, b, alpha, space: 'lab'});
}
/** A utility function for creating a Oklab color. */
function oklab(
  lightness: number,
  a: number,
  b: number,
  alpha?: number
): SassColor {
  return new SassColor({lightness, a, b, alpha, space: 'oklab'});
}
/** A utility function for creating an LCH color. */
function lch(
  lightness: number,
  chroma: number,
  hue: number,
  alpha?: number
): SassColor {
  return new SassColor({lightness, chroma, hue, alpha, space: 'lch'});
}
/** A utility function for creating a Oklab color. */
function oklch(
  lightness: number,
  chroma: number,
  hue: number,
  alpha?: number
): SassColor {
  return new SassColor({lightness, chroma, hue, alpha, space: 'oklch'});
}

/** A utility function for creating an srgb color. */
function srgb(
  red: number,
  green: number,
  blue: number,
  alpha?: number
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'srgb'});
}
/** A utility function for creating an srgb-linear color. */
function srgbLinear(
  red: number,
  green: number,
  blue: number,
  alpha?: number
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'srgb-linear'});
}
/** A utility function for creating an display-p3 color. */
function displayP3(
  red: number,
  green: number,
  blue: number,
  alpha?: number
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'display-p3'});
}
/** A utility function for creating an a98-rgb color. */
function a98Rgb(
  red: number,
  green: number,
  blue: number,
  alpha?: number
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'a98-rgb'});
}
/** A utility function for creating a prophoto-rgb color. */
function prophotoRgb(
  red: number,
  green: number,
  blue: number,
  alpha?: number
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'prophoto-rgb'});
}

/** A utility function for creating a xyz color. */
function xyz(x: number, y: number, z: number, alpha?: number): SassColor {
  return new SassColor({x, y, z, alpha, space: 'xyz'});
}

/** A utility function for creating a xyz-d50 color. */
function xyzD50(x: number, y: number, z: number, alpha?: number): SassColor {
  return new SassColor({x, y, z, alpha, space: 'xyz-d50'});
}

/** A utility function for creating a xyz-d65 color. */
function xyzD65(x: number, y: number, z: number, alpha?: number): SassColor {
  return new SassColor({x, y, z, alpha, space: 'xyz-d65'});
}

const constructors = {
  lab,
  oklab,
  lch,
  oklch,
  srgb,
  srgbLinear,
  displayP3,
  a98Rgb,
  prophotoRgb,
  xyz,
  xyzD50,
  xyzD65,
  rgb,
  hsl,
  hwb,
};

describe('SassColor', () => {
  describe('construction', () => {
    describe('type', () => {
      let color: SassColor;
      beforeEach(() => {
        color = legacyRGB(18, 52, 86);
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
        expect(() => color.assertCalculation()).toThrow();
        expect(() => color.assertFunction()).toThrow();
        expect(() => color.assertMap()).toThrow();
        expect(color.tryMap()).toBe(null);
        expect(() => color.assertMixin()).toThrow();
        expect(() => color.assertNumber()).toThrow();
        expect(() => color.assertString()).toThrow();
      });
    });

    describe('rgb()', () => {
      it('allows valid values', () => {
        expect(() => legacyRGB(0, 0, 0, 0)).not.toThrow();
        expect(() => legacyRGB(255, 255, 255, 1)).not.toThrow();
      });

      // TODO(#1828): Update these expectations
      xit('disallows invalid values', () => {
        expect(() => legacyRGB(-1, 0, 0, 0)).toThrow();
        expect(() => legacyRGB(0, -1, 0, 0)).toThrow();
        expect(() => legacyRGB(0, 0, -1, 0)).toThrow();
        expect(() => legacyRGB(0, 0, 0, -0.1)).toThrow();
        expect(() => legacyRGB(256, 0, 0, 0)).toThrow();
        expect(() => legacyRGB(0, 256, 0, 0)).toThrow();
        expect(() => legacyRGB(0, 0, 256, 0)).toThrow();
        expect(() => legacyRGB(0, 0, 0, 1.1)).toThrow();
      });

      // TODO(#1828): Update these expectations
      xit('rounds channels to the nearest integer', () => {
        expect(legacyRGB(0.1, 50.4, 90.3)).toEqualWithHash(
          legacyRGB(0, 50, 90)
        );
        expect(legacyRGB(-0.1, 50.5, 90.7)).toEqualWithHash(
          legacyRGB(0, 51, 91)
        );
      });
    });

    describe('hsl()', () => {
      it('allows valid values', () => {
        expect(() => legacyHsl(0, 0, 0, 0)).not.toThrow();
        expect(() => legacyHsl(4320, 100, 100, 1)).not.toThrow();
      });

      it('disallows invalid values', () => {
        expect(() => legacyHsl(0, -0.1, 0, 0)).toThrow();
        expect(() => legacyHsl(0, 0, -0.1, 0)).toThrow();
        expect(() => legacyHsl(0, 0, 0, -0.1)).toThrow();
        expect(() => legacyHsl(0, 100.1, 0, 0)).toThrow();
        expect(() => legacyHsl(0, 0, 100.1, 0)).toThrow();
        expect(() => legacyHsl(0, 0, 0, 1.1)).toThrow();
      });
    });

    describe('hwb()', () => {
      it('allows valid values', () => {
        expect(() => legacyHwb(0, 0, 0, 0)).not.toThrow();
        expect(() => legacyHwb(4320, 100, 100, 1)).not.toThrow();
      });

      it('disallows invalid values', () => {
        expect(() => legacyHwb(0, -0.1, 0, 0)).toThrow();
        expect(() => legacyHwb(0, 0, -0.1, 0)).toThrow();
        expect(() => legacyHwb(0, 0, 0, -0.1)).toThrow();
        expect(() => legacyHwb(0, 100.1, 0, 0)).toThrow();
        expect(() => legacyHwb(0, 0, 100.1, 0)).toThrow();
        expect(() => legacyHwb(0, 0, 0, 1.1)).toThrow();
      });
    });
  });

  describe('an RGB color', () => {
    let color: SassColor;
    beforeEach(() => {
      color = legacyRGB(18, 52, 86);
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
      expect(color).toEqualWithHash(legacyRGB(18, 52, 86));
      expect(color).toEqualWithHash(
        legacyHsl(210, 65.3846153846154, 20.392156862745097)
      );
      expect(color).toEqualWithHash(
        legacyHwb(210, 7.0588235294117645, 66.27450980392157)
      );
    });
  });

  describe('an HSL color', () => {
    let color: SassColor;
    beforeEach(() => {
      color = legacyHsl(120, 42, 42);
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

    // sass/embedded-host-node#170
    skipForImpl('sass-embedded', () => {
      it('has HWB channels', () => {
        expect(color.hue).toBe(120);
        expect(color.whiteness).toBe(24.360000000000003);
        expect(color.blackness).toBe(40.36000000000001);
      });
    });

    it('has an alpha channel', () => {
      expect(color.alpha).toBe(1);
    });

    // TODO(#1828): Update these expectations
    xit('equals the same color', () => {
      expect(color).toEqualWithHash(legacyRGB(62, 152, 62));
      expect(color).toEqualWithHash(legacyHsl(120, 42, 42));
      expect(color).toEqualWithHash(
        legacyHwb(120, 24.313725490196077, 40.3921568627451)
      );
    });

    it('allows negative hue', () => {
      expect(legacyHsl(-240, 42, 42).hue).toBe(120);
      expect(legacyHsl(-240, 42, 42)).toEqualWithHash(color);
    });
  });

  describe('an HWB color', () => {
    let color: SassColor;
    beforeEach(() => {
      color = legacyHwb(120, 42, 42);
    });

    it('has RGB channels', () => {
      expect(color.red).toBe(107);
      expect(color.green).toBe(148);
      expect(color.blue).toBe(107);
    });

    // sass/embedded-host-node#170
    skipForImpl('sass-embedded', () => {
      it('has HSL channels', () => {
        expect(color.hue).toBe(120);
        expect(color.saturation).toBe(16.000000000000007);
        expect(color.lightness).toBe(50);
      });
    });

    // sass/embedded-host-node#170
    skipForImpl('sass-embedded', () => {
      it('has HWB channels', () => {
        expect(color.hue).toBe(120);
        expect(color.whiteness).toBe(42);
        expect(color.blackness).toBe(42);
      });
    });

    it('has an alpha channel', () => {
      expect(color.alpha).toBe(1);
    });

    // TODO(#1828): Update these expectations
    xit('equals the same color', () => {
      expect(color).toEqualWithHash(legacyRGB(107, 148, 107));
      expect(color).toEqualWithHash(legacyHsl(120, 16.078431372549026, 50));
      expect(color).toEqualWithHash(
        legacyHwb(120, 41.96078431372549, 41.96078431372548)
      );
    });

    it('allows negative hue', () => {
      expect(legacyHwb(-240, 42, 42).hue).toBe(120);
      expect(legacyHwb(-240, 42, 42)).toEqualWithHash(color);
    });
  });

  describe('changing color values', () => {
    let color: SassColor;
    beforeEach(() => {
      color = legacyRGB(18, 52, 86);
    });

    describe('change() for RGB', () => {
      it('changes RGB values', () => {
        expect(color.change({red: 0})).toEqualWithHash(legacyRGB(0, 52, 86));
        expect(color.change({green: 0})).toEqualWithHash(legacyRGB(18, 0, 86));
        expect(color.change({blue: 0})).toEqualWithHash(legacyRGB(18, 52, 0));
        expect(color.change({alpha: 0.5})).toEqualWithHash(
          legacyRGB(18, 52, 86, 0.5)
        );
        expect(
          color.change({red: 0, green: 0, blue: 0, alpha: 0.5})
        ).toEqualWithHash(legacyRGB(0, 0, 0, 0.5));
      });

      it('allows valid values', () => {
        expect(color.change({red: 0}).red).toBe(0);
        expect(color.change({red: 255}).red).toBe(255);
        expect(color.change({green: 0}).green).toBe(0);
        expect(color.change({green: 255}).green).toBe(255);
        expect(color.change({blue: 0}).blue).toBe(0);
        expect(color.change({blue: 255}).blue).toBe(255);
        expect(color.change({alpha: 0}).alpha).toBe(0);
        expect(color.change({alpha: 1}).alpha).toBe(1);
      });

      // TODO(#1828): Update these expectations
      xit('disallows invalid values', () => {
        expect(() => color.change({red: -1})).toThrow();
        expect(() => color.change({red: 256})).toThrow();
        expect(() => color.change({green: -1})).toThrow();
        expect(() => color.change({green: 256})).toThrow();
        expect(() => color.change({blue: -1})).toThrow();
        expect(() => color.change({blue: 256})).toThrow();
        expect(() => color.change({alpha: -0.1})).toThrow();
        expect(() => color.change({alpha: 1.1})).toThrow();
      });

      // TODO(#1828): Update these expectations
      xit('rounds channels to the nearest integer', () => {
        expect(
          color.change({red: 0.1, green: 50.4, blue: 90.3})
        ).toEqualWithHash(legacyRGB(0, 50, 90));
        expect(
          color.change({red: -0.1, green: 50.5, blue: 90.9})
        ).toEqualWithHash(legacyRGB(0, 51, 91));
      });
    });

    describe('change() for HSL', () => {
      it('changes HSL values', () => {
        expect(color.change({hue: 120})).toEqualWithHash(
          legacyHsl(120, 65.3846153846154, 20.392156862745097)
        );
        expect(color.change({hue: -120})).toEqualWithHash(
          legacyHsl(240, 65.3846153846154, 20.392156862745097)
        );
        expect(color.change({saturation: 42})).toEqualWithHash(
          legacyHsl(210, 42, 20.392156862745097)
        );
        expect(color.change({lightness: 42})).toEqualWithHash(
          legacyHsl(210, 65.3846153846154, 42)
        );
        expect(color.change({alpha: 0.5})).toEqualWithHash(
          legacyHsl(210, 65.3846153846154, 20.392156862745097, 0.5)
        );
        expect(
          color.change({
            hue: 120,
            saturation: 42,
            lightness: 42,
            alpha: 0.5,
          })
        ).toEqualWithHash(legacyHsl(120, 42, 42, 0.5));
      });

      it('allows valid values', () => {
        expect(color.change({saturation: 0}).saturation).toBe(0);
        expect(color.change({saturation: 100}).saturation).toBe(100);
        expect(color.change({lightness: 0}).lightness).toBe(0);
        expect(color.change({lightness: 100}).lightness).toBe(100);
        expect(color.change({alpha: 0}).alpha).toBe(0);
        expect(color.change({alpha: 1}).alpha).toBe(1);
      });

      it('disallows invalid values', () => {
        expect(() => color.change({saturation: -0.1})).toThrow();
        expect(() => color.change({saturation: 100.1})).toThrow();
        expect(() => color.change({lightness: -0.1})).toThrow();
        expect(() => color.change({lightness: 100.1})).toThrow();
        expect(() => color.change({alpha: -0.1})).toThrow();
        expect(() => color.change({alpha: 1.1})).toThrow();
      });
    });

    describe('change() for HWB', () => {
      it('changes HWB values', () => {
        expect(color.change({hue: 120})).toEqualWithHash(
          legacyHwb(120, 7.0588235294117645, 66.27450980392157)
        );
        expect(color.change({hue: -120})).toEqualWithHash(
          legacyHwb(240, 7.0588235294117645, 66.27450980392157)
        );
        expect(color.change({whiteness: 42})).toEqualWithHash(
          legacyHwb(210, 42, 66.27450980392157)
        );
        expect(color.change({whiteness: 50})).toEqualWithHash(
          legacyHwb(210, 50, 66.27450980392157)
        );
        expect(color.change({blackness: 42})).toEqualWithHash(
          legacyHwb(210, 7.0588235294117645, 42)
        );
        expect(color.change({alpha: 0.5})).toEqualWithHash(
          legacyHwb(210, 7.0588235294117645, 66.27450980392157, 0.5)
        );
        expect(
          color.change({
            hue: 120,
            whiteness: 42,
            blackness: 42,
            alpha: 0.5,
          })
        ).toEqualWithHash(legacyHwb(120, 42, 42, 0.5));
      });

      // sass/embedded-host-node#170
      skipForImpl('sass-embedded', () => {
        it('allows valid values', () => {
          expect(color.change({whiteness: 0}).whiteness).toBe(0);
          expect(color.change({whiteness: 100}).whiteness).toBe(
            60.141509433962256
          );
          expect(color.change({blackness: 0}).blackness).toBe(0);
          expect(color.change({blackness: 100}).blackness).toBe(
            93.4065934065934
          );
          expect(color.change({alpha: 0}).alpha).toBe(0);
          expect(color.change({alpha: 1}).alpha).toBe(1);
        });
      });

      it('disallows invalid values', () => {
        expect(() => color.change({whiteness: -0.1})).toThrow();
        expect(() => color.change({whiteness: 100.1})).toThrow();
        expect(() => color.change({blackness: -0.1})).toThrow();
        expect(() => color.change({blackness: 100.1})).toThrow();
        expect(() => color.change({alpha: -0.1})).toThrow();
        expect(() => color.change({alpha: 1.1})).toThrow();
      });
    });

    describe('changeAlpha()', () => {
      it('changes the alpha value', () => {
        expect(color.change({alpha: 0.5})).toEqualWithHash(
          legacyRGB(18, 52, 86, 0.5)
        );
      });

      it('allows valid alphas', () => {
        expect(color.change({alpha: 0}).alpha).toBe(0);
        expect(color.change({alpha: 1}).alpha).toBe(1);
      });

      it('rejects invalid alphas', () => {
        expect(() => color.change({alpha: -0.1})).toThrow();
        expect(() => color.change({alpha: 1.1})).toThrow();
      });
    });
  });
});
