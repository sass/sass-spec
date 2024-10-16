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
            0.8077756760084225,
            0.32624391948277537,
            148.1202761637585
          ),
          clip: constructors.oklch(
            0.8488292928532466,
            0.3685277976813825,
            145.64495558662838
          ),
        },
      ],
      [
        constructors.oklch(0.8, 2, 150),
        'srgb',
        {
          'local-minde': constructors.oklch(
            0.809152561530627,
            0.23790276994468387,
            147.40215048389234
          ),
          clip: constructors.oklch(
            0.8664396175234368,
            0.2948272245426958,
            142.4953450414439
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
