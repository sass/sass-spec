// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

// General space-specific info and construction

import {Value, SassColor} from 'sass';
import type {
  ChannelName,
  ChannelNameXyz,
  ColorSpaceXyz,
  KnownColorSpace,
} from 'sass';

import {skipForImpl} from '../../utils';
import {spaces} from './spaces';
import * as constructors from './constructors';

const spaceNames = Object.keys(spaces) as KnownColorSpace[];

describe('Color 4 SassColors Spaces', () => {
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

      describe('validation on construction', () => {
        it('throws on invalid alpha', () => {
          expect(() => {
            space.constructor(...space.pink, -1);
          }).toThrow();
          expect(() => {
            space.constructor(...space.pink, 1.1);
          }).toThrow();
        });

        if (space.channels.includes('lightness')) {
          describe('out of range lightness', () => {
            it('throws on negative lightness', () => {
              const index = space.channels.findIndex(
                channel => channel === 'lightness'
              );
              const channels = [...space.pink] as [number, number, number];
              channels[index] = -1;
              expect(() => space.constructor(...channels)).toThrow();
            });
            // TODO: Failing for oklab and oklch in dart-sass
            it('throws on lightness higher than bounds', () => {
              const index = space.channels.findIndex(
                channel => channel === 'lightness'
              );
              const channels = [...space.pink] as [number, number, number];
              channels[index] = space.ranges[index][1] + 1;
              expect(() => space.constructor(...channels)).toThrow();
            });
          });
        }
      });

      it(`returns name for ${space.name}`, () => {
        expect(color.space).toBe(space.name);
      });

      it(`isLegacy returns ${space.isLegacy} for ${space.name}`, () => {
        expect(color.isLegacy).toBe(space.isLegacy);
      });
    });
  });
  describe("tests that can't be parameterized", () => {
    // TODO: Waiting on a fix for:
    // https://github.com/LeaVerou/color.js/issues/154
    skipForImpl('sass-embedded', () => {
      it('toGamut with space', () => {
        const cases: [SassColor, KnownColorSpace, SassColor][] = [
          [
            constructors.oklch(0.8, 2, 150),
            'display-p3',
            constructors.oklch(
              0.8011972524233195,
              0.31025433677129627,
              149.69615588210382
            ),
          ],
          [
            constructors.oklch(0.8, 2, 150),
            'srgb',
            constructors.oklch(
              0.8086628549532134,
              0.23694508940439973,
              147.5313920153958
            ),
          ],
        ];
        cases.forEach(([input, space, output]) => {
          expect(input.toGamut(space)).toEqualWithHash(output);
        });
      });
    });
    it('channel with space specified, missing returns 0', () => {
      const cases: [SassColor, KnownColorSpace, ChannelName][] = [
        [constructors.oklch(null, null, null), 'lch', 'hue'],
        [constructors.oklch(null, null, null), 'lch', 'lightness'],
        [constructors.oklch(null, null, null), 'hsl', 'hue'],
        [constructors.oklch(null, null, null), 'hsl', 'lightness'],
        [constructors.xyz(null, null, null), 'lab', 'lightness'],
      ];

      cases.forEach(([color, space, channel]) => {
        expect(
          color.channel(channel as ChannelNameXyz, {
            space: space as ColorSpaceXyz,
          })
        ).toBe(0);
      });
    });
  });
});
