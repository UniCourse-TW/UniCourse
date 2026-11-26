-- Snapshot format v2 (docs/snapshot-format.md): optional offering details, school English names,
-- snapshot provenance and search indexes. Every new column is nullable so v1 rows stay valid.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE schools ADD COLUMN name_en text;

ALTER TABLE course_snapshots
    ADD COLUMN source_name text,
    ADD COLUMN source_url text,
    ADD COLUMN fetched_at timestamptz;

ALTER TABLE offerings
    ADD COLUMN title_en text,
    ADD COLUMN class_code text,
    ADD COLUMN department text,
    ADD COLUMN department_code text,
    ADD COLUMN credits numeric(5, 2) CHECK (credits >= 0),
    ADD COLUMN requirement text CHECK (requirement IN ('required', 'elective', 'general', 'other')),
    ADD COLUMN requirement_text text,
    ADD COLUMN schedule jsonb CHECK (jsonb_typeof(schedule) = 'array'),
    ADD COLUMN schedule_text text,
    ADD COLUMN capacity integer CHECK (capacity >= 0),
    ADD COLUMN language text,
    ADD COLUMN campus text,
    ADD COLUMN grade text,
    ADD COLUMN description text,
    ADD COLUMN syllabus_url text,
    ADD COLUMN notes text,
    ADD COLUMN extra jsonb CHECK (jsonb_typeof(extra) = 'object');

-- Instructor names joined into one lower-cased string so substring search can use a trigram index.
-- array_to_string is only STABLE in general, but it is immutable for text[], so the wrapper may be
-- declared IMMUTABLE. The newline separator keeps a query from matching across two names.
CREATE FUNCTION unicourse_instructor_text(instructors text[]) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    AS $$ SELECT lower(array_to_string(instructors, E'\n')) $$;

-- Search matches with LIKE on these expressions; every OR branch is GIN-indexable so the planner
-- can combine them with a BitmapOr instead of scanning ~100k rows. Course codes match by prefix.
CREATE INDEX offerings_title_trgm ON offerings USING gin (lower(title) gin_trgm_ops);
CREATE INDEX offerings_title_en_trgm ON offerings USING gin (lower(title_en) gin_trgm_ops);
CREATE INDEX offerings_department_trgm ON offerings USING gin (lower(department) gin_trgm_ops);
CREATE INDEX offerings_course_code_trgm ON offerings USING gin (lower(course_code) gin_trgm_ops);
CREATE INDEX offerings_instructors_trgm
    ON offerings USING gin (unicourse_instructor_text(instructors) gin_trgm_ops);

-- Exact filters and the term/department listings.
CREATE INDEX offerings_term ON offerings (term);
CREATE INDEX offerings_school_department ON offerings (school, department);
