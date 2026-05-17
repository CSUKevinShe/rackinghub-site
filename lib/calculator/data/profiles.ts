// Profile specifications from 123.xlsx
export interface Profile {
  thickness?: number;
  expanded?: number;
  weight?: number;
  Ix?: number;
  Iy?: number;
  category: string;
}

export const PROFILES: Record<string, Profile> = {
  ".CB75-3H": {
    thickness: 4,
    expanded: 102,
    weight: 3.2028,
    category: "Heavy Duty Boltless"
  },
  ".CB75-4H": {
    thickness: 4,
    expanded: 102,
    weight: 3.2028,
    category: "Heavy Duty Boltless"
  },
  ".DA76-3H": {
    thickness: 3.5,
    expanded: 100,
    weight: 2.7475,
    category: "Heavy Duty Boltless"
  },
  ".DA76-4H": {
    thickness: 3.5,
    expanded: 100,
    weight: 2.7475,
    category: "Heavy Duty Boltless"
  },
  ".DE50-3H": {
    thickness: 4,
    expanded: 95,
    weight: 2.983,
    category: "Heavy Duty Boltless"
  },
  ".DE50-4H": {
    thickness: 4,
    expanded: 95,
    weight: 2.983,
    category: "Heavy Duty Boltless"
  },
  ".DE50-5H": {
    thickness: 4,
    expanded: 95,
    weight: 2.983,
    category: "Heavy Duty Boltless"
  },
  ".DE75-3H": {
    thickness: 3.5,
    expanded: 100,
    weight: 2.7475,
    category: "Heavy Duty Boltless"
  },
  ".DE75-4H": {
    thickness: 3.5,
    expanded: 100,
    weight: 2.7475,
    category: "Heavy Duty Boltless"
  },
  ".L55A-Brk": {
    thickness: 2.5,
    expanded: 76,
    weight: 1.4915,
    category: "Medium Duty Boltless"
  },
  ".L55B-Brk": {
    thickness: 2.5,
    expanded: 76,
    weight: 1.4915,
    category: "Medium Duty Boltless"
  },
  ".L55B.Ex-Brk": {
    thickness: 2.5,
    expanded: 86,
    weight: 1.6878,
    category: "Medium Duty Boltless"
  },
  ".L55C-Brk": {
    thickness: 2.5,
    expanded: 73,
    weight: 1.4326,
    category: "Medium Duty Boltless"
  },
  "100x50": {
    thickness: 1.5,
    expanded: 205,
    weight: 4.8278,
    Ix: 95.36,
    Iy: 23.35,
    category: "Box Beam"
  },
  "100x70": {
    thickness: 2.5,
    expanded: 270,
    weight: 5.2988,
    Ix: 41.85,
    Iy: 90.13,
    category: "Upright Frame"
  },
  "100x95": {
    thickness: 3.5,
    expanded: 319,
    weight: 8.7645,
    Ix: 124.39,
    Iy: 162.62,
    category: "Upright Frame"
  },
  "110x50": {
    thickness: 1.5,
    expanded: 215,
    weight: 5.0633,
    Ix: 119.21,
    Iy: 25.17,
    category: "Box Beam"
  },
  "120x135": {
    thickness: 3.5,
    expanded: 421,
    weight: 11.567,
    Ix: 325.03,
    Iy: 346.77,
    category: "Upright Frame"
  },
  "120x50": {
    thickness: 1.5,
    expanded: 225,
    weight: 5.2988,
    Ix: 146.25,
    Iy: 26.76,
    category: "Box Beam"
  },
  "120x70": {
    thickness: 2.5,
    expanded: 290,
    weight: 5.6913,
    Ix: 44.84,
    Iy: 143.31,
    category: "Upright Frame"
  },
  "120x95": {
    thickness: 3.5,
    expanded: 339,
    weight: 9.314,
    Ix: 133.22,
    Iy: 254.33,
    category: "Upright Frame"
  },
  "130x50": {
    thickness: 1.5,
    expanded: 235,
    weight: 5.5343,
    Ix: 176.63,
    Iy: 28.47,
    category: "Box Beam"
  },
  "140x135": {
    thickness: 3.5,
    expanded: 441,
    weight: 12.1165,
    category: "Upright Frame"
  },
  "140x50": {
    thickness: 1.5,
    expanded: 245,
    weight: 5.7698,
    Ix: 210.49,
    Iy: 30.18,
    category: "Box Beam"
  },
  "150x50": {
    thickness: 1.5,
    expanded: 510,
    weight: 6.01,
    Ix: 247.98,
    Iy: 32.05,
    category: "Box Beam"
  },
  "155x50": {
    thickness: 1.8,
    expanded: 260,
    weight: 7.3476,
    Ix: 320.85,
    Iy: 38.9,
    category: "Box Beam"
  },
  "160x50": {
    thickness: 1.8,
    expanded: 265,
    weight: 7.4889,
    Ix: 346.16,
    Iy: 39.92,
    category: "Box Beam"
  },
  "180x50": {
    thickness: 1.8,
    expanded: 285,
    weight: 8.0542,
    Ix: 459.42,
    Iy: 43.99,
    category: "Box Beam"
  },
  "80x50": {
    thickness: 1.5,
    expanded: 183,
    weight: 4.3096,
    Ix: 56.67,
    Iy: 19.93,
    category: "Box Beam"
  },
  "90x50": {
    thickness: 1.5,
    expanded: 193,
    weight: 4.5452,
    Ix: 74.56,
    Iy: 21.64,
    category: "Box Beam"
  },
  "90x68": {
    thickness: 2,
    expanded: 232,
    weight: 3.6424,
    Ix: 22.26,
    Iy: 50.62,
    category: "Upright Frame"
  },
  "90x70": {
    thickness: 2.3,
    expanded: 249,
    weight: 4.4957,
    Ix: 32.86,
    Iy: 60.23,
    category: "Upright Frame"
  },
  "Base.C200.30.20": {
    thickness: 2,
    expanded: 270,
    weight: 4.239,
    category: "Cantilever Base"
  },
  "Base.C200.30.25": {
    thickness: 2.5,
    expanded: 270,
    weight: 5.2988,
    category: "Cantilever Base"
  },
  "Base.C200.30.30": {
    thickness: 3,
    expanded: 270,
    weight: 6.3585,
    category: "Cantilever Base"
  },
  "Base.C215.45.30": {
    thickness: 3,
    expanded: 315,
    weight: 7.4182,
    category: "Cantilever Base"
  },
  "Base.C300.45.30": {
    thickness: 3,
    expanded: 400,
    weight: 9.42,
    category: "Cantilever Base"
  },
  "Base.C305.48.30": {
    thickness: 3,
    expanded: 407,
    weight: 9.5849,
    category: "Cantilever Base"
  },
  "Base.C350.45.40": {
    thickness: 4,
    expanded: 450,
    weight: 14.13,
    category: "Cantilever Base"
  },
  "Base.C350.48.40": {
    thickness: 4,
    expanded: 452,
    weight: 14.1928,
    category: "Cantilever Base"
  },
  "C200.60.20": {
    thickness: 2,
    expanded: 270,
    weight: 4.239,
    category: "悬臂Upright Frame"
  },
  "C200.60.25": {
    thickness: 2.5,
    expanded: 270,
    weight: 5.2988,
    category: "悬臂Upright Frame"
  },
  "C200.60.30": {
    thickness: 3,
    expanded: 270,
    weight: 6.3585,
    category: "悬臂Upright Frame"
  },
  "C215.90.30": {
    thickness: 3,
    expanded: 315,
    weight: 7.4182,
    category: "悬臂Upright Frame"
  },
  "C300.90.30": {
    thickness: 3,
    expanded: 400,
    weight: 9.42,
    category: "悬臂Upright Frame"
  },
  "C305.96.30": {
    thickness: 3,
    expanded: 407,
    weight: 9.5849,
    category: "悬臂Upright Frame"
  },
  "C350.90.40": {
    thickness: 4,
    expanded: 450,
    weight: 14.13,
    category: "悬臂Upright Frame"
  },
  "C350.96.40": {
    thickness: 4,
    expanded: 452,
    weight: 14.1928,
    category: "悬臂Upright Frame"
  },
  "DE100 C40*29.5": {
    thickness: 1.4,
    expanded: 102,
    weight: 1.121,
    category: "横斜撑"
  },
  "DE120 C40*39.5": {
    thickness: 1.4,
    expanded: 124,
    weight: 1.3628,
    category: "横斜撑"
  },
  "DE90 C35*24": {
    thickness: 1.4,
    expanded: 82,
    weight: 0.9012,
    category: "横斜撑"
  },
  "DE90 C40*24": {
    thickness: 1.4,
    expanded: 93,
    weight: 1.0221,
    category: "横斜撑"
  },
  "F100": {
    thickness: 4,
    Ix: 233.74,
    category: "方管"
  },
  "F120": {
    thickness: 4,
    Ix: 412.04,
    category: "方管"
  },
  "F150": {
    thickness: 5,
    Ix: 1008.26,
    category: "方管"
  },
  "F180": {
    thickness: 5,
    Ix: 1771.53,
    category: "方管"
  },
  "F200": {
    thickness: 6,
    Ix: 2901.18,
    category: "方管"
  },
  "F250": {
    thickness: 6,
    Ix: 5769.26,
    category: "方管"
  },
  "F300": {
    thickness: 6,
    Ix: 10089.44,
    category: "方管"
  },
  "F90M": {
    thickness: 3.5,
    category: "脚底板"
  },
  "FL55A.H2": {
    thickness: 2.5,
    weight: 0.2,
    category: "F90H4CB"
  },
  "FL55B.H2": {
    thickness: 2.5,
    weight: 0.17,
    category: "F90H4CB"
  },
  "FL55C.H2": {
    thickness: 2.5,
    weight: 0.192,
    category: "F90H4CB"
  },
  "J100*50": {
    thickness: 2.5,
    Ix: 93.42,
    Iy: 31.47,
    category: "矩管"
  },
  "J120*60": {
    thickness: 3,
    Ix: 194.31,
    Iy: 65.44,
    category: "矩管"
  },
  "J40*40": {
    thickness: 1.5,
    Ix: 5.55,
    Iy: 5.55,
    category: "矩管"
  },
  "J50*30": {
    thickness: 2,
    Ix: 9.94,
    Iy: 4.42,
    category: "矩管"
  },
  "J60*40": {
    thickness: 2,
    Ix: 18.89,
    Iy: 10,
    category: "矩管"
  },
  "J80*40": {
    thickness: 2,
    Ix: 38.09,
    Iy: 12.83,
    category: "矩管"
  },
  "J80*50": {
    thickness: 2,
    Ix: 44.03,
    Iy: 21.2,
    category: "矩管"
  },
  "L55A  55x47": {
    thickness: 1.8,
    expanded: 149,
    weight: 2.1054,
    Ix: 6.25,
    Iy: 12.12,
    category: "Upright Frame"
  },
  "L55A  55x50": {
    thickness: 1.8,
    expanded: 162,
    weight: 2.2891,
    Ix: 8.7,
    Iy: 13.49,
    category: "Upright Frame"
  },
  "L55A/B C30*18": {
    thickness: 1.2,
    expanded: 67,
    weight: 0.6311,
    category: "横斜撑"
  },
  "L55B  55x47": {
    thickness: 1.8,
    expanded: 149,
    weight: 2.1054,
    Ix: 6.25,
    Iy: 12.12,
    category: "Upright Frame"
  },
  "L55B  55x50": {
    thickness: 1.8,
    expanded: 162,
    weight: 2.2891,
    Ix: 8.7,
    Iy: 13.49,
    category: "Upright Frame"
  },
  "L55C  55x47": {
    thickness: 1.8,
    expanded: 162,
    weight: 2.2891,
    Ix: 6.45,
    Iy: 11.52,
    category: "Upright Frame"
  },
  "L55C C30*25": {
    thickness: 1.3,
    expanded: 82,
    weight: 0.8368,
    category: "横斜撑"
  },
  "P101.6*63.5/41.3": {
    thickness: 2,
    expanded: 328,
    weight: 5.1496,
    Ix: 79.17,
    Iy: 33.42,
    category: "美制P梁"
  },
  "P110*50/28": {
    thickness: 2,
    Ix: 82.34,
    Iy: 22.45,
    category: "P梁"
  },
  "P114.3*63.5/41.3": {
    thickness: 2,
    expanded: 352,
    weight: 5.5264,
    Ix: 105.72,
    Iy: 38.45,
    category: "美制P梁"
  },
  "P127*63.5/41.3": {
    thickness: 2.3,
    expanded: 380,
    weight: 6.8609,
    Ix: 157.63,
    Iy: 49.43,
    category: "美制P梁"
  },
  "P139.7*63.5/41.3": {
    thickness: 2.3,
    expanded: 403,
    weight: 7.2762,
    Ix: 200.96,
    Iy: 55,
    category: "美制P梁"
  },
  "P152.4*63.5/41.3": {
    thickness: 2.3,
    expanded: 428,
    weight: 7.7275,
    Ix: 251.37,
    Iy: 60.53,
    category: "美制P梁"
  },
  "P50*30/25": {
    thickness: 1.5,
    Ix: 5.87,
    Iy: 1.93,
    category: "P梁"
  },
  "P60*40/18": {
    thickness: 1.5,
    Ix: 12.12,
    Iy: 5.96,
    category: "P梁"
  },
  "P60*40/28": {
    thickness: 1.5,
    Ix: 11.96,
    Iy: 4.98,
    category: "P梁"
  },
  "P76.2*63.5/41.3": {
    thickness: 2,
    expanded: 277,
    weight: 4.3489,
    Ix: 41.03,
    Iy: 22.73,
    category: "美制P梁"
  },
  "P80*50/28": {
    thickness: 2,
    Ix: 37.08,
    Iy: 15.86,
    category: "P梁"
  },
  "P88.9*63.5/41.3": {
    thickness: 2,
    expanded: 302,
    weight: 4.7414,
    Ix: 57.69,
    Iy: 28.22,
    category: "美制P梁"
  },
  "SHM120.15": {
    thickness: 1.5,
    category: "垫板"
  },
  "SHM55A.10": {
    thickness: 1.5,
    category: "垫板"
  },
  "SHM55B.10": {
    thickness: 1.5,
    category: "垫板"
  },
  "SHM90/100.15": {
    thickness: 1.5,
    category: "垫板"
  },
  "SHM90M.15": {
    thickness: 1.5,
    category: "垫板"
  },
  "SHML55C.10": {
    thickness: 1.5,
    category: "垫板"
  },
};

/**
 * Upright weight lookup for frame-capacity codes.
 * Frame capacity entries like "90*70 (1.8)" don't directly match profile keys.
 * This maps capacity code -> { thickness, weight_kg_per_meter }.
 * Weight = thickness × expanded_width × 7.85 / 1000 (from 123.xlsx formula).
 */
export const UPRIGHT_WEIGHTS: Record<string, { thickness: number; weight: number }> = {
  // 80*58 series
  "80*58 (1.8) SF": { thickness: 1.8, weight: 2.05 },
  // 90*68 series
  "90*68 (1.8) SF": { thickness: 1.8, weight: 3.28 },
  // 90*70 series — different thicknesses
  "90*70 (1.8)": { thickness: 1.8, weight: 3.52 },
  "90*70 (2.0)": { thickness: 2.0, weight: 3.92 },
  "90*70 (2.3)": { thickness: 2.3, weight: 4.50 },
  // 100*70 series
  "100*70(2.3)": { thickness: 2.3, weight: 4.87 },
  "100*70(2.5)": { thickness: 2.5, weight: 5.30 },
  // 120*70 series
  "120*70(2.3)": { thickness: 2.3, weight: 5.24 },
  "120*70(2.5)": { thickness: 2.5, weight: 5.69 },
  // 120x95 series
  "120x95（2.3）": { thickness: 2.3, weight: 8.42 },
  "120x95（2.5）": { thickness: 2.5, weight: 9.08 },
  "120x95（2.8）": { thickness: 2.8, weight: 10.14 },
  // 120x135 series
  "120x135（2.5）": { thickness: 2.5, weight: 11.23 },
  "120x135（2.8）": { thickness: 2.8, weight: 12.58 },
  // 140x135
  "140*70(2.5)": { thickness: 2.5, weight: 6.50 },
  "140*70(2.8)": { thickness: 2.8, weight: 7.25 },
};
