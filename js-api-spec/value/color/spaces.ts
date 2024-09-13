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
    pink: [78.27047872644108, 35.20288139978972, 1.0168442562642044],
    blue: [38.95792456574883, -15.169549415088856, -17.792484605053115],
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
    pink: [0.8241000000000002, 0.10608808442731632, 0.0015900762693974446],
    blue: [0.47120000400818335, -0.05111706453373946, -0.048406651029280656],
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
    pink: [78.27047872644108, 35.21756424128674, 1.6545432253797676],
    blue: [38.957924566, 23.38135449889311, 229.54969234595737],
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
    pink: [0.8241, 0.1061, 0.8587],
    blue: [0.47120000400818335, 0.07039998686375618, 223.44000118475142],
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
    pink: [0.9999785463111585, 0.6599448662991679, 0.758373017125016],
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
    pink: [0.999951196094508, 0.3930503811476254, 0.5356603778005655],
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
    pink: [0.9510333333617188, 0.6749909745845027, 0.7568568353546363],
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
  'a98-rgb': {
    constructor: constructors.a98Rgb,
    name: 'a98-rgb',
    isLegacy: false,
    isPolar: false,
    pink: [0.9172837001828321, 0.6540226622083835, 0.7491144397116841],
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
    pink: [0.842345736209146, 0.6470539622987257, 0.7003583323790157],
    blue: [0.24317903319635056, 0.3045087255847488, 0.38356879501347535],
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
    pink: [0.8837118321235519, 0.6578067923850563, 0.7273197917658354],
    blue: [0.2151122740532409, 0.32363973150195124, 0.4090033869684574],
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
    pink: [0.6640698533004002, 0.5367266625281085, 0.4345958246720296],
    blue: [0.08408207011375313, 0.10634498228480066, 0.1470370877550857],
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
    pink: [254.9945293093454, 168.28594090628783, 193.38511936687908],
    blue: [38.144364133784602, 100.003690461188378, 120.626489290564506],
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
    pink: [342.63204677447646, 99.98738302509669, 82.99617063051632],
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
          'local-minde': [2.9140262667, 100, 52.0514687465],
        },
      ],
    ],
  },
  hwb: {
    constructor: constructors.hwb,
    name: 'hwb',
    isLegacy: true,
    isPolar: true,
    pink: [342.63204677447646, 65.99448662991679, 0.002145368884157506],
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
        {clip: [0.5, 0, 0], 'local-minde': [3.4921217446, 11.2665189221, 0]},
      ],
    ],
  },
};
