// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {SassColor} from 'sass';

export type Constructor = (
  channel1: number | null,
  channel2: number | null,
  channel3: number | null,
  alpha?: number | null,
) => SassColor;

/** A utility function for creating an RGB color without specifying a space. */
export function legacyRGB(
  red: number,
  green: number,
  blue: number,
  alpha?: number,
): SassColor {
  return new SassColor({red, green, blue, alpha});
}

/** A utility function for creating an RGB color. */
export function rgb(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'rgb'});
}

/** A utility function for creating an HSL color without specifying a space. */
export function legacyHsl(
  hue: number,
  saturation: number,
  lightness: number,
  alpha?: number,
): SassColor {
  return new SassColor({hue, saturation, lightness, alpha});
}

/** A utility function for creating an HSL color. */
export function hsl(
  hue: number | null,
  saturation: number | null,
  lightness: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({hue, saturation, lightness, alpha, space: 'hsl'});
}

/** A utility function for creating an HWB color without specifying a space. */
export function legacyHwb(
  hue: number | null,
  whiteness: number | null,
  blackness: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({hue, whiteness, blackness, alpha});
}

/** A utility function for creating an HWB color. */
export function hwb(
  hue: number | null,
  whiteness: number | null,
  blackness: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({hue, whiteness, blackness, alpha, space: 'hwb'});
}

/** A utility function for creating a Lab color. */
export function lab(
  lightness: number | null,
  a: number | null,
  b: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({lightness, a, b, alpha, space: 'lab'});
}
/** A utility function for creating a Oklab color. */
export function oklab(
  lightness: number | null,
  a: number | null,
  b: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({lightness, a, b, alpha, space: 'oklab'});
}
/** A utility function for creating an LCH color. */
export function lch(
  lightness: number | null,
  chroma: number | null,
  hue: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({lightness, chroma, hue, alpha, space: 'lch'});
}
/** A utility function for creating a Oklab color. */
export function oklch(
  lightness: number | null,
  chroma: number | null,
  hue: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({lightness, chroma, hue, alpha, space: 'oklch'});
}

/** A utility function for creating an srgb color. */
export function srgb(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'srgb'});
}
/** A utility function for creating an srgb-linear color. */
export function srgbLinear(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'srgb-linear'});
}
/** A utility function for creating an rec2020 color. */
export function rec2020(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'rec2020'});
}
/** A utility function for creating an display-p3 color. */
export function displayP3(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'display-p3'});
}
/** A utility function for creating an display-p3-linear color. */
export function displayP3Linear(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'display-p3-linear'});
}
/** A utility function for creating an a98-rgb color. */
export function a98Rgb(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'a98-rgb'});
}
/** A utility function for creating a prophoto-rgb color. */
export function prophotoRgb(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'prophoto-rgb'});
}

/** A utility function for creating a xyz color. */
export function xyz(
  x: number | null,
  y: number | null,
  z: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({x, y, z, alpha, space: 'xyz'});
}

/** A utility function for creating a xyz-d50 color. */
export function xyzD50(
  x: number | null,
  y: number | null,
  z: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({x, y, z, alpha, space: 'xyz-d50'});
}

/** A utility function for creating a xyz-d65 color. */
export function xyzD65(
  x: number | null,
  y: number | null,
  z: number | null,
  alpha?: number | null,
): SassColor {
  return new SassColor({x, y, z, alpha, space: 'xyz-d65'});
}
