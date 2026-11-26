-- External review search index (docs/external-reviews.md): public posts on other sites, stored only as a
-- search engine would show them, matched to catalog courses at import time by crates/ingest.

CREATE TABLE external_reviews (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    source text NOT NULL CHECK (source IN ('ptt')),
    board text NOT NULL,
    url text NOT NULL,
    title text NOT NULL,
    author text,
    posted_at timestamptz,
    push_score integer,
    excerpt text CHECK (char_length(excerpt) BETWEEN 1 AND 120),
    tag text,
    -- Parsed from the post title.
    term text CHECK (term ~ '^[0-9]{3}-[123]$'),
    course_title text,
    teachers text[] NOT NULL DEFAULT '{}',
    -- School of the board (not a foreign key: a board may be indexed before its school is imported).
    school text,
    -- The match; all three are NULL for unmatched posts, which stay searchable.
    course_code text,
    instructor text,
    match_kind text CHECK (match_kind IN ('exact', 'title', 'contains')),
    is_demo boolean NOT NULL,
    fetched_at timestamptz NOT NULL,
    imported_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (source, url),
    CHECK ((course_code IS NULL) = (match_kind IS NULL)),
    CHECK (course_code IS NULL OR school IS NOT NULL),
    FOREIGN KEY (school, course_code) REFERENCES courses(school, code)
);

CREATE INDEX external_reviews_course ON external_reviews (school, course_code, posted_at DESC);
CREATE INDEX external_reviews_instructor ON external_reviews (school, instructor, posted_at DESC);
CREATE INDEX external_reviews_teachers ON external_reviews USING gin (teachers);
