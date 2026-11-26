CREATE TABLE schools (
    slug text PRIMARY KEY,
    name text NOT NULL
);

CREATE TABLE courses (
    school text NOT NULL REFERENCES schools(slug),
    code text NOT NULL,
    PRIMARY KEY (school, code)
);

CREATE TABLE course_snapshots (
    school text NOT NULL REFERENCES schools(slug),
    term text NOT NULL,
    is_demo boolean NOT NULL,
    imported_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (school, term)
);

CREATE TABLE offerings (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    school text NOT NULL,
    term text NOT NULL,
    source_id text NOT NULL,
    course_code text NOT NULL,
    title text NOT NULL,
    instructors text[] NOT NULL,
    source_url text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    UNIQUE (school, term, source_id),
    FOREIGN KEY (school, course_code) REFERENCES courses(school, code),
    FOREIGN KEY (school, term) REFERENCES course_snapshots(school, term)
);
