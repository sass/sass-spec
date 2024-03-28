// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {Value, SassColor} from 'sass';
import {captureStdio} from '../../utils';
import {legacyRGB, legacyHsl, legacyHwb} from './constructors';

describe('Legacy SassColor', () => {
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

      it('disallows invalid alpha values', () => {
        expect(() => legacyRGB(0, 0, 0, -0.1)).toThrow();
        expect(() => legacyRGB(0, 0, 0, 1.1)).toThrow();
      });

      it('allows out-of-gamut values which were invalid before color 4', () => {
        expect(() => legacyRGB(-1, 0, 0, 0)).not.toThrow();
        expect(() => legacyRGB(0, -1, 0, 0)).not.toThrow();
        expect(() => legacyRGB(0, 0, -1, 0)).not.toThrow();
        expect(() => legacyRGB(256, 0, 0, 0)).not.toThrow();
        expect(() => legacyRGB(0, 256, 0, 0)).not.toThrow();
        expect(() => legacyRGB(0, 0, 256, 0)).not.toThrow();
      });

      it('does not round channels to the nearest integer', () => {
        expect(legacyRGB(0.1, 50.4, 90.3).channels).toFuzzyEqualList([
          0.1, 50.4, 90.3,
        ]);
        expect(legacyRGB(-0.1, 50.5, 90.7).channels).toFuzzyEqualList([
          -0.1, 50.5, 90.7,
        ]);
      });

      describe('deprecations', () => {
        it('warns with null alpha and no space', () => {
          const stdio = captureStdio(() => {
            new SassColor({red: 1, green: 1, blue: 1, alpha: null});
          });
          expect(stdio.err).toMatch('null-alpha');
        });

        it("doesn't warn for undefined alpha and no space", () => {
          const stdio = captureStdio(() => {
            new SassColor({red: 1, green: 1, blue: 1, alpha: undefined});
          });
          expect(stdio.err).toBeEmptyString();
        });

        it("doesn't warn for no alpha and no space", () => {
          const stdio = captureStdio(() => {
            new SassColor({red: 1, green: 1, blue: 1});
          });
          expect(stdio.err).toBeEmptyString();
        });

        it("doesn't warn for undefined alpha and undefined space", () => {
          const stdio = captureStdio(() => {
            new SassColor({
              red: 1,
              green: 1,
              blue: 1,
              alpha: undefined,
              space: undefined,
            });
          });
          expect(stdio.err).toBeEmptyString();
        });

        it("doesn't warn for null alpha with space", () => {
          const stdio = captureStdio(() => {
            new SassColor({
              red: 1,
              green: 1,
              blue: 1,
              alpha: null,
              space: 'rgb',
            });
          });
          expect(stdio.err).toBeEmptyString();
        });
      });
    });

    describe('hsl()', () => {
      it('allows valid values', () => {
        expect(() => legacyHsl(0, 0, 0, 0)).not.toThrow();
        expect(() => legacyHsl(4320, 100, 100, 1)).not.toThrow();
        expect(() => legacyHsl(0, -0.1, 0, 0)).not.toThrow();
        expect(() => legacyHsl(0, 100.1, 0, 0)).not.toThrow();
        expect(() => legacyHsl(0, 0, -0.1, 0)).not.toThrow();
        expect(() => legacyHsl(0, 0, 100.1, 0)).not.toThrow();
      });

      it('disallows invalid alpha values', () => {
        expect(() => legacyHsl(0, 0, 0, -0.1)).toThrow();
        expect(() => legacyHsl(0, 0, 0, 1.1)).toThrow();
      });

      describe('deprecations', () => {
        it('warns with null alpha and no space', () => {
          const stdio = captureStdio(() => {
            new SassColor({hue: 1, saturation: 1, lightness: 1, alpha: null});
          });
          expect(stdio.err).toMatch('null-alpha');
        });

        it("doesn't warn for undefined alpha and no space", () => {
          const stdio = captureStdio(() => {
            new SassColor({
              hue: 1,
              saturation: 1,
              lightness: 1,
              alpha: undefined,
            });
          });
          expect(stdio.err).toBeEmptyString();
        });

        it("doesn't warn for no alpha and no space", () => {
          const stdio = captureStdio(() => {
            new SassColor({hue: 1, saturation: 1, lightness: 1});
          });
          expect(stdio.err).toBeEmptyString();
        });

        it("doesn't warn for undefined alpha and undefined space", () => {
          const stdio = captureStdio(() => {
            new SassColor({
              hue: 1,
              saturation: 1,
              lightness: 1,
              alpha: undefined,
              space: undefined,
            });
          });
          expect(stdio.err).toBeEmptyString();
        });

        it("doesn't warn for null alpha with space", () => {
          const stdio = captureStdio(() => {
            new SassColor({
              hue: 1,
              saturation: 1,
              lightness: 1,
              alpha: null,
              space: 'hsl',
            });
          });
          expect(stdio.err).toBeEmptyString();
        });
      });
    });

    describe('hwb()', () => {
      it('allows valid values', () => {
        expect(() => legacyHwb(0, 0, 0, 0)).not.toThrow();
        expect(() => legacyHwb(4320, 100, 100, 1)).not.toThrow();
        expect(() => legacyHwb(0, -0.1, 0, 0)).not.toThrow();
        expect(() => legacyHwb(0, 0, -0.1, 0)).not.toThrow();
        expect(() => legacyHwb(0, 100.1, 0, 0)).not.toThrow();
        expect(() => legacyHwb(0, 0, 100.1, 0)).not.toThrow();
      });

      it('disallows invalid alpha values', () => {
        expect(() => legacyHwb(0, 0, 0, -0.1)).toThrow();
        expect(() => legacyHwb(0, 0, 0, 1.1)).toThrow();
      });

      describe('deprecations', () => {
        it('warns with null alpha and no space', () => {
          const stdio = captureStdio(() => {
            new SassColor({hue: 1, whiteness: 1, blackness: 1, alpha: null});
          });
          expect(stdio.err).toMatch('null-alpha');
        });

        it("doesn't warn for undefined alpha and no space", () => {
          const stdio = captureStdio(() => {
            new SassColor({
              hue: 1,
              whiteness: 1,
              blackness: 1,
              alpha: undefined,
            });
          });
          expect(stdio.err).toBeEmptyString();
        });

        it("doesn't warn for no alpha and no space", () => {
          const stdio = captureStdio(() => {
            new SassColor({hue: 1, whiteness: 1, blackness: 1});
          });
          expect(stdio.err).toBeEmptyString();
        });

        it("doesn't warn for undefined alpha and undefined space", () => {
          const stdio = captureStdio(() => {
            new SassColor({
              hue: 1,
              whiteness: 1,
              blackness: 1,
              alpha: undefined,
              space: undefined,
            });
          });
          expect(stdio.err).toBeEmptyString();
        });

        it("doesn't warn for null alpha with space", () => {
          const stdio = captureStdio(() => {
            new SassColor({
              hue: 1,
              whiteness: 1,
              blackness: 1,
              alpha: null,
              space: 'hwb',
            });
          });
          expect(stdio.err).toBeEmptyString();
        });
      });
    });
  });

  describe('an RGB color', () => {
    let color: SassColor;
    beforeEach(() => {
      color = legacyRGB(18, 52, 86);
    });

    it('has RGB channels', () => {
      const stdio = captureStdio(() => {
        expect(color.red).toFuzzyEqual(18);
        expect(color.green).toFuzzyEqual(52);
        expect(color.blue).toFuzzyEqual(86);
      });
      expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
    });

    it('has HSL channels', () => {
      const stdio = captureStdio(() => {
        expect(color.hue).toFuzzyEqual(210);
        expect(color.saturation).toFuzzyEqual(65.3846153846154);
        expect(color.lightness).toFuzzyEqual(20.392156862745097);
      });
      expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
    });

    it('has HWB channels', () => {
      const stdio = captureStdio(() => {
        expect(color.hue).toFuzzyEqual(210);
        expect(color.whiteness).toFuzzyEqual(7.0588235294117645);
        expect(color.blackness).toFuzzyEqual(66.27450980392157);
      });
      expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
    });

    it('has an alpha channel', () => {
      expect(color.alpha).toBe(1);
    });

    it('equals the same color even in a different color space', () => {
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
      const stdio = captureStdio(() => {
        expect(color.red).toFuzzyEqual(62);
        expect(color.green).toFuzzyEqual(152);
        expect(color.blue).toFuzzyEqual(62);
      });
      expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
    });

    it('has HSL channels', () => {
      const stdio = captureStdio(() => {
        expect(color.hue).toFuzzyEqual(120);
        expect(color.saturation).toFuzzyEqual(42);
        expect(color.lightness).toFuzzyEqual(42);
      });
      expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
    });

    it('has HWB channels', () => {
      const stdio = captureStdio(() => {
        expect(color.hue).toFuzzyEqual(120);
        expect(color.whiteness).toFuzzyEqual(24.360000000000003);
        expect(color.blackness).toFuzzyEqual(40.36000000000001);
      });
      expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
    });

    it('has an alpha channel', () => {
      expect(color.alpha).toBe(1);
    });

    it('equals the same color even in a different color space', () => {
      expect(color).toEqualWithHash(legacyRGB(62.118, 152.082, 62.118));
      expect(color).toEqualWithHash(legacyHsl(120, 42, 42));
      expect(color).toEqualWithHash(legacyHwb(120, 24.36, 40.36));
    });

    it('allows negative hue', () => {
      expect(legacyHsl(-240, 42, 42).channel('hue')).toBe(120);
      expect(legacyHsl(-240, 42, 42)).toEqualWithHash(color);
    });
  });

  describe('an HWB color', () => {
    let color: SassColor;
    beforeEach(() => {
      color = legacyHwb(120, 42, 42);
    });

    it('has RGB channels', () => {
      const stdio = captureStdio(() => {
        expect(color.red).toFuzzyEqual(107);
        expect(color.green).toFuzzyEqual(148);
        expect(color.blue).toFuzzyEqual(107);
      });
      expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
    });

    it('has HSL channels', () => {
      const stdio = captureStdio(() => {
        expect(color.hue).toFuzzyEqual(120);
        expect(color.saturation).toFuzzyEqual(16.000000000000007);
        expect(color.lightness).toFuzzyEqual(50);
      });
      expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
    });

    it('has HWB channels', () => {
      const stdio = captureStdio(() => {
        expect(color.hue).toFuzzyEqual(120);
        expect(color.whiteness).toFuzzyEqual(42);
        expect(color.blackness).toFuzzyEqual(42);
      });
      expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
    });

    it('has an alpha channel', () => {
      expect(color.alpha).toBe(1);
    });

    it('equals the same color even in a different color space', () => {
      expect(color).toEqualWithHash(legacyRGB(107.1, 147.9, 107.1));
      expect(color).toEqualWithHash(legacyHsl(120, 16, 50));
      expect(color).toEqualWithHash(legacyHwb(120, 42, 42));
    });

    it('allows negative hue', () => {
      expect(legacyHwb(-240, 42, 42).channel('hue')).toBe(120);
      expect(legacyHwb(-240, 42, 42)).toEqualWithHash(color);
    });
  });

  describe('changing color values', () => {
    describe('change() for RGB', () => {
      let color: SassColor;
      beforeEach(() => {
        color = legacyRGB(18, 52, 86);
      });

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
        expect(color.change({red: 0}).channel('red')).toBe(0);
        expect(color.change({red: 255}).channel('red')).toBe(255);
        expect(color.change({green: 0}).channel('green')).toBe(0);
        expect(color.change({green: 255}).channel('green')).toBe(255);
        expect(color.change({blue: 0}).channel('blue')).toBe(0);
        expect(color.change({blue: 255}).channel('blue')).toBe(255);
        expect(color.change({alpha: 0}).alpha).toBe(0);
        expect(color.change({alpha: 1}).alpha).toBe(1);
        expect(color.change({red: undefined}).channel('red')).toBe(18);
      });

      it('allows out of range values which were invalid before color 4', () => {
        expect(() => color.change({red: -1})).not.toThrow();
        expect(() => color.change({red: 256})).not.toThrow();
        expect(() => color.change({green: -1})).not.toThrow();
        expect(() => color.change({green: 256})).not.toThrow();
        expect(() => color.change({blue: -1})).not.toThrow();
        expect(() => color.change({blue: 256})).not.toThrow();
      });

      it('disallows invalid alpha values', () => {
        expect(() => color.change({alpha: -0.1})).toThrow();
        expect(() => color.change({alpha: 1.1})).toThrow();
      });

      it('does not round channels to the nearest integer', () => {
        expect(
          color.change({red: 0.1, green: 50.4, blue: 90.3}).channels
        ).toFuzzyEqualList([0.1, 50.4, 90.3]);
        expect(
          color.change({red: -0.1, green: 50.5, blue: 90.9}).channels
        ).toFuzzyEqualList([-0.1, 50.5, 90.9]);
      });

      it('emits deprecation for null values', () => {
        const stdio = captureStdio(() => {
          color.change({red: null});
          color.change({green: null});
          color.change({blue: null});
          color.change({alpha: null});
        });
        expect(stdio.err.match(/`alpha: null`/g)).toBeArrayOfSize(1);
        expect(stdio.err.match(/`red: null`/g)).toBeArrayOfSize(1);
        expect(stdio.err.match(/`green: null`/g)).toBeArrayOfSize(1);
        expect(stdio.err.match(/`blue: null`/g)).toBeArrayOfSize(1);
      });

      it('emits deprecation for channels from unspecified space', () => {
        const stdio = captureStdio(() => {
          color.change({hue: 1});
        });
        expect(stdio.err).toMatch('color-4-api');
      });
    });

    describe('change() for HSL', () => {
      let color: SassColor;
      beforeEach(() => {
        color = legacyHsl(210, 65.3846153846154, 20.392156862745097);
      });

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
        expect(color.change({hue: undefined})).toEqualWithHash(color);
        // Emits deprecation warning which is tested elsewhere
        captureStdio(() => {
          expect(color.change({hue: null})).toEqualWithHash(color);
        });
      });

      it('allows valid values', () => {
        expect(color.change({saturation: 0}).channel('saturation')).toBe(0);
        expect(color.change({saturation: 100}).channel('saturation')).toBe(100);
        expect(color.change({lightness: 0}).channel('lightness')).toBe(0);
        expect(color.change({lightness: 100}).channel('lightness')).toBe(100);
        expect(color.change({alpha: 0}).alpha).toBe(0);
        expect(color.change({alpha: 1}).alpha).toBe(1);
        expect(color.change({lightness: -0.1}).lightness).toBe(-0.1);
        expect(color.change({lightness: 100.1}).lightness).toBe(100.1);
        expect(color.change({hue: undefined}).channel('hue')).toBe(210);
      });

      it('disallows invalid alpha values', () => {
        expect(() => color.change({alpha: -0.1})).toThrow();
        expect(() => color.change({alpha: 1.1})).toThrow();
      });

      it('emits deprecation for null values', () => {
        const stdio = captureStdio(() => {
          color.change({hue: null});
          color.change({saturation: null});
          color.change({lightness: null});
          color.change({alpha: null});
        });
        expect(stdio.err.match(/`alpha: null`/g)).toBeArrayOfSize(1);
        expect(stdio.err.match(/`hue: null`/g)).toBeArrayOfSize(1);
        expect(stdio.err.match(/`saturation: null`/g)).toBeArrayOfSize(1);
        expect(stdio.err.match(/`lightness: null`/g)).toBeArrayOfSize(1);
      });

      it('emits deprecation for channels from unspecified space', () => {
        const stdio = captureStdio(() => {
          color.change({red: 1});
        });
        expect(stdio.err).toMatch('color-4-api');
      });
    });

    describe('change() for HWB', () => {
      let color: SassColor;
      beforeEach(() => {
        color = legacyHwb(210, 7.0588235294117645, 66.27450980392157);
      });

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

      it('allows valid values', () => {
        expect(color.change({whiteness: 0}).channel('whiteness')).toBe(0);
        expect(color.change({whiteness: 100}).channel('whiteness')).toBe(100);
        expect(color.change({blackness: 0}).channel('blackness')).toBe(0);
        expect(color.change({blackness: 100}).channel('blackness')).toBe(100);
        expect(color.change({alpha: 0}).alpha).toBe(0);
        expect(color.change({alpha: 1}).alpha).toBe(1);
        expect(color.change({hue: undefined}).channel('hue')).toBe(210);
      });

      it('disallows invalid values', () => {
        expect(() => color.change({alpha: -0.1})).toThrow();
        expect(() => color.change({alpha: 1.1})).toThrow();
      });

      it('emits deprecation for null values', () => {
        const stdio = captureStdio(() => {
          color.change({hue: null});
          color.change({whiteness: null});
          color.change({blackness: null});
          color.change({alpha: null});
        });
        expect(stdio.err.match(/`alpha: null`/g)).toBeArrayOfSize(1);
        expect(stdio.err.match(/`hue: null`/g)).toBeArrayOfSize(1);
        expect(stdio.err.match(/`whiteness: null`/g)).toBeArrayOfSize(1);
        expect(stdio.err.match(/`blackness: null`/g)).toBeArrayOfSize(1);
      });

      it('emits deprecation for channels from unspecified space', () => {
        const stdio = captureStdio(() => {
          color.change({red: 1});
        });
        expect(stdio.err).toMatch('color-4-api');
      });
    });

    describe('changeAlpha()', () => {
      let color: SassColor;
      beforeEach(() => {
        color = legacyRGB(18, 52, 86);
      });

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
