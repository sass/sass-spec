// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {Value, SassColor} from 'sass';
import {ChannelName} from '../../../dart-sass/build/npm/types/value/color';
import {List} from 'immutable';
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
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null
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
  hue: number | null,
  saturation: number | null,
  lightness: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({hue, saturation, lightness, alpha, space: 'hsl'});
}

/** A utility function for creating an HWB color without specifying a space. */
function legacyHwb(
  hue: number | null,
  whiteness: number | null,
  blackness: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({hue, whiteness, blackness, alpha});
}

/** A utility function for creating an HWB color. */
function hwb(
  hue: number | null,
  whiteness: number | null,
  blackness: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({hue, whiteness, blackness, alpha, space: 'hwb'});
}

/** A utility function for creating a Lab color. */
function lab(
  lightness: number | null,
  a: number | null,
  b: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({lightness, a, b, alpha, space: 'lab'});
}
/** A utility function for creating a Oklab color. */
function oklab(
  lightness: number | null,
  a: number | null,
  b: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({lightness, a, b, alpha, space: 'oklab'});
}
/** A utility function for creating an LCH color. */
function lch(
  lightness: number | null,
  chroma: number | null,
  hue: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({lightness, chroma, hue, alpha, space: 'lch'});
}
/** A utility function for creating a Oklab color. */
function oklch(
  lightness: number | null,
  chroma: number | null,
  hue: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({lightness, chroma, hue, alpha, space: 'oklch'});
}

/** A utility function for creating an srgb color. */
function srgb(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'srgb'});
}
/** A utility function for creating an srgb-linear color. */
function srgbLinear(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'srgb-linear'});
}
/** A utility function for creating an display-p3 color. */
function displayP3(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'display-p3'});
}
/** A utility function for creating an a98-rgb color. */
function a98Rgb(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'a98-rgb'});
}
/** A utility function for creating a prophoto-rgb color. */
function prophotoRgb(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'prophoto-rgb'});
}

/** A utility function for creating a xyz color. */
function xyz(
  x: number | null,
  y: number | null,
  z: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({x, y, z, alpha, space: 'xyz'});
}

/** A utility function for creating a xyz-d50 color. */
function xyzD50(
  x: number | null,
  y: number | null,
  z: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({x, y, z, alpha, space: 'xyz-d50'});
}

/** A utility function for creating a xyz-d65 color. */
function xyzD65(
  x: number | null,
  y: number | null,
  z: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({x, y, z, alpha, space: 'xyz-d65'});
}

type KnownColorSpace = typeof SassColor.prototype.space;

type Constructor = (
  channel1: number | null,
  channel2: number | null,
  channel3: number | null,
  alpha?: number | null
) => SassColor;
const spaces: {
  [key: string]: {
    constructor: Constructor;
    name: KnownColorSpace;
    isLegacy: boolean;
    pink: [number, number, number];
    channels: ChannelName[];
    ranges: [number, number][];
    hasPowerless?: boolean;
  };
} = {
  lab: {
    constructor: lab,
    name: 'lab',
    isLegacy: false,
    pink: [78.27047872644108, 35.20288139978972, 1.0168442562642044],
    channels: ['lightness', 'a', 'b'],
    ranges: [
      [0, 100],
      [-125, -125],
      [-125, -125],
    ],
  },
  oklab: {
    constructor: oklab,
    name: 'oklab',
    isLegacy: false,
    pink: [0.8241000000000002, 0.10608808442731632, 0.0015900762693974446],
    channels: ['lightness', 'a', 'b'],
    ranges: [
      [0, 1],
      [-0.4, 0.4],
      [-0.4, 0.4],
    ],
  },
  lch: {
    constructor: lch,
    name: 'lch',
    isLegacy: false,
    pink: [78.27047872644108, 35.21756424128674, 1.6545432253797676],
    channels: ['lightness', 'chroma', 'hue'],
    hasPowerless: true,
    ranges: [
      [0, 100],
      [0, 150],
      [0, 360],
    ],
  },
  oklch: {
    constructor: oklch,
    name: 'oklch',
    isLegacy: false,
    pink: [0.8241, 0.1061, 0.8587],
    channels: ['lightness', 'chroma', 'hue'],
    hasPowerless: true,
    ranges: [
      [0, 1],
      [0, 0.4],
      [0, 360],
    ],
  },
  srgb: {
    constructor: srgb,
    name: 'srgb',
    isLegacy: false,
    pink: [0.9999785463111585, 0.6599448662991679, 0.758373017125016],
    channels: ['red', 'green', 'blue'],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  },
  srgbLinear: {
    constructor: srgbLinear,
    name: 'srgb-linear',
    isLegacy: false,
    pink: [0.999951196094508, 0.3930503811476254, 0.5356603778005655],
    channels: ['red', 'green', 'blue'],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  },
  displayP3: {
    constructor: displayP3,
    name: 'display-p3',
    isLegacy: false,
    pink: [0.9510333333617188, 0.6749909745845027, 0.7568568353546363],
    channels: ['red', 'green', 'blue'],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  },
  a98Rgb: {
    constructor: a98Rgb,
    name: 'a98-rgb',
    isLegacy: false,
    pink: [0.9172837001828321, 0.6540226622083835, 0.7491144397116841],
    channels: ['red', 'green', 'blue'],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  },
  prophotoRgb: {
    constructor: prophotoRgb,
    name: 'prophoto-rgb',
    isLegacy: false,
    pink: [0.842345736209146, 0.6470539622987257, 0.7003583323790157],
    channels: ['red', 'green', 'blue'],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  },
  xyz: {
    constructor: xyz,
    name: 'xyz',
    isLegacy: false,
    pink: [0.6495957411726918, 0.5323965129525022, 0.575341840710865],
    channels: ['x', 'y', 'z'],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  },
  xyzD50: {
    constructor: xyzD50,
    name: 'xyz-d50',
    isLegacy: false,
    pink: [0.6640698533004002, 0.5367266625281085, 0.4345958246720296],
    channels: ['x', 'y', 'z'],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  },
  xyzD65: {
    constructor: xyzD65,
    name: 'xyz',
    isLegacy: false,
    pink: [0.6495957411726918, 0.5323965129525022, 0.575341840710865],
    channels: ['x', 'y', 'z'],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  },
  rgb: {
    constructor: rgb,
    name: 'rgb',
    isLegacy: true,
    pink: [254.9945293093454, 168.28594090628783, 193.38511936687908],
    channels: ['red', 'green', 'blue'],
    ranges: [
      [0, 255],
      [0, 255],
      [0, 255],
    ],
  },
  hsl: {
    constructor: hsl,
    name: 'hsl',
    isLegacy: true,
    pink: [342.63204677447646, 99.98738302509669, 82.99617063051632],
    channels: ['hue', 'saturation', 'lightness'],
    hasPowerless: true,
    ranges: [
      [0, 360],
      [0, 100],
      [0, 100],
    ],
  },
  hwb: {
    constructor: hwb,
    name: 'hwb',
    isLegacy: true,
    pink: [342.63204677447646, 65.99448662991679, 0.002145368884157506],
    channels: ['hue', 'whiteness', 'blackness'],
    hasPowerless: true,
    ranges: [
      [0, 360],
      [0, 100],
      [0, 100],
    ],
  },
};
// @todo Replace with KnownColorSpace export
const spaceNames = Object.keys(spaces) as KnownColorSpace[];

function channelCases(ch1: number, ch2: number, ch3: number) {
  return [
    [ch1, ch2, ch3],
    [null, ch2, ch3],
    [null, null, ch3],
    [ch1, null, ch3],
    [ch1, null, null],
    [ch1, ch2, null],
    [null, ch2, null],
    [null, null, null],
  ].flatMap(channels => [
    channels,
    [...channels, 1],
    [...channels, 0],
    [...channels, 0.5],
    [...channels, null],
  ]) as [
    [number | null, number | null, number | null, number | null | undefined]
  ];
}

xdescribe('SassColor', () => {
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
describe('Color 4 SassColors', () => {
  spaceNames.forEach(spaceId => {
    const space = spaces[spaceId];

    describe(space.name, () => {
      let color: SassColor;
      beforeEach(() => {
        color = space.constructor(...space.pink);
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

      it(`returns name for ${space.name}`, () => {
        expect(color.space).toBe(space.name);
      });
      describe('toSpace', () => {
        spaceNames.forEach(destinationSpaceId => {
          const destinationSpace = spaces[destinationSpaceId];
          it(`converts to ${destinationSpace.name}`, () => {
            const res = color.toSpace(destinationSpace.name);
            expect(res.space).toBe(destinationSpace.name);

            const expected = destinationSpace.constructor(
              ...destinationSpace.pink
            );
            expect(res).toEqualWithHash(expected);
          });
        });
      });
      it(`isLegacy returns ${space.isLegacy} for ${space.name}`, () => {
        expect(color.isLegacy).toBe(space.isLegacy);
      });
      describe('channelsOrNull', () => {
        it('returns a list', () => {
          expect(color.channelsOrNull).toEqualWithHash(List(space.pink));
          expect(color.channelsOrNull.size).toBe(space.channels.length);
        });
        it('returns channel value or null, excluding alpha', () => {
          const pinkCases = channelCases(...space.pink);
          pinkCases.forEach(channels => {
            const _color = space.constructor(...channels);
            expect(_color.channelsOrNull).toEqualWithHash(
              List.of(...channels.slice(0, 3))
            );
          });
        });
      });
      describe('channels', () => {
        it('returns a list', () => {
          expect(color.channels).toEqualWithHash(List(space.pink));
          expect(color.channels.size).toBe(space.channels.length);
        });
        it('returns channel value or 0, excluding alpha', () => {
          const pinkCases = channelCases(...space.pink);
          pinkCases.forEach(channels => {
            const expected = channels.slice(0, 3).map(channel => channel || 0);
            const _color = space.constructor(...channels);
            expect(_color.channels).toEqualWithHash(List.of(...expected));
          });
        });
      });
      it('isChannelMissing', () => {
        const pinkCases = channelCases(...space.pink);
        pinkCases.forEach(channels => {
          const expected = channels.map(channel => channel === null);
          // Undefined alpha is not missing
          if (expected.length === 3) expected.push(false);
          const _color = space.constructor(...channels);
          expect(_color.isChannelMissing(space.channels[0])).toBe(expected[0]);
          expect(_color.isChannelMissing(space.channels[1])).toBe(expected[1]);
          expect(_color.isChannelMissing(space.channels[2])).toBe(expected[2]);
          expect(_color.isChannelMissing('alpha')).toBe(expected[3]);
        });
      });
      describe('channel', () => {
        describe('without space specified', () => {
          xit('throws an error if channel not in space');
          xit('returns value if no space specified');
        });
        describe('with space specified', () => {
          xit('throws an error if channel not in destination space');
          xit('returns value in space specified');
        });
        xit('returns 0 for missing channels');
      });
      describe('alpha', () => {
        xit('returns value if set');
        xit('returns 1 if not set');
        xit('returns 0 if missing');
      });
      xit('interpolate');
      xit('change');

      it('isChannelPowerless', () => {
        function checkPowerless(
          _color: SassColor,
          powerless = [false, false, false]
        ) {
          expect(_color.isChannelPowerless(space.channels[0])).toBe(
            powerless[0]
          );
          expect(_color.isChannelPowerless(space.channels[1])).toBe(
            powerless[1]
          );
          expect(_color.isChannelPowerless(space.channels[2])).toBe(
            powerless[2]
          );
        }
        const [ch1, ch2, ch3] = space.ranges;
        if (space.hasPowerless) {
          // test powerless channels
          switch (space.name) {
            case 'hwb':
              // If the combined `whiteness` and `blackness` values (after
              // normalization) are equal to `100%`, then the `hue` channel is
              // powerless.
              checkPowerless(space.constructor(ch1[0], 0, 100), [
                true,
                false,
                false,
              ]);
              checkPowerless(space.constructor(ch1[0], 100, 0), [
                true,
                false,
                false,
              ]);
              checkPowerless(space.constructor(ch1[0], 50, 50), [
                true,
                false,
                false,
              ]);
              checkPowerless(space.constructor(ch1[1], 0, 100), [
                true,
                false,
                false,
              ]);
              checkPowerless(space.constructor(ch1[1], 100, 0), [
                true,
                false,
                false,
              ]);
              checkPowerless(space.constructor(ch1[1], 50, 50), [
                true,
                false,
                false,
              ]);

              checkPowerless(space.constructor(ch1[0], ch2[1], ch3[1]));
              checkPowerless(space.constructor(ch1[0], ch2[0], ch3[0]));
              checkPowerless(space.constructor(ch1[1], ch2[1], ch3[1]));
              checkPowerless(space.constructor(ch1[1], ch2[0], ch3[0]));

              break;

            case 'hsl':
            case 'lch':
            case 'oklch':
              // hsl- If the saturation of an HSL color is 0%, then the hue component is powerless.
              // (ok)lch- If the `chroma` value is 0%, then the `hue` channel is powerless.
              checkPowerless(space.constructor(ch1[0], 0, ch3[0]), [
                true,
                false,
                false,
              ]);
              checkPowerless(space.constructor(ch1[0], 0, ch3[1]), [
                true,
                false,
                false,
              ]);
              checkPowerless(space.constructor(ch1[1], 0, ch3[1]), [
                true,
                false,
                false,
              ]);
              checkPowerless(space.constructor(ch1[1], 0, ch3[0]), [
                true,
                false,
                false,
              ]);

              checkPowerless(space.constructor(ch1[0], ch2[1], ch3[0]));
              checkPowerless(space.constructor(ch1[0], ch2[1], ch3[1]));
              checkPowerless(space.constructor(ch1[1], ch2[1], ch3[1]));
              checkPowerless(space.constructor(ch1[1], ch2[1], ch3[0]));
              break;

            default:
              throw new Error(
                `Unimplemented isPowerless check for ${space.name}`
              );
          }
        } else {
          checkPowerless(space.constructor(ch1[0], ch2[0], ch3[0]));
          checkPowerless(space.constructor(ch1[1], ch2[0], ch3[0]));
          checkPowerless(space.constructor(ch1[1], ch2[1], ch3[0]));
          checkPowerless(space.constructor(ch1[1], ch2[1], ch3[1]));
          checkPowerless(space.constructor(ch1[0], ch2[1], ch3[1]));
          checkPowerless(space.constructor(ch1[0], ch2[0], ch3[1]));
          checkPowerless(space.constructor(ch1[1], ch2[0], ch3[1]));
          checkPowerless(space.constructor(ch1[0], ch2[1], ch3[0]));
        }
      });

      // isInGamut and toGamut are very space-specific and
      // may need non-parameterized tests.
      xit('isInGamut');
      xit('toGamut');
    });
  });
});
