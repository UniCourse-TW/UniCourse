import { retidySnapshots } from '@unicourse/crawler-kit';
import { tidyOffering } from './tidy.ts';

// Usage: pnpm --filter @unicourse/crawler-nccu retidy -- /abs/path/nccu-105-1.json ...
await retidySnapshots('nccu', tidyOffering, process.argv.slice(2));
