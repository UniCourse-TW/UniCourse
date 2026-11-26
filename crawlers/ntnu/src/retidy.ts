import { retidySnapshots } from '@unicourse/crawler-kit';
import { tidyOffering } from './tidy.ts';

// Usage: pnpm --filter @unicourse/crawler-ntnu retidy -- /abs/path/ntnu-105-1.json ...
await retidySnapshots('ntnu', tidyOffering, process.argv.slice(2));
