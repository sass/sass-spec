// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import type {ChannelName} from 'sass';
// Given a series of channels, returns an array of channels with a variety of
// nulls and alpha values.
export function channelCases(ch1: number, ch2: number, ch3: number) {
  return [
    [ch1, ch2, ch3],
    [null, ch2, ch3],
    [null, null, ch3],
    [ch1, null, ch3],
    [ch1, null, null],
    [ch1, ch2, null],
    [null, ch2, null],
    [null, null, null],
  ].flatMap(channels => [
    channels,
    [...channels, 1],
    [...channels, 0],
    [...channels, 0.5],
    [...channels, null],
  ]) as [
    [number | null, number | null, number | null, number | null | undefined]
  ];
}

export const channelNames: ChannelName[] = [
  'red',
  'green',
  'blue',
  'hue',
  'saturation',
  'lightness',
  'whiteness',
  'blackness',
  'a',
  'b',
  'x',
  'y',
  'z',
  'chroma',
];
