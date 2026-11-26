import { ISSUES_URL } from '$lib/institutions';

/** Public requests (corrections, removals that may be public): a GitHub issue. */
export const PUBLIC_REPORT_URL = ISSUES_URL;

/**
 * Private requests (account help, anything with personal data): GitHub's private vulnerability report
 * form, which only the maintainers can read. It needs a GitHub account but nothing is public.
 */
export const PRIVATE_REPORT_URL = 'https://github.com/UniCourse-TW/UniCourse/security/advisories/new';
