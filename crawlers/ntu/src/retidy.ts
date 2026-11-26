import { retidySnapshots } from '@unicourse/crawler-kit';
import { tidyOffering } from './tidy.ts';

// Usage: pnpm --filter @unicourse/crawler-ntu retidy -- /abs/path/ntu-105-1.json ...
await retidySnapshots('ntu', tidyOffering, process.argv.slice(2));
