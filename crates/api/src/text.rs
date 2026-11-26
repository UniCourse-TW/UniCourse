//! Validation of user-written text. PostgreSQL text cannot hold NUL, and stored text is always
//! plain text (never trusted as HTML).

use serde::{Deserialize, Deserializer};

/// Whether `text` may be stored: single-line text rejects every control character; multi-line
/// text additionally allows line breaks and tabs.
fn clean(text: &str, multiline: bool) -> bool {
    text.chars().all(|character| {
        !character.is_control() || (multiline && matches!(character, '\n' | '\r' | '\t'))
    })
}

/// Trimmed `raw` when it is 1 to `max` characters long and clean, else `None`.
pub fn required(raw: &str, max: usize, multiline: bool) -> Option<String> {
    let text = raw.trim();
    let length = text.chars().count();
    ((1..=max).contains(&length) && clean(text, multiline)).then(|| text.to_owned())
}

/// Like [`required`], but empty (or all-whitespace) text means "no value": `Ok(None)`.
pub fn optional(raw: Option<&str>, max: usize, multiline: bool) -> Result<Option<String>, ()> {
    match raw.map(str::trim) {
        None | Some("") => Ok(None),
        Some(text) => required(text, max, multiline).map(Some).ok_or(()),
    }
}

/// For PATCH bodies: an absent field is `None`, an explicit `null` is `Some(None)`.
pub fn patch<'de, D: Deserializer<'de>, T: Deserialize<'de>>(
    input: D,
) -> Result<Option<Option<T>>, D::Error> {
    Option::<T>::deserialize(input).map(Some)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn text_rules() {
        assert_eq!(required("  標題 ", 5, false).as_deref(), Some("標題"));
        assert_eq!(required("", 5, false), None);
        assert_eq!(required("   ", 5, false), None);
        assert_eq!(required("abcdef", 5, false), None);
        assert_eq!(required("a\0b", 5, true), None);
        assert_eq!(required("a\nb", 5, false), None);
        assert_eq!(required("a\nb", 5, true).as_deref(), Some("a\nb"));
        assert_eq!(required("a\u{7}b", 5, true), None);
        assert_eq!(optional(None, 5, false), Ok(None));
        assert_eq!(optional(Some(" "), 5, false), Ok(None));
        assert_eq!(optional(Some("a\0"), 5, false), Err(()));
    }
}
