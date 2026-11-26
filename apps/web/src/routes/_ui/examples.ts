import type { BadgeTone, BarItem, CoverageCell, MatrixRow, TableColumn, TrendPoint } from '$lib/ui/types';

export const schools = [
  { value: 'nthu', label: '國立清華大學' },
  { value: 'nycu', label: '國立陽明交通大學' },
  { value: 'ntnu', label: '國立臺灣師範大學' }
];

const terms = ['115-1', '114-2', '114-1'];
export const termOptions = terms.map((term) => ({ value: term, label: term }));

interface RankingRow {
  code: string;
  rank: number;
  title: string;
  school: string;
  schoolName: string;
  terms: readonly string[];
  termCount: number;
  total: number | null;
  trend: readonly (number | null)[];
  delta: number | null;
}

export const ranking: RankingRow[] = [
  { code: 'MATH1010', rank: 1, title: '微積分一', school: 'nthu', schoolName: '清大', terms, termCount: 20, total: 41230, trend: [1800, 1910, null, 2210, 2380], delta: 170 },
  { code: 'CS1355', rank: 2, title: '計算機程式設計一', school: 'nycu', schoolName: '陽明交大', terms, termCount: 19, total: 33118, trend: [1470, 1760, 1690, 1840, 1750], delta: -90 },
  { code: 'GEA1024', rank: 3, title: '普通心理學', school: 'ntnu', schoolName: '臺師大', terms: ['115-1', '114-1'], termCount: 18, total: 29004, trend: [1460, 1590, 1510, null, 1790], delta: null },
  { code: 'CS2336', rank: 4, title: '資料結構', school: 'nthu', schoolName: '清大', terms, termCount: 16, total: 1284, trend: [83, 76, 92, 78, 72], delta: -6 },
  { code: 'GEI2020', rank: 5, title: '臺灣城市與文化', school: 'ntnu', schoolName: '臺師大', terms: ['114-2'], termCount: 3, total: null, trend: [], delta: null }
];

export const rankingColumns: TableColumn<RankingRow>[] = [
  { id: 'rank', label: '#', numeric: true, align: 'center', width: '2.5rem', value: (row) => row.rank },
  { id: 'course', label: '課程', value: (row) => row.title },
  { id: 'school', label: '學校', value: (row) => row.schoolName },
  { id: 'terms', label: '學期數', numeric: true, sortable: true, value: (row) => row.termCount },
  { id: 'total', label: '累計修課人數', numeric: true, sortable: true, value: (row) => row.total },
  { id: 'trend', label: '近期走勢' }
];

export const trend: TrendPoint[] = [64, 68, 66, null, 75, 0, 83, 76, 92, 78, 72]
  .map((value, index) => ({ term: `${105 + index}-1`, value }));

export const departments: BarItem[] = [
  { label: '資訊工程學系', value: 1426 },
  { label: '通識教育中心', value: 1108 },
  { label: '電機工程學系', value: 713 },
  { label: '數學系', value: 356 },
  { label: '跨領域學習中心', value: null }
];

interface StatusRow {
  label: string;
  status: BadgeTone;
  years: readonly number[];
  offerings: number | null;
  href?: string;
}

export const statusRows: StatusRow[] = [
  { label: '國立清華大學', status: 'live', years: [0, 0, 2, 1, 2, 2, 2, 2, 2, 1], offerings: 24819, href: '/schools/nthu' },
  { label: '國立臺灣師範大學', status: 'partial', years: [0, 0, 0, 0, 0, 0, 1, 1, 2, 1], offerings: 6484, href: '/schools/ntnu' },
  { label: '國立成功大學', status: 'blocked', years: [], offerings: null },
  { label: '國立宜蘭大學', status: 'planned', years: [], offerings: null },
  { label: '國立聯合大學', status: 'none', years: [], offerings: null },
  { label: '示範大學', status: 'demo', years: [], offerings: 12 },
  { label: '臺灣首府大學', status: 'inactive', years: [], offerings: null }
];

export const statusColumns: TableColumn<StatusRow>[] = [
  { id: 'school', label: '學校', value: (row) => row.label },
  { id: 'status', label: '收錄狀態' },
  { id: 'coverage', label: '106 → 115 學年' },
  { id: 'offerings', label: '班次', value: (row) => row.offerings, numeric: true }
];

export function coverage(years: readonly number[]): CoverageCell[] {
  return years.map((value, index) => ({ period: String(106 + index), value }));
}

export const matrixPeriods = ['110-1', '111-1', '112-1', '113-1', '114-1', '115-1'];
export const matrixRows: MatrixRow[] = [
  { id: 'CS2336', label: '資料結構', points: {
    '111-1': { offerings: 1, enrolled: 42 },
    '112-1': { offerings: 1, enrolled: 67 },
    '113-1': { offerings: 2, enrolled: 156, href: '#trend' },
    '115-1': { offerings: 1, enrolled: 72 }
  } },
  { id: 'CS3100', label: '演算法', points: {
    '110-1': { offerings: 1, enrolled: null },
    '112-1': { offerings: 1, enrolled: 96 },
    '114-1': { offerings: 2, enrolled: 115 }
  } },
  { id: 'CS1355', label: '計算機程式設計一', points: {
    '111-1': { offerings: 2, enrolled: 231 },
    '113-1': { offerings: 2, enrolled: 193 },
    '115-1': { offerings: 1, enrolled: 73 }
  } }
];
