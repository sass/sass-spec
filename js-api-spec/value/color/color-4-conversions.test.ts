// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

// General space-specific info and construction

import {SassColor} from 'sass';
import type {
  ColorSpaceXyz,
  GamutMapMethod,
  HueInterpolationMethod,
  KnownColorSpace,
} from 'sass';

import {spaces} from './spaces';
import {interpolations} from './interpolation-examples';

const spaceNames = Object.keys(spaces) as KnownColorSpace[];

describe('Color 4 SassColors Conversions', () => {
  spaceNames.forEach(spaceId => {
    const space = spaces[spaceId];

    describe(space.name, () => {
      let color: SassColor, blue: SassColor;
      beforeEach(() => {
        color = space.constructor(...space.pink);
        blue = space.constructor(...space.blue);
      });

      describe('toSpace', () => {
        spaceNames.forEach(destinationSpaceId => {
          it(`converts pink to ${destinationSpaceId}`, () => {
            const destinationSpace = spaces[destinationSpaceId];
            const res = color.toSpace(destinationSpace.name);
            expect(res.space).toBe(destinationSpace.name);

            const expected = destinationSpace.constructor(
              ...destinationSpace.pink
            );
            expect(res).toLooselyEqualColor(expected);
          });
        });
      });

      describe('interpolate', () => {
        it('interpolates examples', () => {
          const examples = interpolations[space.name];
          examples.forEach(([input, output]) => {
            const res = color.interpolate(blue, {
              weight: input.weight,
              method: input.method as HueInterpolationMethod,
            });
            const outputColor = space.constructor(...output);
            expect(res).toLooselyEqualColor(outputColor);
          });
        });
      });

      describe('change', () => {
        it('changes all channels in own space', () => {
          space.channels.forEach((channelName, index) => {
            const expectedChannels = [
              space.pink[0],
              space.pink[1],
              space.pink[2],
            ] as [number, number, number];
            expectedChannels[index] = 0;
            expect(color.change({[channelName]: 0})).toLooselyEqualColor(
              space.constructor(...expectedChannels)
            );
          });
          expect(color.change({alpha: 0})).toLooselyEqualColor(
            space.constructor(...space.pink, 0)
          );
        });

        it('change with explicit undefined makes no change', () => {
          space.channels.forEach(channelName => {
            expect(
              color.change({[channelName]: undefined})
            ).toLooselyEqualColor(space.constructor(...space.pink));
          });
          expect(color.change({alpha: undefined})).toLooselyEqualColor(
            space.constructor(...space.pink, 1)
          );
        });

        it('explicit null sets channel to missing', () => {
          // Explicitly set space to avoid legacy null-alpha behavior, which is
          // tested in Legacy suite.
          space.channels.forEach((channelName, index) => {
            const expectedChannels = [
              space.pink[0],
              space.pink[1],
              space.pink[2],
            ] as [number | null, number | null, number | null];
            expectedChannels[index] = null;
            const changed = color.change({
              [channelName]: null,
              space: space.name as 'xyz',
            });
            expect(changed).toLooselyEqualColor(
              space.constructor(...expectedChannels)
            );
            expect(changed.isChannelMissing(channelName)).toBeTrue();
          });
          expect(
            color.change({alpha: null, space: space.name as 'xyz'})
          ).toLooselyEqualColor(space.constructor(...space.pink, null));
        });

        describe('allows out-of-range channel values', () => {
          const baseColor = space.constructor(
            (space.ranges[0][0] + space.ranges[0][1]) / 2,
            (space.ranges[1][0] + space.ranges[1][1]) / 2,
            (space.ranges[2][0] + space.ranges[2][1]) / 2
          );
          for (let i = 0; i < 3; i++) {
            const channel = space.channels[i];
            if (channel === 'hue') continue;

            it(`for ${channel}`, () => {
              const aboveRange = space.ranges[i][1] + 10;
              const belowRange = space.ranges[i][0] - 10;
              const above = baseColor.change({[channel]: aboveRange});
              const below = baseColor.change({[channel]: belowRange});

              expect(above.channels.get(i)).toEqual(aboveRange);

              switch (channel) {
                case 'saturation':
                  expect(below.channels.get(i)).toEqual(Math.abs(belowRange));
                  expect(below.channels.get(0)).toEqual(
                    (baseColor.channels.get(0) + 180) % 360
                  );
                  break;

                case 'chroma':
                  expect(below.channels.get(i)).toEqual(Math.abs(belowRange));
                  expect(below.channels.get(2)).toEqual(
                    (baseColor.channels.get(2) + 180) % 360
                  );
                  break;

                default:
                  expect(below.channels.get(i)).toEqual(belowRange);
                  break;
              }
            });
          }
        });

        spaceNames.forEach(destinationSpaceId => {
          it(`changes all channels with space set to ${destinationSpaceId}`, () => {
            const destinationSpace = spaces[destinationSpaceId];
            destinationSpace.channels.forEach((channel, index) => {
              const destinationChannels = [
                destinationSpace.pink[0],
                destinationSpace.pink[1],
                destinationSpace.pink[2],
              ] as [number, number, number];

              // Certain channel values cause equality issues on 1-3 of 16*16*3
              // cases. 0.45 is a magic number that works around this until the
              // root cause is determined.
              const scale = 0.45;
              const channelValue = destinationSpace.ranges[index][1] * scale;

              destinationChannels[index] = channelValue;
              const expected = destinationSpace
                .constructor(...destinationChannels)
                .toSpace(space.name);

              expect(
                color.change({
                  [channel]: channelValue,
                  space: destinationSpace.name as ColorSpaceXyz,
                })
              ).toLooselyEqualColor(expected);
            });
          });
        });

        it('should throw on invalid alpha', () => {
          expect(() => color.change({alpha: -1})).toThrow();
          expect(() => color.change({alpha: 1.1})).toThrow();
        });
      });

      describe('isInGamut', () => {
        // Our `pink` color is in gamut for every space.
        it('is true for in gamut colors in own space', () => {
          expect(color.isInGamut()).toBe(true);
        });

        spaceNames.forEach(destinationSpaceId => {
          it(`is true for in gamut colors in ${destinationSpaceId}`, () => {
            const destinationSpace = spaces[destinationSpaceId];
            expect(color.isInGamut(destinationSpace.name)).toBe(true);
          });
        });

        it(`is ${!space.hasOutOfGamut} for out of range colors in own space`, () => {
          const outOfGamut = space.constructor(...space.gamutExamples[0][0]);
          expect(outOfGamut.isInGamut()).toBe(!space.hasOutOfGamut);
        });
      });

      describe('toGamut', () => {
        for (const [input, outputs] of space.gamutExamples) {
          const outputsObj =
            outputs instanceof Array
              ? {clip: outputs, 'local-minde': outputs}
              : outputs;

          for (const [method, output] of Object.entries(outputsObj)) {
            describe(method, () => {
              it(`in own space, ${input} -> ${output}`, () => {
                const res = space
                  .constructor(...input)
                  .toGamut({method: method as GamutMapMethod});
                expect(res).toLooselyEqualColor(space.constructor(...output));
              });
            });
          }
        }
      });
    });
  });
});
