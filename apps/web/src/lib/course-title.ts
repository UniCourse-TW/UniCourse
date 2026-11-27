/** Short words kept lower case inside an English course title. */
const minor = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'the', 'to', 'via', 'with']);
/** Roman numerals and common acronyms that stay upper case (Calculus II, AI, EMI). */
const keepUpper = /^(?:[IVX]+|AI|EMI|IT|IOT|AR|VR|UX|UI|ESG|STEM|GIS|CPR|DNA|RNA|PE|R&D|[A-Z])$/;

/**
 * Some schools publish English titles in capitals (CITIZEN PARTICIPATION). Those are shown in title
 * case (Citizen Participation) so they match titles published in mixed case; titles that already
 * contain lower-case letters are returned as they are.
 */
export function englishTitle(value: string | null | undefined): string | undefined {
  const title = value?.trim();
  if (!title) return undefined;
  if (/[a-z]/.test(title) || !/[A-Z]{2}/.test(title)) return title;
  let first = true;
  return title.replace(/[A-Za-z][A-Za-z'&]*/g, (word) => {
    const upper = word.toUpperCase();
    const lower = word.toLowerCase();
    const out = !first && minor.has(lower)
      ? lower
      : keepUpper.test(upper)
        ? upper
        : lower[0].toUpperCase() + lower.slice(1);
    first = false;
    return out;
  });
}
