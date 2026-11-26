CREATE INDEX offerings_active_school_term_stats
    ON offerings (school, term DESC, course_code) INCLUDE (enrolled, capacity) WHERE active;

DROP MATERIALIZED VIEW course_rankings;

CREATE MATERIALIZED VIEW course_rankings AS
WITH term_totals AS (
    SELECT school, course_code, term, count(*) AS offerings,
        sum(enrolled) AS enrolled, sum(capacity) AS capacity,
        row_number() OVER (PARTITION BY school, course_code ORDER BY term DESC) AS recency
    FROM offerings
    GROUP BY school, course_code, term
), totals AS (
    SELECT school, course_code, count(*) AS terms, sum(offerings)::bigint AS offerings,
        sum(enrolled)::bigint AS enrolled_total, sum(capacity)::bigint AS capacity_total,
        jsonb_agg(jsonb_build_object('term', term, 'enrolled', enrolled, 'capacity', capacity)
            ORDER BY term DESC) FILTER (WHERE recency <= 10) AS trend
    FROM term_totals
    GROUP BY school, course_code
), latest AS (
    SELECT DISTINCT ON (school, course_code) school, course_code, id, term, title, title_en, active
    FROM offerings
    ORDER BY school, course_code, active DESC, term DESC, id DESC
)
SELECT totals.school, totals.course_code, latest.title, latest.title_en,
    totals.terms, totals.offerings, totals.enrolled_total, totals.capacity_total,
    latest.id AS latest_offering_id,
    CASE WHEN latest.active THEN latest.id END AS latest_active_offering_id,
    totals.trend, snapshot.is_demo
FROM totals
JOIN latest USING (school, course_code)
JOIN course_snapshots AS snapshot ON (snapshot.school, snapshot.term) = (latest.school, latest.term);

CREATE UNIQUE INDEX course_rankings_course ON course_rankings (school, course_code);
CREATE INDEX course_rankings_order
    ON course_rankings (enrolled_total DESC NULLS LAST, capacity_total DESC NULLS LAST);
CREATE INDEX course_rankings_school_order
    ON course_rankings (school, enrolled_total DESC NULLS LAST, capacity_total DESC NULLS LAST);

CREATE FUNCTION unicourse_iso_precise(instant timestamptz) RETURNS text
    LANGUAGE sql STABLE STRICT PARALLEL SAFE
    AS $$ SELECT to_char(instant AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') $$;
