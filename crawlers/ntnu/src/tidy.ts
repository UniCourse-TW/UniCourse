import { withoutPlaceholderInstructors, type Offering } from '@unicourse/crawler-kit';

/**
 * Offering-level cleanup shared by the parser and `retidy` (old snapshots): `未定` is not an instructor, and
 * 限修人數 0 with students (enrolled through the department or authorization codes) is not a capacity.
 */
export function tidyOffering(offering: Offering): Offering {
  const next = { ...withoutPlaceholderInstructors(offering) };
  if (next.capacity === 0 && next.enrolled) delete next.capacity;
  return next;
}
