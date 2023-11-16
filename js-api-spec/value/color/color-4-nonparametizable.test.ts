// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

// Tests that can't be generally parameterized

import {SassColor} from 'sass';
import type {
  ChannelName,
  ChannelNameXyz,
  ColorSpaceXyz,
  KnownColorSpace,
} from 'sass';

import {skipForImpl} from '../../utils';
import * as constructors from './constructors';

describe('Color 4 SassColors Non-parametizable', () => {
  // TODO: Waiting on new ColorJS release to fix `toGamut` mapping:
  // https://github.com/LeaVerou/color.js/pull/344
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
        expect(input.toGamut(space)).toLooselyEqualColor(output);
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
