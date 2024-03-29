// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

// General space-specific info and construction

import {Value, SassColor} from 'sass';
import type {KnownColorSpace} from 'sass';

import {spaces} from './spaces';

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

      describe('allows out-of-range channel values', () => {
        const average1 = (space.ranges[0][0] + space.ranges[0][1]) / 2;
        const average2 = (space.ranges[1][0] + space.ranges[1][1]) / 2;
        const average3 = (space.ranges[2][0] + space.ranges[2][1]) / 2;
        for (let i = 0; i < 3; i++) {
          const channel = space.channels[i];
          if (channel === 'hue') continue;

          it(`for ${channel}`, () => {
            const aboveRange = space.ranges[i][1] + 10;
            const belowRange = space.ranges[i][0] - 10;
            const above = space.constructor(
              i === 0 ? aboveRange : average1,
              i === 1 ? aboveRange : average2,
              i === 2 ? aboveRange : average3
            );
            const below = space.constructor(
              i === 0 ? belowRange : average1,
              i === 1 ? belowRange : average2,
              i === 2 ? belowRange : average3
            );

            expect(above.channels.get(i)).toEqual(aboveRange);

            switch (channel) {
              case 'saturation':
                expect(below.channels.get(i)).toEqual(Math.abs(belowRange));
                expect(below.channels.get(0)).toEqual((average1 + 180) % 360);
                break;

              case 'chroma':
                expect(below.channels.get(i)).toEqual(Math.abs(belowRange));
                expect(below.channels.get(2)).toEqual((average3 + 180) % 360);
                break;

              default:
                expect(below.channels.get(i)).toEqual(belowRange);
                break;
            }
          });
        }
      });

      it('throws on invalid alpha', () => {
        expect(() => {
          space.constructor(...space.pink, -1);
        }).toThrow();
        expect(() => {
          space.constructor(...space.pink, 1.1);
        }).toThrow();
      });

      it(`returns name for ${space.name}`, () => {
        expect(color.space).toBe(space.name);
      });

      it(`isLegacy returns ${space.isLegacy} for ${space.name}`, () => {
        expect(color.isLegacy).toBe(space.isLegacy);
      });
    });
  });
});
