import { retidySnapshots } from '@unicourse/crawler-kit';
import { tidyOffering } from './tidy.ts';

// Usage: pnpm --filter @unicourse/crawler-nycu retidy -- /abs/path/nycu-105-1.json ...
await retidySnapshots('nycu', tidyOffering, process.argv.slice(2));
