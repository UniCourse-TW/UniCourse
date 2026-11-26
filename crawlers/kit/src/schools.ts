export const SCHOOLS = {
  ntu: { name: '國立臺灣大學', nameEn: 'National Taiwan University' },
  ntnu: { name: '國立臺灣師範大學', nameEn: 'National Taiwan Normal University' },
  nycu: { name: '國立陽明交通大學', nameEn: 'National Yang Ming Chiao Tung University' },
  nthu: { name: '國立清華大學', nameEn: 'National Tsing Hua University' },
  ncku: { name: '國立成功大學', nameEn: 'National Cheng Kung University' },
  nccu: { name: '國立政治大學', nameEn: 'National Chengchi University' },
  nchu: { name: '國立中興大學', nameEn: 'National Chung Hsing University' },
  ccu: { name: '國立中正大學', nameEn: 'National Chung Cheng University' },
  ncu: { name: '國立中央大學', nameEn: 'National Central University' },
  fcu: { name: '逢甲大學', nameEn: 'Feng Chia University' },
  tnua: { name: '國立臺北藝術大學', nameEn: 'Taipei National University of the Arts' },
  ntua: { name: '國立臺灣藝術大學', nameEn: 'National Taiwan University of Arts' }
} as const;

export type SchoolSlug = keyof typeof SCHOOLS;
