CREATE FUNCTION unicourse_search_short(code text, VARIADIC fields text[]) RETURNS text[]
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    AS $$
        SELECT ARRAY[left(code, 1), left(code, 2)] || ARRAY(
            SELECT substr(field, position, width)
            FROM unnest(fields) AS field
            CROSS JOIN LATERAL generate_series(1, char_length(field)) AS position
            CROSS JOIN generate_series(1, 2) AS width
        )
    $$;

ALTER TABLE offerings ADD COLUMN is_academic boolean NOT NULL DEFAULT true;

-- One-time backfill for rows imported before the Rust is_academic_offering classifier.
UPDATE offerings SET is_academic = false
WHERE credits = 0 OR title LIKE ANY (ARRAY[
    '%班級活動%', '%班會%', '%導師時間%', '%導師輔導%', '%操行%', '%週會%', '%勞作教育%',
    '%新生定向%', '%新生導航%', '%新生訓練%'
]);

CREATE INDEX offerings_search_short ON offerings USING gin (
    unicourse_search_short(lower(course_code), lower(title), lower(title_en), lower(department),
        unicourse_instructor_text(instructors))
) WHERE active;

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
    SELECT DISTINCT ON (school, course_code)
        school, course_code, id, term, title, title_en, active, is_academic
    FROM offerings
    ORDER BY school, course_code, active DESC, term DESC, id DESC
)
SELECT totals.school, totals.course_code, latest.title, latest.title_en,
    totals.terms, totals.offerings, totals.enrolled_total, totals.capacity_total,
    latest.id AS latest_offering_id,
    CASE WHEN latest.active THEN latest.id END AS latest_active_offering_id,
    totals.trend, snapshot.is_demo, latest.is_academic
FROM totals
JOIN latest USING (school, course_code)
JOIN course_snapshots AS snapshot ON (snapshot.school, snapshot.term) = (latest.school, latest.term);

CREATE UNIQUE INDEX course_rankings_course ON course_rankings (school, course_code);
CREATE INDEX course_rankings_order ON course_rankings
    (enrolled_total DESC NULLS LAST, capacity_total DESC NULLS LAST, terms DESC, school, course_code);
CREATE INDEX course_rankings_school_order ON course_rankings
    (school, enrolled_total DESC NULLS LAST, capacity_total DESC NULLS LAST, terms DESC, course_code);
CREATE INDEX course_rankings_academic_order ON course_rankings
    (enrolled_total DESC NULLS LAST, capacity_total DESC NULLS LAST, terms DESC, school, course_code)
    WHERE is_academic;
CREATE INDEX course_rankings_school_academic_order ON course_rankings
    (school, enrolled_total DESC NULLS LAST, capacity_total DESC NULLS LAST, terms DESC, course_code)
    WHERE is_academic;
