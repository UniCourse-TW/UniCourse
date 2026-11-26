import { retidySnapshots } from '@unicourse/crawler-kit';
import { tidyOffering } from './tidy.ts';

// Usage: pnpm --filter @unicourse/crawler-tnua retidy -- /abs/path/tnua-105-1.json ...
await retidySnapshots('tnua', tidyOffering, process.argv.slice(2));
