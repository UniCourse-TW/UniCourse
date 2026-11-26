-- Stage 2 (docs/stage2-contract.md): published enrollment, the historical course ranking and the
-- indexes behind instructor and per-course listings.

ALTER TABLE offerings ADD COLUMN enrolled integer CHECK (enrolled >= 0);

-- Every offering of one cross-term course, newest term first (rankings, ratings, profiles).
CREATE INDEX offerings_course_term ON offerings (school, course_code, term DESC);
-- Exact instructor lookups use `instructors @> ARRAY[name]`.
CREATE INDEX offerings_instructors ON offerings USING gin (instructors);

-- ISO-8601 UTC text for API timestamps, e.g. 2026-11-27T08:00:00Z.
CREATE FUNCTION unicourse_iso(instant timestamptz) RETURNS text
    LANGUAGE sql STABLE STRICT PARALLEL SAFE
    AS $$ SELECT to_char(instant AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') $$;

-- Cumulative totals per cross-term course over every imported term, active and inactive offerings
-- alike (history matters). SUM ignores NULL, so a total is NULL only when no offering of the course
-- published the value. The title and link come from the newest term, preferring an active offering
-- because only active offerings are served by /api/courses/{id}. Refreshed by the ingest after
-- every successful import (REFRESH ... CONCURRENTLY needs the unique index below).
CREATE MATERIALIZED VIEW course_rankings AS
WITH totals AS (
    SELECT school, course_code, count(DISTINCT term) AS terms, count(*) AS offerings,
        sum(enrolled) AS enrolled_total, sum(capacity) AS capacity_total
    FROM offerings
    GROUP BY school, course_code
), latest AS (
    SELECT DISTINCT ON (offering.school, offering.course_code)
        offering.school, offering.course_code, offering.id, offering.title, offering.title_en,
        snapshot.is_demo
    FROM offerings AS offering
    JOIN course_snapshots AS snapshot
        ON (snapshot.school, snapshot.term) = (offering.school, offering.term)
    ORDER BY offering.school, offering.course_code, offering.active DESC, offering.term DESC,
        offering.id DESC
)
SELECT totals.school, totals.course_code, latest.title, latest.title_en,
    totals.terms, totals.offerings, totals.enrolled_total::bigint AS enrolled_total,
    totals.capacity_total::bigint AS capacity_total, latest.id AS latest_offering_id,
    latest.is_demo
FROM totals
JOIN latest USING (school, course_code);

CREATE UNIQUE INDEX course_rankings_course ON course_rankings (school, course_code);
CREATE INDEX course_rankings_order
    ON course_rankings (enrolled_total DESC NULLS LAST, capacity_total DESC NULLS LAST);
CREATE INDEX course_rankings_school_order
    ON course_rankings (school, enrolled_total DESC NULLS LAST, capacity_total DESC NULLS LAST);
