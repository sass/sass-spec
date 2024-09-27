// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

// Tests that can't be generally parameterized

import {SassColor} from 'sass';
import type {
  ChannelName,
  ChannelNameXyz,
  ColorSpaceXyz,
  GamutMapMethod,
  KnownColorSpace,
} from 'sass';

import * as constructors from './constructors';

describe('Color 4 SassColors Non-parametizable', () => {
  describe('toGamut', () => {
    const cases: [
      SassColor,
      KnownColorSpace,
      Record<GamutMapMethod, SassColor>
    ][] = [
      [
        constructors.oklch(0.8, 2, 150),
        'display-p3',
        {
          'local-minde': constructors.oklch(
            0.8077756841698541,
            0.3262439045095262,
            148.12027402754507
          ),
          clip: constructors.oklch(
            0.848829286984103,
            0.3685278106366152,
            145.64495037017775
          ),
        },
      ],
      [
        constructors.oklch(0.8, 2, 150),
        'srgb',
        {
          'local-minde': constructors.oklch(
            0.809152570178515,
            0.23790275760347995,
            147.40214776873552
          ),
          clip: constructors.oklch(
            0.8664396115356694,
            0.2948272403370167,
            142.49533888780996
          ),
        },
      ],
    ];

    for (const [input, space, outputs] of cases) {
      describe(`with space ${space}`, () => {
        for (const [method, output] of Object.entries(outputs)) {
          it(`with method ${method}`, () => {
            expect(
              input.toGamut({space, method: method as GamutMapMethod})
            ).toLooselyEqualColor(output);
          });
        }
      });
    }
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
