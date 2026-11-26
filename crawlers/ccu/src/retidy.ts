import { retidySnapshots } from '@unicourse/crawler-kit';
import { tidyOffering } from './tidy.ts';

// Usage: pnpm --filter @unicourse/crawler-ccu retidy -- /abs/path/ccu-105-1.json ...
await retidySnapshots('ccu', tidyOffering, process.argv.slice(2));
