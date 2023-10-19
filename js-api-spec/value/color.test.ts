// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

import {Value, SassColor} from 'sass';
import type {
  ChannelName,
  ChannelNameHsl,
  ChannelNameHwb,
  ChannelNameLab,
  ChannelNameLch,
  ChannelNameRgb,
  ChannelNameXyz,
  ColorSpaceXyz,
  HueInterpolationMethod,
  KnownColorSpace,
} from 'sass';

import {skipForImpl, captureStdio} from '../utils';

/** A utility function for creating an RGB color without specifying a space. */
function legacyRGB(
  red: number,
  green: number,
  blue: number,
  alpha?: number
): SassColor {
  return new SassColor({red, green, blue, alpha});
}

/** A utility function for creating an RGB color. */
function rgb(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'rgb'});
}

/** A utility function for creating an HSL color without specifying a space. */
function legacyHsl(
  hue: number,
  saturation: number,
  lightness: number,
  alpha?: number
): SassColor {
  return new SassColor({hue, saturation, lightness, alpha});
}

/** A utility function for creating an HSL color. */
function hsl(
  hue: number | null,
  saturation: number | null,
  lightness: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({hue, saturation, lightness, alpha, space: 'hsl'});
}

/** A utility function for creating an HWB color without specifying a space. */
function legacyHwb(
  hue: number | null,
  whiteness: number | null,
  blackness: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({hue, whiteness, blackness, alpha});
}

/** A utility function for creating an HWB color. */
function hwb(
  hue: number | null,
  whiteness: number | null,
  blackness: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({hue, whiteness, blackness, alpha, space: 'hwb'});
}

/** A utility function for creating a Lab color. */
function lab(
  lightness: number | null,
  a: number | null,
  b: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({lightness, a, b, alpha, space: 'lab'});
}
/** A utility function for creating a Oklab color. */
function oklab(
  lightness: number | null,
  a: number | null,
  b: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({lightness, a, b, alpha, space: 'oklab'});
}
/** A utility function for creating an LCH color. */
function lch(
  lightness: number | null,
  chroma: number | null,
  hue: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({lightness, chroma, hue, alpha, space: 'lch'});
}
/** A utility function for creating a Oklab color. */
function oklch(
  lightness: number | null,
  chroma: number | null,
  hue: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({lightness, chroma, hue, alpha, space: 'oklch'});
}

/** A utility function for creating an srgb color. */
function srgb(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'srgb'});
}
/** A utility function for creating an srgb-linear color. */
function srgbLinear(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'srgb-linear'});
}
/** A utility function for creating an rec2020 color. */
function rec2020(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'rec2020'});
}
/** A utility function for creating an display-p3 color. */
function displayP3(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'display-p3'});
}
/** A utility function for creating an a98-rgb color. */
function a98Rgb(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'a98-rgb'});
}
/** A utility function for creating a prophoto-rgb color. */
function prophotoRgb(
  red: number | null,
  green: number | null,
  blue: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({red, green, blue, alpha, space: 'prophoto-rgb'});
}

/** A utility function for creating a xyz color. */
function xyz(
  x: number | null,
  y: number | null,
  z: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({x, y, z, alpha, space: 'xyz'});
}

/** A utility function for creating a xyz-d50 color. */
function xyzD50(
  x: number | null,
  y: number | null,
  z: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({x, y, z, alpha, space: 'xyz-d50'});
}

/** A utility function for creating a xyz-d65 color. */
function xyzD65(
  x: number | null,
  y: number | null,
  z: number | null,
  alpha?: number | null
): SassColor {
  return new SassColor({x, y, z, alpha, space: 'xyz-d65'});
}

type Constructor = (
  channel1: number | null,
  channel2: number | null,
  channel3: number | null,
  alpha?: number | null
) => SassColor;
const spaces: {
  [key: string]: {
    constructor: Constructor;
    name: KnownColorSpace;
    isLegacy: boolean;
    isPolar: boolean;
    pink: [number, number, number];
    blue: [number, number, number];
    channels: ChannelName[];
    ranges: [number, number][];
    hasPowerless?: boolean;
    hasOutOfGamut: boolean;
    // input, output in own space, output in p3
    gamutExamples: [[number, number, number], [number, number, number]][];
  };
} = {
  lab: {
    constructor: lab,
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
    constructor: oklab,
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
    constructor: lch,
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
    constructor: oklch,
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
    constructor: srgb,
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
      [
        [0.5, 2, 2],
        [1, 1, 1],
      ],
    ],
  },
  srgbLinear: {
    constructor: srgbLinear,
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
      [
        [0.5, 2, 2],
        [1, 1, 1],
      ],
    ],
  },
  displayP3: {
    constructor: displayP3,
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
      [
        [0.5, 2, 2],
        [1, 1, 1],
      ],
    ],
  },
  a98Rgb: {
    constructor: a98Rgb,
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
      [
        [0.5, 2, 2],
        [1, 1, 1],
      ],
    ],
  },
  prophotoRgb: {
    constructor: prophotoRgb,
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
      [
        [0.5, 2, 2],
        [1, 1, 1],
      ],
    ],
  },
  rec2020: {
    constructor: rec2020,
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
      [
        [0.5, 2, 2],
        [1, 1, 1],
      ],
    ],
  },
  xyz: {
    constructor: xyz,
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
  xyzD50: {
    constructor: xyzD50,
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
  xyzD65: {
    constructor: xyzD65,
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
    constructor: rgb,
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
    constructor: hsl,
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
    hasOutOfGamut: false,
    gamutExamples: [
      [
        [0.5, 100, 50],
        [0.5, 100, 50],
      ],
    ],
  },
  hwb: {
    constructor: hwb,
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
    hasOutOfGamut: false,
    gamutExamples: [
      [
        [0.5, 100, 50],
        [0.5, 100, 50],
      ],
    ],
  },
};

type InterpolationExample = [
  {weight: number; method?: string},
  [number, number, number]
];

const interpolations: {[space: string]: InterpolationExample[]} = {
  lab: [
    [
      {
        weight: 0.5,
      },
      [58.614201646094955, 10.016665992350433, -8.387820174394456],
    ],
    [
      {
        weight: 1,
      },
      [78.27047872644108, 35.20288139978972, 1.0168442562642044],
    ],
    [
      {
        weight: 0,
      },
      [38.95792456574883, -15.169549415088852, -17.792484605053115],
    ],
  ],
  oklab: [
    [
      {
        weight: 0.5,
      },
      [0.6476500020040917, 0.02748550994678843, -0.023408287379941606],
    ],
    [
      {
        weight: 1,
      },
      [0.8241000000000002, 0.10608808442731632, 0.0015900762693974446],
    ],
    [
      {
        weight: 0,
      },
      [0.47120000400818335, -0.05111706453373946, -0.048406651029280656],
    ],
  ],
  lch: [
    [
      {
        weight: 0.5,
      },
      [58.61420164622054, 29.299459370089924, 295.6021177856686],
    ],
    [
      {
        weight: 1,
      },
      [78.27047872644108, 35.21756424128674, 1.6545432253797685],
    ],
    [
      {
        weight: 0,
      },
      [38.957924566, 23.38135449889311, 229.5496923459574],
    ],
    [
      {
        weight: 0.5,
        method: 'shorter',
      },
      [58.61420164622054, 29.299459370089924, 295.6021177856686],
    ],
    [
      {
        weight: 0.5,
        method: 'longer',
      },
      [58.61420164622054, 29.299459370089924, 115.60211778566858],
    ],
    [
      {
        weight: 0.5,
        method: 'increasing',
      },
      [58.61420164622054, 29.299459370089924, 115.60211778566858],
    ],
    [
      {
        weight: 0.5,
        method: 'decreasing',
      },
      [58.61420164622054, 29.299459370089924, 295.6021177856686],
    ],
  ],
  oklch: [
    [
      {
        weight: 0.5,
      },
      [0.6476500020040917, 0.08824999343187809, 292.1493505923757],
    ],
    [
      {
        weight: 1,
      },
      [0.8241, 0.1061, 0.8586999999999989],
    ],
    [
      {
        weight: 0,
      },
      [0.47120000400818335, 0.07039998686375618, 223.4400011847514],
    ],
    [
      {
        weight: 0.5,
        method: 'shorter',
      },
      [0.6476500020040917, 0.08824999343187809, 292.1493505923757],
    ],
    [
      {
        weight: 0.5,
        method: 'longer',
      },
      [0.6476500020040917, 0.08824999343187809, 112.1493505923757],
    ],
    [
      {
        weight: 0.5,
        method: 'increasing',
      },
      [0.6476500020040917, 0.08824999343187809, 112.1493505923757],
    ],
    [
      {
        weight: 0.5,
        method: 'decreasing',
      },
      [0.6476500020040917, 0.08824999343187809, 292.1493505923757],
    ],
  ],
  srgb: [
    [
      {
        weight: 0.5,
      },
      [0.5744899843543774, 0.5252921410815925, 0.6147851204581418],
    ],
    [
      {
        weight: 1,
      },
      [0.9999785463111585, 0.6599448662991679, 0.758373017125016],
    ],
    [
      {
        weight: 0,
      },
      [0.14900142239759617, 0.39063941586401707, 0.47119722379126755],
    ],
  ],
  'srgb-linear': [
    [
      {
        weight: 0.5,
      },
      [0.5096647054609955, 0.25972630442483197, 0.36200193586790025],
    ],
    [
      {
        weight: 1,
      },
      [0.999951196094508, 0.3930503811476254, 0.5356603778005655],
    ],
    [
      {
        weight: 0,
      },
      [0.01937821482748292, 0.12640222770203852, 0.18834349393523497],
    ],
  ],
  'display-p3': [
    [
      {
        weight: 0.5,
      },
      [0.5836172975616658, 0.530184139982079, 0.609686907635745],
    ],
    [
      {
        weight: 1,
      },
      [0.9510333333617188, 0.6749909745845027, 0.7568568353546363],
    ],
    [
      {
        weight: 0,
      },
      [0.2162012617616128, 0.38537730537965537, 0.46251697991685353],
    ],
  ],
  'a98-rgb': [
    [
      {
        weight: 0.5,
      },
      [0.5865373142666512, 0.5222346343208055, 0.6071485436534567],
    ],
    [
      {
        weight: 1,
      },
      [0.9172837001828321, 0.6540226622083835, 0.7491144397116841],
    ],
    [
      {
        weight: 0,
      },
      [0.25579092835047035, 0.3904466064332277, 0.4651826475952292],
    ],
  ],
  'prophoto-rgb': [
    [
      {
        weight: 0.5,
      },
      [0.5427623847027483, 0.4757813439417372, 0.5419635636962455],
    ],
    [
      {
        weight: 1,
      },
      [0.842345736209146, 0.6470539622987257, 0.7003583323790157],
    ],
    [
      {
        weight: 0,
      },
      [0.2431790331963506, 0.3045087255847488, 0.38356879501347535],
    ],
  ],
  rec2020: [
    [
      {
        weight: 0.5,
      },
      [0.5494120530883964, 0.4907232619435038, 0.5681615893671463],
    ],
    [
      {
        weight: 1,
      },
      [0.8837118321235519, 0.6578067923850563, 0.7273197917658354],
    ],
    [
      {
        weight: 0,
      },
      [0.21511227405324085, 0.32363973150195124, 0.4090033869684574],
    ],
  ],
  xyz: [
    [
      {
        weight: 0.5,
      },
      [0.36838948901950813, 0.3202564721891328, 0.38490473490885063],
    ],
    [
      {
        weight: 1,
      },
      [0.6495957411726918, 0.5323965129525022, 0.575341840710865],
    ],
    [
      {
        weight: 0,
      },
      [0.08718323686632445, 0.10811643142576338, 0.19446762910683624],
    ],
  ],
  'xyz-d50': [
    [
      {
        weight: 0.5,
      },
      [0.3740759617070767, 0.3215358224064546, 0.2908164562135577],
    ],
    [
      {
        weight: 1,
      },
      [0.6640698533004002, 0.5367266625281085, 0.4345958246720296],
    ],
    [
      {
        weight: 0,
      },
      [0.08408207011375313, 0.10634498228480066, 0.14703708775508573],
    ],
  ],
  rgb: [
    [
      {
        weight: 0.5,
      },
      [146.56944672156501, 134.1448156837381, 157.00580432872178],
    ],
    [
      {
        weight: 1,
      },
      [254.9945293093454, 168.28594090628783, 193.38511936687908],
    ],
    [
      {
        weight: 0,
      },
      [38.14436413378462, 100.00369046118837, 120.62648929056449],
    ],
  ],
  hsl: [
    [
      {
        weight: 0.5,
      },
      [268.816848125996, 75.96890150160368, 57.00305146997975],
    ],
    [
      {
        weight: 1,
      },
      [342.6320467744765, 99.98738302509669, 82.99617063051632],
    ],
    [
      {
        weight: 0,
      },
      [195.00164947751546, 51.95041997811069, 31.009932309443187],
    ],
    [
      {
        weight: 0.5,
        method: 'shorter',
      },
      [268.816848125996, 75.96890150160368, 57.00305146997975],
    ],
    [
      {
        weight: 0.5,
        method: 'longer',
      },
      [448.816848125996, 75.96890150160368, 57.00305146997975],
    ],
    [
      {
        weight: 0.5,
        method: 'increasing',
      },
      [448.816848125996, 75.96890150160368, 57.00305146997975],
    ],
    [
      {
        weight: 0.5,
        method: 'decreasing',
      },
      [268.816848125996, 75.96890150160368, 57.00305146997975],
    ],
  ],
  hwb: [
    [
      {
        weight: 0.5,
      },
      [268.816848125996, 40.447314434838205, 26.4412114948787],
    ],
    [
      {
        weight: 1,
      },
      [342.6320467744765, 65.99448662991679, 0.002145368884157506],
    ],
    [
      {
        weight: 0,
      },
      [195.00164947751546, 14.90014223975961, 52.880277620873244],
    ],
    [
      {
        weight: 0.5,
        method: 'shorter',
      },
      [268.816848125996, 40.447314434838205, 26.4412114948787],
    ],
    [
      {
        weight: 0.5,
        method: 'longer',
      },
      [448.816848125996, 40.447314434838205, 26.4412114948787],
    ],
    [
      {
        weight: 0.5,
        method: 'increasing',
      },
      [448.816848125996, 40.447314434838205, 26.4412114948787],
    ],
    [
      {
        weight: 0.5,
        method: 'decreasing',
      },
      [268.816848125996, 40.447314434838205, 26.4412114948787],
    ],
  ],
  'xyz-d65': [
    [
      {
        weight: 0.5,
      },
      [0.36838948901950813, 0.3202564721891328, 0.38490473490885063],
    ],
    [
      {
        weight: 1,
      },
      [0.6495957411726918, 0.5323965129525022, 0.575341840710865],
    ],
    [
      {
        weight: 0,
      },
      [0.08718323686632445, 0.10811643142576338, 0.19446762910683624],
    ],
  ],
};

const spaceNames = Object.keys(spaces) as KnownColorSpace[];

const channelNames: ChannelName[] = [
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

function channelCases(ch1: number, ch2: number, ch3: number) {
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

fdescribe('SassColor', () => {
  describe('construction', () => {
    describe('type', () => {
      let color: SassColor;
      beforeEach(() => {
        color = legacyRGB(18, 52, 86);
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
    });

    describe('rgb()', () => {
      it('allows valid values', () => {
        expect(() => legacyRGB(0, 0, 0, 0)).not.toThrow();
        expect(() => legacyRGB(255, 255, 255, 1)).not.toThrow();
      });

      // TODO(#1828): Update these expectations
      xit('disallows invalid values', () => {
        expect(() => legacyRGB(-1, 0, 0, 0)).toThrow();
        expect(() => legacyRGB(0, -1, 0, 0)).toThrow();
        expect(() => legacyRGB(0, 0, -1, 0)).toThrow();
        expect(() => legacyRGB(0, 0, 0, -0.1)).toThrow();
        expect(() => legacyRGB(256, 0, 0, 0)).toThrow();
        expect(() => legacyRGB(0, 256, 0, 0)).toThrow();
        expect(() => legacyRGB(0, 0, 256, 0)).toThrow();
        expect(() => legacyRGB(0, 0, 0, 1.1)).toThrow();
      });

      // TODO(#1828): Update these expectations
      xit('rounds channels to the nearest integer', () => {
        expect(legacyRGB(0.1, 50.4, 90.3)).toEqualWithHash(
          legacyRGB(0, 50, 90)
        );
        expect(legacyRGB(-0.1, 50.5, 90.7)).toEqualWithHash(
          legacyRGB(0, 51, 91)
        );
      });

      describe('deprecations', () => {
        it('warns with null alpha and no space', () => {
          const stdio = captureStdio(() => {
            new SassColor({red: 1, green: 1, blue: 1, alpha: null});
          });
          expect(stdio.err).toMatch('null-alpha');
        });
        it("doesn't warn for undefined alpha and no space", () => {
          const stdio = captureStdio(() => {
            new SassColor({red: 1, green: 1, blue: 1, alpha: undefined});
          });
          expect(stdio.err).toBeEmptyString();
        });
        it("doesn't warn for no alpha and no space", () => {
          const stdio = captureStdio(() => {
            new SassColor({red: 1, green: 1, blue: 1});
          });
          expect(stdio.err).toBeEmptyString();
        });
        it("doesn't warn for undefined alpha and undefined space", () => {
          const stdio = captureStdio(() => {
            new SassColor({
              red: 1,
              green: 1,
              blue: 1,
              alpha: undefined,
              space: undefined,
            });
          });
          expect(stdio.err).toBeEmptyString();
        });
        it("doesn't warn for null alpha with space", () => {
          const stdio = captureStdio(() => {
            new SassColor({
              red: 1,
              green: 1,
              blue: 1,
              alpha: null,
              space: 'rgb',
            });
          });
          expect(stdio.err).toBeEmptyString();
        });
      });
    });

    describe('hsl()', () => {
      it('allows valid values', () => {
        expect(() => legacyHsl(0, 0, 0, 0)).not.toThrow();
        expect(() => legacyHsl(4320, 100, 100, 1)).not.toThrow();
      });

      it('disallows invalid values', () => {
        expect(() => legacyHsl(0, -0.1, 0, 0)).toThrow();
        expect(() => legacyHsl(0, 0, -0.1, 0)).toThrow();
        expect(() => legacyHsl(0, 0, 0, -0.1)).toThrow();
        expect(() => legacyHsl(0, 100.1, 0, 0)).toThrow();
        expect(() => legacyHsl(0, 0, 100.1, 0)).toThrow();
        expect(() => legacyHsl(0, 0, 0, 1.1)).toThrow();
      });

      describe('deprecations', () => {
        it('warns with null alpha and no space', () => {
          const stdio = captureStdio(() => {
            new SassColor({hue: 1, saturation: 1, lightness: 1, alpha: null});
          });
          expect(stdio.err).toMatch('null-alpha');
        });
        it("doesn't warn for undefined alpha and no space", () => {
          const stdio = captureStdio(() => {
            new SassColor({
              hue: 1,
              saturation: 1,
              lightness: 1,
              alpha: undefined,
            });
          });
          expect(stdio.err).toBeEmptyString();
        });
        it("doesn't warn for no alpha and no space", () => {
          const stdio = captureStdio(() => {
            new SassColor({hue: 1, saturation: 1, lightness: 1});
          });
          expect(stdio.err).toBeEmptyString();
        });
        it("doesn't warn for undefined alpha and undefined space", () => {
          const stdio = captureStdio(() => {
            new SassColor({
              hue: 1,
              saturation: 1,
              lightness: 1,
              alpha: undefined,
              space: undefined,
            });
          });
          expect(stdio.err).toBeEmptyString();
        });
        it("doesn't warn for null alpha with space", () => {
          const stdio = captureStdio(() => {
            new SassColor({
              hue: 1,
              saturation: 1,
              lightness: 1,
              alpha: null,
              space: 'hsl',
            });
          });
          expect(stdio.err).toBeEmptyString();
        });
      });
    });

    describe('hwb()', () => {
      it('allows valid values', () => {
        expect(() => legacyHwb(0, 0, 0, 0)).not.toThrow();
        expect(() => legacyHwb(4320, 100, 100, 1)).not.toThrow();
      });

      it('disallows invalid values', () => {
        expect(() => legacyHwb(0, -0.1, 0, 0)).toThrow();
        expect(() => legacyHwb(0, 0, -0.1, 0)).toThrow();
        expect(() => legacyHwb(0, 0, 0, -0.1)).toThrow();
        expect(() => legacyHwb(0, 100.1, 0, 0)).toThrow();
        expect(() => legacyHwb(0, 0, 100.1, 0)).toThrow();
        expect(() => legacyHwb(0, 0, 0, 1.1)).toThrow();
      });
      describe('deprecations', () => {
        it('warns with null alpha and no space', () => {
          const stdio = captureStdio(() => {
            new SassColor({hue: 1, whiteness: 1, blackness: 1, alpha: null});
          });
          expect(stdio.err).toMatch('null-alpha');
        });
        it("doesn't warn for undefined alpha and no space", () => {
          const stdio = captureStdio(() => {
            new SassColor({
              hue: 1,
              whiteness: 1,
              blackness: 1,
              alpha: undefined,
            });
          });
          expect(stdio.err).toBeEmptyString();
        });
        it("doesn't warn for no alpha and no space", () => {
          const stdio = captureStdio(() => {
            new SassColor({hue: 1, whiteness: 1, blackness: 1});
          });
          expect(stdio.err).toBeEmptyString();
        });
        it("doesn't warn for undefined alpha and undefined space", () => {
          const stdio = captureStdio(() => {
            new SassColor({
              hue: 1,
              whiteness: 1,
              blackness: 1,
              alpha: undefined,
              space: undefined,
            });
          });
          expect(stdio.err).toBeEmptyString();
        });
        it("doesn't warn for null alpha with space", () => {
          const stdio = captureStdio(() => {
            new SassColor({
              hue: 1,
              whiteness: 1,
              blackness: 1,
              alpha: null,
              space: 'hwb',
            });
          });
          expect(stdio.err).toBeEmptyString();
        });
      });
    });
  });

  describe('an RGB color', () => {
    let color: SassColor;
    beforeEach(() => {
      color = legacyRGB(18, 52, 86);
    });

    it('has RGB channels', () => {
      const stdio = captureStdio(() => {
        expect(color.red).toBe(18);
        expect(color.green).toBe(52);
        expect(color.blue).toBe(86);
      });
      expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
    });

    it('has HSL channels', () => {
      const stdio = captureStdio(() => {
        expect(color.hue).toBe(210);
        expect(color.saturation).toBe(65.3846153846154);
        expect(color.lightness).toBe(20.392156862745097);
      });
      expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
    });

    it('has HWB channels', () => {
      const stdio = captureStdio(() => {
        expect(color.hue).toBe(210);
        expect(color.whiteness).toBe(7.0588235294117645);
        expect(color.blackness).toBe(66.27450980392157);
      });
      expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
    });

    it('has an alpha channel', () => {
      expect(color.alpha).toBe(1);
    });

    it('equals the same color', () => {
      expect(color).toEqualWithHash(legacyRGB(18, 52, 86));
      expect(color).toEqualWithHash(
        legacyHsl(210, 65.3846153846154, 20.392156862745097)
      );
      expect(color).toEqualWithHash(
        legacyHwb(210, 7.0588235294117645, 66.27450980392157)
      );
    });
  });

  describe('an HSL color', () => {
    let color: SassColor;
    beforeEach(() => {
      color = legacyHsl(120, 42, 42);
    });

    it('has RGB channels', () => {
      const stdio = captureStdio(() => {
        expect(color.red).toBe(62);
        expect(color.green).toBe(152);
        expect(color.blue).toBe(62);
      });
      expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
    });

    it('has HSL channels', () => {
      const stdio = captureStdio(() => {
        expect(color.hue).toBe(120);
        expect(color.saturation).toBe(42);
        expect(color.lightness).toBe(42);
      });
      expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
    });

    // sass/embedded-host-node#170
    skipForImpl('sass-embedded', () => {
      it('has HWB channels', () => {
        const stdio = captureStdio(() => {
          expect(color.hue).toBe(120);
          expect(color.whiteness).toBe(24.360000000000003);
          expect(color.blackness).toBe(40.36000000000001);
        });
        expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
      });
    });

    it('has an alpha channel', () => {
      expect(color.alpha).toBe(1);
    });

    // TODO(#1828): Update these expectations
    xit('equals the same color', () => {
      expect(color).toEqualWithHash(legacyRGB(62, 152, 62));
      expect(color).toEqualWithHash(legacyHsl(120, 42, 42));
      expect(color).toEqualWithHash(
        legacyHwb(120, 24.313725490196077, 40.3921568627451)
      );
    });

    it('allows negative hue', () => {
      expect(legacyHsl(-240, 42, 42).channel('hue')).toBe(120);
      expect(legacyHsl(-240, 42, 42)).toEqualWithHash(color);
    });
  });

  describe('an HWB color', () => {
    let color: SassColor;
    beforeEach(() => {
      color = legacyHwb(120, 42, 42);
    });

    it('has RGB channels', () => {
      const stdio = captureStdio(() => {
        expect(color.red).toBe(107);
        expect(color.green).toBe(148);
        expect(color.blue).toBe(107);
      });
      expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
    });

    // sass/embedded-host-node#170
    skipForImpl('sass-embedded', () => {
      it('has HSL channels', () => {
        const stdio = captureStdio(() => {
          expect(color.hue).toBe(120);
          expect(color.saturation).toBe(16.000000000000007);
          expect(color.lightness).toBe(50);
        });
        expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
      });
    });

    // sass/embedded-host-node#170
    skipForImpl('sass-embedded', () => {
      it('has HWB channels', () => {
        const stdio = captureStdio(() => {
          expect(color.hue).toBe(120);
          expect(color.whiteness).toBe(42);
          expect(color.blackness).toBe(42);
        });
        expect(stdio.err.match(/use `channel`/g)).toBeArrayOfSize(3);
      });
    });

    it('has an alpha channel', () => {
      expect(color.alpha).toBe(1);
    });

    // TODO(#1828): Update these expectations
    xit('equals the same color', () => {
      expect(color).toEqualWithHash(legacyRGB(107, 148, 107));
      expect(color).toEqualWithHash(legacyHsl(120, 16.078431372549026, 50));
      expect(color).toEqualWithHash(
        legacyHwb(120, 41.96078431372549, 41.96078431372548)
      );
    });

    it('allows negative hue', () => {
      expect(legacyHwb(-240, 42, 42).channel('hue')).toBe(120);
      expect(legacyHwb(-240, 42, 42)).toEqualWithHash(color);
    });
  });

  describe('changing color values', () => {
    describe('change() for RGB', () => {
      let color: SassColor;
      beforeEach(() => {
        color = legacyRGB(18, 52, 86);
      });
      it('changes RGB values', () => {
        expect(color.change({red: 0})).toEqualWithHash(legacyRGB(0, 52, 86));
        expect(color.change({green: 0})).toEqualWithHash(legacyRGB(18, 0, 86));
        expect(color.change({blue: 0})).toEqualWithHash(legacyRGB(18, 52, 0));
        expect(color.change({alpha: 0.5})).toEqualWithHash(
          legacyRGB(18, 52, 86, 0.5)
        );
        expect(
          color.change({red: 0, green: 0, blue: 0, alpha: 0.5})
        ).toEqualWithHash(legacyRGB(0, 0, 0, 0.5));
      });

      it('allows valid values', () => {
        expect(color.change({red: 0}).channel('red')).toBe(0);
        expect(color.change({red: 255}).channel('red')).toBe(255);
        expect(color.change({green: 0}).channel('green')).toBe(0);
        expect(color.change({green: 255}).channel('green')).toBe(255);
        expect(color.change({blue: 0}).channel('blue')).toBe(0);
        expect(color.change({blue: 255}).channel('blue')).toBe(255);
        expect(color.change({alpha: 0}).alpha).toBe(0);
        expect(color.change({alpha: 1}).alpha).toBe(1);
      });

      // TODO(#1828): Update these expectations
      xit('disallows invalid values', () => {
        expect(() => color.change({red: -1})).toThrow();
        expect(() => color.change({red: 256})).toThrow();
        expect(() => color.change({green: -1})).toThrow();
        expect(() => color.change({green: 256})).toThrow();
        expect(() => color.change({blue: -1})).toThrow();
        expect(() => color.change({blue: 256})).toThrow();
        expect(() => color.change({alpha: -0.1})).toThrow();
        expect(() => color.change({alpha: 1.1})).toThrow();
      });

      // TODO(#1828): Update these expectations
      xit('rounds channels to the nearest integer', () => {
        expect(
          color.change({red: 0.1, green: 50.4, blue: 90.3})
        ).toEqualWithHash(legacyRGB(0, 50, 90));
        expect(
          color.change({red: -0.1, green: 50.5, blue: 90.9})
        ).toEqualWithHash(legacyRGB(0, 51, 91));
      });
    });

    describe('change() for HSL', () => {
      let color: SassColor;
      beforeEach(() => {
        color = legacyHsl(210, 65.3846153846154, 20.392156862745097);
      });
      it('changes HSL values', () => {
        expect(color.change({hue: 120})).toEqualWithHash(
          legacyHsl(120, 65.3846153846154, 20.392156862745097)
        );
        expect(color.change({hue: -120})).toEqualWithHash(
          legacyHsl(240, 65.3846153846154, 20.392156862745097)
        );
        expect(color.change({saturation: 42})).toEqualWithHash(
          legacyHsl(210, 42, 20.392156862745097)
        );
        expect(color.change({lightness: 42})).toEqualWithHash(
          legacyHsl(210, 65.3846153846154, 42)
        );
        expect(color.change({alpha: 0.5})).toEqualWithHash(
          legacyHsl(210, 65.3846153846154, 20.392156862745097, 0.5)
        );
        expect(
          color.change({
            hue: 120,
            saturation: 42,
            lightness: 42,
            alpha: 0.5,
          })
        ).toEqualWithHash(legacyHsl(120, 42, 42, 0.5));
        expect(color.change({hue: undefined})).toEqualWithHash(color);
        // Emits deprecation warning which is tested elsewhere
        captureStdio(() => {
          expect(color.change({hue: null})).toEqualWithHash(color);
        });
      });

      it('allows valid values', () => {
        expect(color.change({saturation: 0}).channel('saturation')).toBe(0);
        expect(color.change({saturation: 100}).channel('saturation')).toBe(100);
        expect(color.change({lightness: 0}).channel('lightness')).toBe(0);
        expect(color.change({lightness: 100}).channel('lightness')).toBe(100);
        expect(color.change({alpha: 0}).alpha).toBe(0);
        expect(color.change({alpha: 1}).alpha).toBe(1);
      });

      it('disallows invalid values', () => {
        expect(() => color.change({saturation: -0.1})).toThrow();
        expect(() => color.change({saturation: 100.1})).toThrow();
        expect(() => color.change({lightness: -0.1})).toThrow();
        expect(() => color.change({lightness: 100.1})).toThrow();
        expect(() => color.change({alpha: -0.1})).toThrow();
        expect(() => color.change({alpha: 1.1})).toThrow();
      });

      it('emits deprecation for null values', () => {
        const stdioHue = captureStdio(() => {
          color.change({hue: null});
        });
        expect(stdioHue.err).toMatch('null-alpha');
        const stdioS = captureStdio(() => {
          color.change({saturation: null});
        });
        expect(stdioS.err).toMatch('null-alpha');
        const stdioL = captureStdio(() => {
          color.change({lightness: null});
        });
        expect(stdioL.err).toMatch('null-alpha');
        const stdioA = captureStdio(() => {
          color.change({alpha: null});
        });
        expect(stdioA.err).toMatch('null-alpha');
      });
      it('emits deprecation for channels from unspecified space', () => {
        const stdio = captureStdio(() => {
          color.change({red: 1});
        });
        expect(stdio.err).toMatch(
          "Changing a channel not in this color's space"
        );
      });
    });

    describe('change() for HWB', () => {
      let color: SassColor;
      beforeEach(() => {
        color = legacyHwb(210, 7.0588235294117645, 66.27450980392157);
      });
      it('changes HWB values', () => {
        expect(color.change({hue: 120})).toEqualWithHash(
          legacyHwb(120, 7.0588235294117645, 66.27450980392157)
        );
        expect(color.change({hue: -120})).toEqualWithHash(
          legacyHwb(240, 7.0588235294117645, 66.27450980392157)
        );
        expect(color.change({whiteness: 42})).toEqualWithHash(
          legacyHwb(210, 42, 66.27450980392157)
        );
        expect(color.change({whiteness: 50})).toEqualWithHash(
          legacyHwb(210, 50, 66.27450980392157)
        );
        expect(color.change({blackness: 42})).toEqualWithHash(
          legacyHwb(210, 7.0588235294117645, 42)
        );
        expect(color.change({alpha: 0.5})).toEqualWithHash(
          legacyHwb(210, 7.0588235294117645, 66.27450980392157, 0.5)
        );
        expect(
          color.change({
            hue: 120,
            whiteness: 42,
            blackness: 42,
            alpha: 0.5,
          })
        ).toEqualWithHash(legacyHwb(120, 42, 42, 0.5));
      });

      // sass/embedded-host-node#170
      skipForImpl('sass-embedded', () => {
        it('allows valid values', () => {
          expect(color.change({whiteness: 0}).channel('whiteness')).toBe(0);
          expect(color.change({whiteness: 100}).channel('whiteness')).toBe(100);
          expect(color.change({blackness: 0}).channel('blackness')).toBe(0);
          expect(color.change({blackness: 100}).channel('blackness')).toBe(100);
          expect(color.change({alpha: 0}).alpha).toBe(0);
          expect(color.change({alpha: 1}).alpha).toBe(1);
        });
      });

      it('disallows invalid values', () => {
        expect(() => color.change({whiteness: -0.1})).toThrow();
        expect(() => color.change({whiteness: 100.1})).toThrow();
        expect(() => color.change({blackness: -0.1})).toThrow();
        expect(() => color.change({blackness: 100.1})).toThrow();
        expect(() => color.change({alpha: -0.1})).toThrow();
        expect(() => color.change({alpha: 1.1})).toThrow();
      });
    });

    describe('changeAlpha()', () => {
      let color: SassColor;
      beforeEach(() => {
        color = legacyRGB(18, 52, 86);
      });
      it('changes the alpha value', () => {
        expect(color.change({alpha: 0.5})).toEqualWithHash(
          legacyRGB(18, 52, 86, 0.5)
        );
      });

      it('allows valid alphas', () => {
        expect(color.change({alpha: 0}).alpha).toBe(0);
        expect(color.change({alpha: 1}).alpha).toBe(1);
      });

      it('rejects invalid alphas', () => {
        expect(() => color.change({alpha: -0.1})).toThrow();
        expect(() => color.change({alpha: 1.1})).toThrow();
      });
    });
  });
});
describe('Color 4 SassColors', () => {
  spaceNames.forEach(spaceId => {
    const space = spaces[spaceId];

    describe(space.name, () => {
      let color: SassColor, blue: SassColor;
      beforeEach(() => {
        color = space.constructor(...space.pink);
        blue = space.constructor(...space.blue);
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

      it(`returns name for ${space.name}`, () => {
        expect(color.space).toBe(space.name);
      });
      describe('toSpace', () => {
        it('converts pink to all spaces', () => {
          spaceNames.forEach(destinationSpaceId => {
            const destinationSpace = spaces[destinationSpaceId];
            const res = color.toSpace(destinationSpace.name);
            expect(res.space).toBe(destinationSpace.name);

            const expected = destinationSpace.constructor(
              ...destinationSpace.pink
            );
            expect(res).toEqualWithHash(expected);
          });
        });
      });
      it(`isLegacy returns ${space.isLegacy} for ${space.name}`, () => {
        expect(color.isLegacy).toBe(space.isLegacy);
      });
      describe('channelsOrNull', () => {
        it('returns a list', () => {
          expect(color.channelsOrNull).toFuzzyEqualList(space.pink);
          expect(color.channelsOrNull.size).toBe(space.channels.length);
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
          it('throws an error if channel not in destination space', () => {
            spaceNames.forEach(destinationSpaceId => {
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
          it('returns value in space specified', () => {
            spaceNames.forEach(destinationSpaceId => {
              const destinationSpace = spaces[destinationSpaceId];
              destinationSpace.channels.forEach((channel, index) => {
                expect(
                  color.channel(channel as ChannelNameXyz, {
                    space: destinationSpace.name as ColorSpaceXyz,
                  })
                ).toFuzzyEqual(destinationSpace.pink[index]);
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
      describe('interpolate', () => {
        it('interpolates examples', () => {
          const examples = interpolations[space.name];
          examples.forEach(([input, output]) => {
            const res = color.interpolate(blue, {
              weight: input.weight,
              method: input.method as HueInterpolationMethod,
            });
            const outputColor = space.constructor(...output);
            expect(res).toEqualWithHash(outputColor);
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
            expect(color.change({[channelName]: 0})).toEqualWithHash(
              space.constructor(...expectedChannels)
            );
          });
          expect(color.change({alpha: 0})).toEqualWithHash(
            space.constructor(...space.pink, 0)
          );
        });

        it('changes all channels with space set', () => {
          spaceNames.forEach(destinationSpaceId => {
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
              ).toEqualWithHash(expected);
            });
          });
        });
      });

      // TODO(sass#3654) Skipped pending https://github.com/sass/sass/issues/3654
      xit('isChannelPowerless', () => {
        function checkPowerless(
          _color: SassColor,
          powerless = [false, false, false]
        ) {
          expect(_color.isChannelPowerless(space.channels[0])).toBe(
            powerless[0]
          );
          expect(_color.isChannelPowerless(space.channels[1])).toBe(
            powerless[1]
          );
          expect(_color.isChannelPowerless(space.channels[2])).toBe(
            powerless[2]
          );
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
            case 'lch':
            case 'oklch':
              // hsl- If the saturation of an HSL color is 0%, then the hue component is powerless.
              // (ok)lch- If the `chroma` value is 0%, then the `hue` channel is powerless.
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

      describe('isInGamut', () => {
        // Our `pink` color is in gamut for every space.
        it('is true for in gamut colors in own space', () => {
          expect(color.isInGamut()).toBe(true);
        });
        it('is true for in gamut colors in specified space', () => {
          spaceNames.forEach(destinationSpaceId => {
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
        it('in own space', () => {
          space.gamutExamples.forEach(([input, output]) => {
            const res = space.constructor(...input).toGamut();
            expect(res).toEqualWithHash(space.constructor(...output));
          });
        });
      });
    });
  });
  describe("tests that can't be parameterized", () => {
    it('toGamut with space', () => {
      const cases: [SassColor, KnownColorSpace, SassColor][] = [
        [oklch(1, 1, 1), 'display-p3', displayP3(1, 1, 1)],
        [oklch(1, 0, 0.2), 'display-p3', displayP3(1, 1, 1)],
      ];
      cases.forEach(([input, space, output]) => {
        expect(input.toGamut(space)).toEqualWithHash(output);
      });
    });
    it('channel with space specified, missing returns 0', () => {
      const cases: [SassColor, KnownColorSpace, ChannelName][] = [
        [oklch(null, null, null), 'lch', 'hue'],
        [oklch(null, null, null), 'lch', 'lightness'],
        [oklch(null, null, null), 'hsl', 'hue'],
        [oklch(null, null, null), 'hsl', 'lightness'],
        [xyz(null, null, null), 'lab', 'lightness'],
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
});
