# UI foundation

Load `tokens.css` once at the root layout. The primitives inherit the zinc and UniCourse purple palette from the document. The shell renders its cookie-backed `data-shell-theme` preference on the server; without it, the palette follows the system preference. An explicit `data-theme` on `<html>` also overrides the palette. The local dev server exposes examples at `/_ui`; the production server returns 404 there.

| Component | Main props and snippets |
| --- | --- |
| `DataTable<Row>` | `caption`, `columns: TableColumn<Row>[]`, `rows`, `rowKey`, optional `rowHref`, `rowHeaderColumn`, `stickyColumn`, `clientSort`, `minWidth`, `maxHeight`, `scrollHint`; `cell(row, column)` and `empty()` snippets. |
| `FilterBar` | `action`, optional `label`, `applyLabel`, `clearHref`, `hidden`; ordinary form controls in `children()`, removals in `chips()`. |
| `FilterSelect` | `name`, `label`, `options`, optional `value`, `allLabel` (`null` omits the all option), `disabled`. |
| `FilterChip` | `url`, `name`, `label`; optional `value` targets one value of a repeated query parameter. |
| `StatRow` / `StatTile` | Row takes `children()` and an optional group `label`. Tiles take `label`, `value`, optional `unit` and `note`. |
| `Sparkline` | `values`, `label`, optional `min` and `max` to share a scale across rows, optional `decorative` when the accessible name would duplicate nearby text. A single measured value is shown as text; `labels` adds its period and value. Use `showArea={false}` for line-only marks and `showValues` for exact values. |
| `BarCell` / `BarList` | Cell takes `value`, `max`, optional `unit` and `emphasis`. List takes `label`, `items: BarItem[]`, optional `unit`, shared `max`, `ranked`, and `showValues`. Both use a zero baseline for nonnegative counts. |
| `TrendChart` | `label`, `points: TrendPoint[]` in chronological order, optional `unit` and `kind` (`column` or `line`). Exact numbers are inline for short series and available in a disclosure for longer series. `termHref` optionally links measured periods in either presentation. |
| `Heatstrip` | Ordered `cells: CoverageCell[]`, optional `label`, `periodUnit`, `valueUnit`, `fullValue` (defaults to two semesters per year), `showValues`. Use `0` for no coverage and `null` for unknown. Opt into annotated cells with `showCounts`; use `--heatstrip-cell-size` and `--heatstrip-gap` to align a period header with the strip. |
| `DotMatrix` | `label`, chronological `periods`, `rows: MatrixRow[]`, optional `periodLabel`, `thresholds` (defaults to 50 and 100 students), and `initialRows` (defaults to 8). Short histories and histories with no published enrollment show exact values inline. Each point can link to offerings. |
| `Badge` / `StatusPill` | `Badge` takes `label`, optional `tone` and `dot`; `StatusPill` takes `status` and supplies its Taiwanese label unless overridden. |
| `EmptyState` / `ErrorState` | Optional `title`, `description`, `action()`; `ErrorState` can generate a retry link from `retryHref`. |
| `SectionHeader` | `title`, optional `id`, heading `level`, `description`, `actions()`. |
| `Pagination` | `url`, `page`, `totalPages`, optional `parameter` and accessible `label`. First-page links omit the page parameter. |
| `Skeleton` | Optional `label`, `minHeight`, `lines`; use for delayed, local content, not first SSR paint. |

`TableColumn` IDs, row keys, and chart periods must be unique within their lists. A table row link wraps only the row-header cell; do not nest interactive controls in that cell's snippet. Opt into client-only sorting with `clientSort` and a column's `sortable` flag plus a `value` or `sortValue` accessor. The server order is preserved without JavaScript. For charts, preserve gaps with `null` and pass `0` only for a known, measured zero.

Keep the chart's value disclosure available unless the same data is already exposed in its surrounding table. Controls supplied through snippets should have a visible focus state and a minimum 44 px touch target.
