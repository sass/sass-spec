// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

// General space-specific info and construction

import {SassColor} from 'sass';
import type {ChannelNameXyz, ColorSpaceXyz, KnownColorSpace} from 'sass';
import {List} from 'immutable';

import {spaces} from './spaces';
import {channelCases, channelNames} from './utils';
import {skipForImpl} from '../../utils';

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

      // TODO(sass#3654) Failing in dart-sass pending:
      // https://github.com/sass/sass/issues/3654
      skipForImpl('dart-sass', () => {
        describe('isChannelPowerless', () => {
          function checkPowerless(
            _color: SassColor,
            powerless = [false, false, false]
          ) {
            it(`channels ${_color.channels.toArray()} is ${powerless}`, () => {
              expect(_color.isChannelPowerless(space.channels[0])).toBe(
                powerless[0]
              );
              expect(_color.isChannelPowerless(space.channels[1])).toBe(
                powerless[1]
              );
              expect(_color.isChannelPowerless(space.channels[2])).toBe(
                powerless[2]
              );
            });
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
                // hsl- If the saturation of an HSL color is 0%, then the hue component is powerless.
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

              case 'lch':
              case 'oklch':
                // (ok)lch- If the `chroma` value is 0%, then the `hue` channel is powerless.
                checkPowerless(space.constructor(ch1[0], 0, ch3[0]), [
                  false,
                  false,
                  true,
                ]);
                checkPowerless(space.constructor(ch1[0], 0, ch3[1]), [
                  false,
                  false,
                  true,
                ]);
                checkPowerless(space.constructor(ch1[1], 0, ch3[1]), [
                  false,
                  false,
                  true,
                ]);
                checkPowerless(space.constructor(ch1[1], 0, ch3[0]), [
                  false,
                  false,
                  true,
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
      });
    });
  });
});
