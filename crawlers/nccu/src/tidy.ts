import { remapExtra, stripControl, withExtra, type ExtraRecord, type Offering } from '@unicourse/crawler-kit';

/**
 * The search API's field names are not labels (`gdeTpe`, `tranTpe`, `subOdr`). The course page shows `extra` keys
 * as they are, so map them to the labels of the school's own query UI (qrysub.nccu.edu.tw); `subOdr` is an internal
 * department sort key and is dropped.
 */
export const EXTRA_LABELS: Record<string, string | null> = {
  lmtKind: '通識類別',
  info: '異動資訊',
  core: '核心通識',
  emiType: 'EMI課程',
  far: '遠距教學',
  gdeType: '開課層級',
  gdeTpe: '可抵免通識',
  gdeTpeMsg: '可抵免通識說明',
  pay: '收費',
  smtQty: '全/半年',
  tranTpe: '選課方式',
  subOdr: null
};

const clean = (value: string | undefined) => (value === undefined ? undefined : stripControl(value).trim() || undefined);

/** Offering-level cleanup shared by the parser and `retidy` (old snapshots): labels, stray DEL bytes. */
export function tidyOffering(offering: Offering): Offering {
  const next: Offering = { ...offering, title: clean(offering.title) ?? offering.title };
  for (const field of ['notes', 'titleEn', 'description'] as const) {
    const value = clean(next[field]);
    if (value === undefined) delete next[field];
    else next[field] = value;
  }
  return withExtra(next, remapExtra(offering.extra as ExtraRecord | undefined, EXTRA_LABELS));
}
