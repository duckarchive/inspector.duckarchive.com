-- fold(): applied to BOTH sides of the comparison, so it can never introduce a
-- mismatch — trim, uppercase, and fold Latin homoglyphs onto their Cyrillic twins.
CREATE OR REPLACE FUNCTION pg_temp.fold(p text) RETURNS text AS $$
  SELECT translate(upper(btrim($1)), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ');
$$ LANGUAGE sql IMMUTABLE;

-- norm2(): the "ДАПО pattern", applied to online_copies.parsed only —
--   1. collapse the dash in a "<ARCH>-Р-<fond>" / "<ARCH>-П-<fond>" prefix
--   2. drop a dash before a single trailing letter  (…-10-А => …-10А)
CREATE OR REPLACE FUNCTION pg_temp.norm2(p text) RETURNS text AS $$
  SELECT regexp_replace(
           regexp_replace(pg_temp.fold($1), '^([^-]+)-([РП])-', '\1-\2'),
           '-([А-ЯЄІЇҐA-Z])$', '\1');
$$ LANGUAGE sql IMMUTABLE;
