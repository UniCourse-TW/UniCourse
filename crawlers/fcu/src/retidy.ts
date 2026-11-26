import { retidySnapshots } from '@unicourse/crawler-kit';
import { tidyOffering } from './tidy.ts';

// Usage: pnpm --filter @unicourse/crawler-fcu retidy -- /abs/path/fcu-105-1.json ...
await retidySnapshots('fcu', tidyOffering, process.argv.slice(2));
