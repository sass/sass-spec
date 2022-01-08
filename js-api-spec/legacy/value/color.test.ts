// Copyright 2022 Google LLC. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import * as sass from 'sass';

import {skipForImpl} from '../../utils';
import {parseValue} from './utils';

skipForImpl('sass-embedded', () => {
  describe('from a parameter', () => {
    let color: sass.types.Color;
    beforeEach(() => {
      color = parseValue('rgba(42, 84, 126, 0.42)', sass.types.Color);
    });

    it('provides access to its channels', () => {
      expect(color.getR()).toBe(42);
      expect(color.getG()).toBe(84);
      expect(color.getB()).toBe(126);
      expect(color.getA()).toBe(0.42);
    });

    it('each channel can be set without affecting the original color', () =>
      expect(
        sass
          .renderSync({
            data: `
              a {
                $color: #abc;
                b: foo($color);
                c: $color;
              }
            `,
            functions: {
              'foo($color)': arg => {
                const color = arg as sass.types.Color;
                color.setR(11);
                expect(color.getR()).toBe(11);
                color.setG(22);
                expect(color.getG()).toBe(22);
                color.setB(33);
                expect(color.getB()).toBe(33);
                color.setA(0.5);
                expect(color.getA()).toBe(0.5);
                return color;
              },
            },
          })
          .css.toString()
      ).toEqualIgnoringWhitespace('a { b: rgba(11, 22, 33, 0.5); c: #abc; }'));

    it('channels are clamped to the valid range', () => {
      color.setR(256);
      expect(color.getR()).toBe(255);
      color.setR(-1);
      expect(color.getR()).toBe(0);

      color.setG(256);
      expect(color.getG()).toBe(255);
      color.setG(-1);
      expect(color.getG()).toBe(0);

      color.setB(256);
      expect(color.getB()).toBe(255);
      color.setB(-1);
      expect(color.getB()).toBe(0);

      color.setA(1.01);
      expect(color.getA()).toBe(1.0);
      color.setA(-0.01);
      expect(color.getA()).toBe(0.0);
    });

    it('channels are rounded to the nearest int', () => {
      color.setR(0.4);
      expect(color.getR()).toBe(0);
      color.setR(0.5);
      expect(color.getR()).toBe(1);

      color.setG(0.4);
      expect(color.getG()).toBe(0);
      color.setG(0.5);
      expect(color.getG()).toBe(1);

      color.setB(0.4);
      expect(color.getB()).toBe(0);
      color.setB(0.5);
      expect(color.getB()).toBe(1);
    });

    it('has a useful .constructor.name', () =>
      expect(color.constructor.name).toBe('sass.types.Color'));
  });

  describe('from a constructor', () => {
    describe('with individual channels', () => {
      it('is a color with the given channels', () => {
        const color = new sass.types.Color(11, 12, 13, 0.42);
        expect(color).toBeInstanceOf(sass.types.Color);
        expect(color.getR()).toBe(11);
        expect(color.getG()).toBe(12);
        expect(color.getB()).toBe(13);
        expect(color.getA()).toBe(0.42);
      });

      it('the alpha channel defaults to 1', () =>
        expect(new sass.types.Color(11, 12, 13).getA()).toBe(1.0));
    });

    it('with an ARGB hex value, is a color with the given channels', () => {
      const color = new sass.types.Color(0x12345678);
      expect(color).toBeInstanceOf(sass.types.Color);
      expect(color.getR()).toBe(0x34);
      expect(color.getG()).toBe(0x56);
      expect(color.getB()).toBe(0x78);
      expect(color.getA()).toBe(0x12 / 0xff);
    });

    it('has a useful .constructor.name', () =>
      expect(new sass.types.Color(11, 12, 13).constructor.name).toBe(
        'sass.types.Color'
      ));
  });
});
