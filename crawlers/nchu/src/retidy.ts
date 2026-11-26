import { retidySnapshots } from '@unicourse/crawler-kit';
import { tidyOffering } from './tidy.ts';

// Usage: pnpm --filter @unicourse/crawler-nchu retidy -- /abs/path/nchu-105-1.json ...
await retidySnapshots('nchu', tidyOffering, process.argv.slice(2));
