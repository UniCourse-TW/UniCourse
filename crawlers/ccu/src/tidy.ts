import { withoutPlaceholderInstructors, type Offering } from '@unicourse/crawler-kit';

/**
 * Offering-level cleanup shared by the parser and `retidy` (old snapshots): eCourse2 prints a bare staff number
 * (`589142538`) when a teacher has no name on file; that is not an instructor name.
 */
export function tidyOffering(offering: Offering): Offering {
  return withoutPlaceholderInstructors(offering);
}
