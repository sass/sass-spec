// Copyright 2023 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import * as constructors from './constructors';
import type {Constructor} from './constructors';
import type {
  ChannelName,
  ChannelNameHsl,
  ChannelNameHwb,
  ChannelNameLab,
  ChannelNameLch,
  ChannelNameRgb,
  ChannelNameXyz,
  GamutMapMethod,
  KnownColorSpace,
} from 'sass';

export const spaces: {
  [key: string]: {
    constructor: Constructor;
    name: KnownColorSpace;
    isLegacy: boolean;
    isPolar: boolean;
    // `pink` is an arbitrary color, and is a value that can roundtrip between
    // all spaces.
    pink: [number, number, number];
    // `blue` is an arbitrary color.
    blue: [number, number, number];
    channels: ChannelName[];
    ranges: [number, number][];
    hasPowerless?: boolean;
    hasOutOfGamut: boolean;
    // input, output in own space, output in p3
    gamutExamples: Array<
      [
        [number, number, number],
        (
          | [number, number, number]
          | Record<GamutMapMethod, [number, number, number]>
        )
      ]
    >;
  };
} = {
  lab: {
    constructor: constructors.lab,
    name: 'lab',
    isLegacy: false,
    isPolar: false,
    pink: [78.27047872644108, 35.20288139978972, 1.0168442562641822],
    blue: [38.957924659568256, -15.169546354833418, -17.792483560001216],
    channels: ['lightness', 'a', 'b'] as ChannelNameLab[],
    ranges: [
      [0, 100],
      [-125, 125],
      [-125, 125],
    ],
    hasOutOfGamut: false,
    gamutExamples: [
      [
        [50, 150, 150],
        [50, 150, 150],
      ],
    ],
  },
  oklab: {
    constructor: constructors.oklab,
    name: 'oklab',
    isLegacy: false,
    isPolar: false,
    pink: [0.8241000051752044, 0.10608808769190603, 0.0015900461037656743],
    blue: [0.47120000698576636, -0.05111706553856424, -0.048406668724564006],
    channels: ['lightness', 'a', 'b'] as ChannelNameLab[],
    ranges: [
      [0, 1],
      [-0.4, 0.4],
      [-0.4, 0.4],
    ],
    hasOutOfGamut: false,
    gamutExamples: [
      [
        [0.5, 1, 1],
        [0.5, 1, 1],
      ],
    ],
  },
  lch: {
    constructor: constructors.lch,
    name: 'lch',
    isLegacy: false,
    isPolar: true,
    pink: [78.27047872644108, 35.21756424128674, 1.6545432253797117],
    blue: [38.957924659568256, 23.381351711232465, 229.54969639237788],
    channels: ['lightness', 'chroma', 'hue'] as ChannelNameLch[],
    hasPowerless: true,
    ranges: [
      [0, 100],
      [0, 150],
      [0, 360],
    ],
    hasOutOfGamut: false,
    gamutExamples: [
      [
        [50, 200, 480],
        [50, 200, 480],
      ],
    ],
  },
  oklch: {
    constructor: constructors.oklch,
    name: 'oklch',
    isLegacy: false,
    isPolar: true,
    pink: [0.8241000051752044, 0.1061000028121472, 0.8586836854624949],
    blue: [0.47120000698576636, 0.07039999976053661, 223.44001107929404],
    channels: ['lightness', 'chroma', 'hue'] as ChannelNameLch[],
    hasPowerless: true,
    ranges: [
      [0, 1],
      [0, 0.4],
      [0, 360],
    ],
    hasOutOfGamut: false,
    gamutExamples: [
      [
        [0.5, 1, 480],
        [0.5, 1, 480],
      ],
    ],
  },
  srgb: {
    constructor: constructors.srgb,
    name: 'srgb',
    isLegacy: false,
    isPolar: false,
    pink: [0.9999785463111587, 0.6599448662991679, 0.7583730171250161],
    blue: [0.14900142239759614, 0.39063941586401707, 0.47119722379126755],
    channels: ['red', 'green', 'blue'] as ChannelNameRgb[],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    hasOutOfGamut: true,
    gamutExamples: [
      [[0.5, 2, 2], {clip: [0.5, 1, 1], 'local-minde': [1, 1, 1]}],
    ],
  },
  'srgb-linear': {
    constructor: constructors.srgbLinear,
    name: 'srgb-linear',
    isLegacy: false,
    isPolar: false,
    pink: [0.9999511960945082, 0.39305038114762536, 0.5356603778005656],
    blue: [0.019378214827482948, 0.12640222770203852, 0.18834349393523495],
    channels: ['red', 'green', 'blue'] as ChannelNameRgb[],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    hasOutOfGamut: true,
    gamutExamples: [
      [[0.5, 2, 2], {clip: [0.5, 1, 1], 'local-minde': [1, 1, 1]}],
    ],
  },
  'display-p3': {
    constructor: constructors.displayP3,
    name: 'display-p3',
    isLegacy: false,
    isPolar: false,
    pink: [0.9510333333617188, 0.6749909745845027, 0.7568568353546361],
    blue: [0.21620126176161275, 0.38537730537965537, 0.46251697991685353],
    channels: ['red', 'green', 'blue'] as ChannelNameRgb[],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    hasOutOfGamut: true,
    gamutExamples: [
      [[0.5, 2, 2], {clip: [0.5, 1, 1], 'local-minde': [1, 1, 1]}],
    ],
  },
  'display-p3-linear': {
    constructor: constructors.displayP3Linear,
    name: 'display-p3-linear',
    isLegacy: false,
    isPolar: false,
    pink: [0.8922032202231888, 0.41319596748178294, 0.5332670876259182],
    blue: [0.038379047373520256, 0.12284965133685266, 0.18097273332077757],
    channels: ['red', 'green', 'blue'] as ChannelNameRgb[],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    hasOutOfGamut: true,
    gamutExamples: [
      [[0.5, 2, 2], {clip: [0.5, 1, 1], 'local-minde': [1, 1, 1]}],
    ],
  },
  'a98-rgb': {
    constructor: constructors.a98Rgb,
    name: 'a98-rgb',
    isLegacy: false,
    isPolar: false,
    pink: [0.9172837001828322, 0.6540226622083833, 0.749114439711684],
    blue: [0.2557909283504703, 0.3904466064332277, 0.4651826475952292],
    channels: ['red', 'green', 'blue'] as ChannelNameRgb[],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    hasOutOfGamut: true,
    gamutExamples: [
      [[0.5, 2, 2], {clip: [0.5, 1, 1], 'local-minde': [1, 1, 1]}],
    ],
  },
  'prophoto-rgb': {
    constructor: constructors.prophotoRgb,
    name: 'prophoto-rgb',
    isLegacy: false,
    isPolar: false,
    pink: [0.842345736209146, 0.6470539622987259, 0.7003583323790157],
    blue: [0.24317987809516806, 0.304508209543027, 0.3835687899657161],
    channels: ['red', 'green', 'blue'] as ChannelNameRgb[],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    hasOutOfGamut: true,
    gamutExamples: [
      [[0.5, 2, 2], {clip: [0.5, 1, 1], 'local-minde': [1, 1, 1]}],
    ],
  },
  rec2020: {
    constructor: constructors.rec2020,
    name: 'rec2020',
    isLegacy: false,
    isPolar: false,
    pink: [0.883711832123552, 0.6578067923850561, 0.7273197917658352],
    blue: [0.21511227405324085, 0.3236397315019512, 0.4090033869684574],
    channels: ['red', 'green', 'blue'] as ChannelNameRgb[],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    hasOutOfGamut: true,
    gamutExamples: [
      [[0.5, 2, 2], {clip: [0.5, 1, 1], 'local-minde': [1, 1, 1]}],
    ],
  },
  xyz: {
    constructor: constructors.xyz,
    name: 'xyz',
    isLegacy: false,
    isPolar: false,
    pink: [0.6495957411726918, 0.5323965129525022, 0.575341840710865],
    blue: [0.08718323686632441, 0.1081164314257634, 0.19446762910683627],
    channels: ['x', 'y', 'z'] as ChannelNameXyz[],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    hasOutOfGamut: false,
    gamutExamples: [
      [
        [0.5, 2, 2],
        [0.5, 2, 2],
      ],
    ],
  },
  'xyz-d50': {
    constructor: constructors.xyzD50,
    name: 'xyz-d50',
    isLegacy: false,
    isPolar: false,
    pink: [0.6640698533004004, 0.5367266625281086, 0.43459582467202973],
    blue: [0.08408207405980274, 0.10634498282797152, 0.14703708427207543],
    channels: ['x', 'y', 'z'] as ChannelNameXyz[],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    hasOutOfGamut: false,
    gamutExamples: [
      [
        [0.5, 2, 2],
        [0.5, 2, 2],
      ],
    ],
  },
  'xyz-d65': {
    constructor: constructors.xyzD65,
    name: 'xyz',
    isLegacy: false,
    isPolar: false,
    pink: [0.6495957411726918, 0.5323965129525022, 0.575341840710865],
    blue: [0.08718323686632441, 0.1081164314257634, 0.19446762910683627],
    channels: ['x', 'y', 'z'] as ChannelNameXyz[],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    hasOutOfGamut: false,
    gamutExamples: [
      [
        [0.5, 2, 2],
        [0.5, 2, 2],
      ],
    ],
  },
  rgb: {
    constructor: constructors.rgb,
    name: 'rgb',
    isLegacy: true,
    isPolar: false,
    pink: [254.99452930934547, 168.28594090628783, 193.3851193668791],
    blue: [37.99536271138702, 99.61305104532435, 120.15529206677323],
    channels: ['red', 'green', 'blue'] as ChannelNameRgb[],
    ranges: [
      [0, 255],
      [0, 255],
      [0, 255],
    ],
    hasOutOfGamut: true,
    gamutExamples: [
      [
        [300, 300, 300],
        [255, 255, 255],
      ],
    ],
  },
  hsl: {
    constructor: constructors.hsl,
    name: 'hsl',
    isLegacy: true,
    isPolar: true,
    pink: [342.63204677447646, 99.98738302509679, 82.99617063051633],
    blue: [195.0016494775154, 51.95041997811069, 31.009932309443183],
    channels: ['hue', 'saturation', 'lightness'] as ChannelNameHsl[],
    hasPowerless: true,
    ranges: [
      [0, 360],
      [0, 100],
      [0, 100],
    ],
    hasOutOfGamut: true,
    gamutExamples: [
      [
        [0.5, 110, 50],
        {
          clip: [0.5, 100, 50],
          'local-minde': [2.9140266584158057, 100, 52.05146824961835],
        },
      ],
    ],
  },
  hwb: {
    constructor: constructors.hwb,
    name: 'hwb',
    isLegacy: true,
    isPolar: true,
    pink: [342.63204677447646, 65.9944866299168, 0.002145368884129084],
    blue: [195.0016494775154, 14.900142239759612, 52.880277620873244],
    channels: ['hue', 'whiteness', 'blackness'] as ChannelNameHwb[],
    hasPowerless: true,
    ranges: [
      [0, 360],
      [0, 100],
      [0, 100],
    ],
    hasOutOfGamut: true,
    gamutExamples: [
      [
        [0.5, -3, -7],
        {
          clip: [0.5, 0, 0],
          'local-minde': [3.492122559065345, 11.266517197307957, 0],
        },
      ],
    ],
  },
};
