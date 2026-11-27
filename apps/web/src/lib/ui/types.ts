export type TableValue = string | number | null | undefined;

export interface TableColumn<Row> {
  id: string;
  label: string;
  value?: (row: Row) => TableValue;
  numeric?: boolean;
  sortable?: boolean;
  sortValue?: (row: Row) => TableValue;
  align?: 'start' | 'center' | 'end';
  width?: string;
}

export interface FilterOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type BadgeTone = 'live' | 'partial' | 'blocked' | 'planned' | 'none' | 'demo' | 'inactive';

export interface BarItem {
  label: string;
  value: number | null;
  href?: string;
}

export interface TrendPoint {
  term: string;
  value: number | null;
  partial?: boolean;
}

export interface CoverageCell {
  period: string;
  value: number | null;
}

export interface MatrixPoint {
  offerings: number;
  enrolled: number | null;
  href?: string;
  destination?: string;
  partial?: boolean;
}

export interface MatrixRow {
  id: string;
  label: string;
  points: Readonly<Record<string, MatrixPoint | undefined>>;
}
