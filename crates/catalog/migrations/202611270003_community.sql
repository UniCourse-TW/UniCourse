-- Stage 2 community features (docs/stage2-contract.md): accounts, sessions, ratings and the forum.
-- Validation lives in crates/api; the checks below are a backstop.

CREATE TABLE users (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    -- Stored lower-cased, so the expression index makes usernames case-insensitively unique.
    username text NOT NULL CHECK (username ~ '^[a-z0-9_]{3,32}$'),
    display_name text CHECK (char_length(display_name) BETWEEN 1 AND 50),
    password_hash text NOT NULL,
    school text REFERENCES schools(slug),
    bio text CHECK (char_length(bio) BETWEEN 1 AND 500),
    -- No UI sets this; promote with SQL. Admins may post announcements and delete any post.
    is_admin boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_username ON users (lower(username));

-- `id` is the SHA-256 of the 32 random bytes in the `uc_session` cookie, so a database dump does
-- not contain usable session tokens.
CREATE TABLE sessions (
    id bytea PRIMARY KEY CHECK (octet_length(id) = 32),
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);

-- Failed logins per (lower-cased) username, for the 10-per-minute limit. Rows older than ten
-- minutes are deleted whenever a new failure is recorded.
CREATE TABLE login_attempts (
    username text NOT NULL,
    attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_username ON login_attempts (username, attempted_at);
CREATE INDEX login_attempts_attempted_at ON login_attempts (attempted_at);

-- Ratings belong to the cross-term course, not to one offering.
CREATE TABLE ratings (
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school text NOT NULL,
    course_code text NOT NULL,
    score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
    review text CHECK (char_length(review) BETWEEN 1 AND 2000),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, school, course_code),
    FOREIGN KEY (school, course_code) REFERENCES courses(school, code)
);
CREATE INDEX ratings_course ON ratings (school, course_code, updated_at DESC);

-- Top-level posts (announcement, article, question) and their flat replies. Content is plain text;
-- rendering (Markdown) is the web's job.
CREATE TABLE posts (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    author_id bigint NOT NULL REFERENCES users(id),
    type text NOT NULL CHECK (type IN ('announcement', 'article', 'question', 'reply')),
    title text CHECK (char_length(title) BETWEEN 1 AND 200),
    content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 20000),
    school text REFERENCES schools(slug),
    course_code text,
    parent_id bigint REFERENCES posts(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CHECK ((type = 'reply') = (parent_id IS NOT NULL)),
    CHECK ((type = 'reply') = (title IS NULL)),
    CHECK (course_code IS NULL OR school IS NOT NULL),
    FOREIGN KEY (school, course_code) REFERENCES courses(school, code)
);
CREATE INDEX posts_feed ON posts (created_at DESC, id DESC) WHERE parent_id IS NULL;
CREATE INDEX posts_replies ON posts (parent_id, created_at) WHERE parent_id IS NOT NULL;
CREATE INDEX posts_course ON posts (school, course_code) WHERE parent_id IS NULL;
CREATE INDEX posts_author ON posts (author_id, created_at DESC);
CREATE INDEX posts_title_trgm ON posts USING gin (lower(title) gin_trgm_ops);
CREATE INDEX posts_content_trgm ON posts USING gin (lower(content) gin_trgm_ops);

CREATE TABLE post_votes (
    post_id bigint NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    value smallint NOT NULL CHECK (value IN (-1, 1)),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE post_tags (
    post_id bigint NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag text NOT NULL CHECK (char_length(tag) BETWEEN 1 AND 30),
    PRIMARY KEY (post_id, tag)
);
CREATE INDEX post_tags_tag ON post_tags (tag);
