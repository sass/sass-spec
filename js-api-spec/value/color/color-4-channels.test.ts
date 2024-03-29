// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

// General space-specific info and construction

import {SassColor} from 'sass';
import type {ChannelNameXyz, ColorSpaceXyz, KnownColorSpace} from 'sass';
import {List} from 'immutable';

import {spaces} from './spaces';
import {channelCases, channelNames} from './utils';

const spaceNames = Object.keys(spaces) as KnownColorSpace[];

describe('Color 4 SassColor Channels', () => {
  spaceNames.forEach(spaceId => {
    const space = spaces[spaceId];

    describe(space.name, () => {
      let color: SassColor;

      beforeEach(() => {
        color = space.constructor(...space.pink);
      });

      describe('channelsOrNull', () => {
        it('returns a list', () => {
          expect(color.channelsOrNull).toFuzzyEqualList(space.pink);
          expect(color.channelsOrNull.size).toBe(space.channels.length);
          expect(List.isList(color.channelsOrNull)).toBeTrue();
        });

        it('returns channel value or null, excluding alpha', () => {
          const pinkCases = channelCases(...space.pink);
          pinkCases.forEach(channels => {
            const _color = space.constructor(...channels);
            expect(_color.channelsOrNull).toFuzzyEqualList(
              channels.slice(0, 3)
            );
          });
        });
      });

      describe('channels', () => {
        it('returns a list', () => {
          expect(color.channels).toFuzzyEqualList(space.pink);
          expect(color.channels.size).toBe(space.channels.length);
          expect(List.isList(color.channels)).toBeTrue();
        });

        it('returns channel value or 0, excluding alpha', () => {
          const pinkCases = channelCases(...space.pink);
          pinkCases.forEach(channels => {
            const expected = channels.slice(0, 3).map(channel => channel || 0);
            const _color = space.constructor(...channels);
            expect(_color.channels).toFuzzyEqualList(expected);
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
          it('throws an error if channel not in space', () => {
            const channelsNotInSpace = new Set(channelNames);
            space.channels.forEach(channel =>
              channelsNotInSpace.delete(channel)
            );
            channelsNotInSpace.forEach(channel => {
              expect(() => color.channel(channel)).toThrow();
            });
          });

          it('returns value if no space specified', () => {
            space.channels.forEach((channel, index) => {
              expect(color.channel(channel)).toFuzzyEqual(space.pink[index]);
            });
            expect(color.channel('alpha')).toEqual(1);
          });

          it('returns 0 for missing channels', () => {
            const nullColor = space.constructor(null, null, null, null);
            space.channels.forEach(channel => {
              expect(nullColor.channel(channel)).toEqual(0);
            });
            expect(nullColor.channel('alpha')).toEqual(0);
          });
        });

        describe('with space specified', () => {
          spaceNames.forEach(destinationSpaceId => {
            it(`throws an error if channel not in ${destinationSpaceId}`, () => {
              const destinationSpace = spaces[destinationSpaceId];
              const channelsNotInSpace = new Set(channelNames);
              destinationSpace.channels.forEach(channel =>
                channelsNotInSpace.delete(channel)
              );
              channelsNotInSpace.forEach(channel => {
                expect(() =>
                  color.channel(channel as ChannelNameXyz, {
                    space: destinationSpace.name as ColorSpaceXyz,
                  })
                ).toThrow();
              });
            });
          });

          spaceNames.forEach(destinationSpaceId => {
            it(`returns value when ${destinationSpaceId} is specified`, () => {
              const destinationSpace = spaces[destinationSpaceId];
              destinationSpace.channels.forEach((channel, index) => {
                expect(
                  color.channel(channel as ChannelNameXyz, {
                    space: destinationSpace.name as ColorSpaceXyz,
                  })
                ).toLooselyEqual(destinationSpace.pink[index]);
              });
              expect(
                color.channel('alpha' as ChannelNameXyz, {
                  space: destinationSpace.name as ColorSpaceXyz,
                })
              ).toEqual(1);
            });
          });
        });
      });

      describe('alpha', () => {
        it('returns value if set', () => {
          function colorWithAlpha(alpha: number | null) {
            return space.constructor(...space.pink, alpha);
          }
          expect(colorWithAlpha(0).alpha).toBe(0);
          expect(colorWithAlpha(1).alpha).toBe(1);
          expect(colorWithAlpha(0.5).alpha).toBe(0.5);
        });

        it('returns 1 if not set', () => {
          const noAlphaColor = space.constructor(0, 0, 0);
          expect(noAlphaColor.alpha).toBe(1);
        });

        it('returns 0 if missing', () => {
          const noAlphaColor = space.constructor(0, 0, 0, null);
          expect(noAlphaColor.alpha).toBe(0);
        });
      });

      if (!['hsl', 'hwb', 'lch', 'oklch'].includes(spaceId)) {
        describe('isChannelPowerless', () => {
          const [range1, range2, range3] = space.ranges;
          checkPowerless(space.constructor(range1[0], range2[0], range3[0]));
          checkPowerless(space.constructor(range1[1], range2[0], range3[0]));
          checkPowerless(space.constructor(range1[1], range2[1], range3[0]));
          checkPowerless(space.constructor(range1[1], range2[1], range3[1]));
          checkPowerless(space.constructor(range1[0], range2[1], range3[1]));
          checkPowerless(space.constructor(range1[0], range2[0], range3[1]));
          checkPowerless(space.constructor(range1[1], range2[0], range3[1]));
          checkPowerless(space.constructor(range1[0], range2[1], range3[0]));
        });
      }
    });
  });

  describe('isChannelPowerless', () => {
    describe('for HWB', () => {
      // If the combined `whiteness + blackness` is great than or equal to
      // `100%`, then the `hue` channel is powerless.
      checkPowerless(
        new SassColor({hue: 0, whiteness: 0, blackness: 100, space: 'hwb'}),
        [true, false, false]
      );
      checkPowerless(
        new SassColor({hue: 0, whiteness: 100, blackness: 0, space: 'hwb'}),
        [true, false, false]
      );
      checkPowerless(
        new SassColor({hue: 0, whiteness: 50, blackness: 50, space: 'hwb'}),
        [true, false, false]
      );
      checkPowerless(
        new SassColor({hue: 0, whiteness: 60, blackness: 60, space: 'hwb'}),
        [true, false, false]
      );
      checkPowerless(
        new SassColor({hue: 0, whiteness: -100, blackness: 200, space: 'hwb'}),
        [true, false, false]
      );
      checkPowerless(
        new SassColor({hue: 0, whiteness: 200, blackness: -100, space: 'hwb'}),
        [true, false, false]
      );
      checkPowerless(
        new SassColor({hue: 100, whiteness: 0, blackness: 100, space: 'hwb'}),
        [true, false, false]
      );

      checkPowerless(
        new SassColor({hue: 0, whiteness: 0, blackness: 0, space: 'hwb'})
      );
      checkPowerless(
        new SassColor({hue: 0, whiteness: 49, blackness: 50, space: 'hwb'})
      );
      checkPowerless(
        new SassColor({hue: 0, whiteness: -1, blackness: 100, space: 'hwb'})
      );
      checkPowerless(
        new SassColor({hue: 100, whiteness: 0, blackness: 0, space: 'hwb'})
      );
    });

    describe('for HSL', () => {
      // If the saturation of an HSL color is 0%, then the hue component is
      // powerless.
      checkPowerless(
        new SassColor({hue: 0, saturation: 0, lightness: 0, space: 'hsl'}),
        [true, false, false]
      );
      checkPowerless(
        new SassColor({hue: 0, saturation: 0, lightness: 100, space: 'hsl'}),
        [true, false, false]
      );
      checkPowerless(
        new SassColor({hue: 100, saturation: 0, lightness: 0, space: 'hsl'}),
        [true, false, false]
      );

      checkPowerless(
        new SassColor({hue: 0, saturation: 100, lightness: 0, space: 'hsl'})
      );
      checkPowerless(
        new SassColor({hue: 0, saturation: 100, lightness: 100, space: 'hsl'})
      );
      checkPowerless(
        new SassColor({hue: 100, saturation: 100, lightness: 100, space: 'hsl'})
      );
      checkPowerless(
        new SassColor({hue: 100, saturation: 100, lightness: 0, space: 'hsl'})
      );
    });

    describe('for LCH', () => {
      // If the `chroma` value is 0%, then the `hue` channel is powerless.
      checkPowerless(
        new SassColor({lightness: 0, chroma: 0, hue: 0, space: 'lch'}),
        [false, false, true]
      );
      checkPowerless(
        new SassColor({lightness: 0, chroma: 0, hue: 100, space: 'lch'}),
        [false, false, true]
      );
      checkPowerless(
        new SassColor({lightness: 100, chroma: 0, hue: 0, space: 'lch'}),
        [false, false, true]
      );

      checkPowerless(
        new SassColor({lightness: 0, chroma: 100, hue: 0, space: 'lch'})
      );
      checkPowerless(
        new SassColor({lightness: 0, chroma: 100, hue: 100, space: 'lch'})
      );
      checkPowerless(
        new SassColor({lightness: 100, chroma: 100, hue: 100, space: 'lch'})
      );
      checkPowerless(
        new SassColor({lightness: 100, chroma: 100, hue: 0, space: 'lch'})
      );
    });

    describe('for OKLCH', () => {
      // If the `chroma` value is 0%, then the `hue` channel is powerless.
      checkPowerless(
        new SassColor({lightness: 0, chroma: 0, hue: 0, space: 'oklch'}),
        [false, false, true]
      );
      checkPowerless(
        new SassColor({lightness: 0, chroma: 0, hue: 100, space: 'oklch'}),
        [false, false, true]
      );
      checkPowerless(
        new SassColor({lightness: 100, chroma: 0, hue: 0, space: 'oklch'}),
        [false, false, true]
      );

      checkPowerless(
        new SassColor({lightness: 0, chroma: 100, hue: 0, space: 'oklch'})
      );
      checkPowerless(
        new SassColor({lightness: 0, chroma: 100, hue: 100, space: 'oklch'})
      );
      checkPowerless(
        new SassColor({lightness: 100, chroma: 100, hue: 100, space: 'oklch'})
      );
      checkPowerless(
        new SassColor({lightness: 100, chroma: 100, hue: 0, space: 'oklch'})
      );
    });
  });
});

/**
 * Creates a test that checks that the powerless channels in `color` match the
 * expectation in `powerless`.
 */
function checkPowerless(
  color: SassColor,
  powerless = [false, false, false]
): void {
  it(`${color}: ${powerless}`, () => {
    const space = spaces[color.space]!;
    expect(color.isChannelPowerless(space.channels[0])).toBe(powerless[0]);
    expect(color.isChannelPowerless(space.channels[1])).toBe(powerless[1]);
    expect(color.isChannelPowerless(space.channels[2])).toBe(powerless[2]);
  });
}
