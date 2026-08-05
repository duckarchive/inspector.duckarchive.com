-- Candidate general normalization: parsed -> files.full_code
--   1. uppercase
--   2. collapse the dash in a "<ARCH>-Р-<fond>" prefix  -> "<ARCH>-Р<fond>"
--   3. drop a dash before a single trailing letter      -> "...-10-А" => "...-10А"
CREATE OR REPLACE FUNCTION pg_temp.norm(p text) RETURNS text AS $$
  SELECT regexp_replace(
           regexp_replace(upper($1), '^([^-]+)-Р-', '\1-Р'),
           '-([А-ЯЄІЇҐA-Z])$', '\1');
$$ LANGUAGE sql IMMUTABLE;
