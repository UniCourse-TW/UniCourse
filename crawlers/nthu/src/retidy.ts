import { retidySnapshots } from '@unicourse/crawler-kit';
import { tidyOffering } from './tidy.ts';

// Usage: pnpm --filter @unicourse/crawler-nthu retidy -- /abs/path/nthu-105-1.json ...
await retidySnapshots('nthu', tidyOffering, process.argv.slice(2));
