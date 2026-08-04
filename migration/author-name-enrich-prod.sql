-- Author enrichment transfer inspector_3 → prod (2026-08-04)
-- Source: mig_author_name_enrich on inspector_3 (validated run, see author-name-enrich.sql).
-- Transfer key: files by full_code, authors by exact title (created if missing, tag «цивільний стан»).
-- Rationale: prod ДАДнО-Р6508 опис titles are stale «<район>» style (pre user's inspector_3
--   renames to «<X> РАЦС»), so re-deriving tier 1 on prod would miss ~6.8k files; the
--   inspector_3 audit rows carry the user's newest author naming.
-- Usage: psql <prod> -v ON_ERROR_STOP=1 -f author-name-enrich-prod.sql
--   (expects /tmp/.../ane_links.tsv loaded via \copy below — adjust path if needed)
-- Idempotent: re-run inserts 0. Pre-run prod backup required (server-side pg_dump16 over ssh).

begin;

create table if not exists mig_author_name_enrich (
  tier      text not null,
  file_id   uuid not null,
  author_id uuid not null,
  author_title text not null,
  author_created boolean not null,
  applied_at timestamp default now()
);

create temp table ane_in (full_code text, author_title text, tier text) on commit drop;
\copy ane_in from '/tmp/claude-1000/-home-alexandrtovmach-Projects-archive-duck-inspector-duckarchive-com/fb8a1fce-9d1e-4d65-8624-9ba2cff2757b/scratchpad/ane_links.tsv'

-- resolve files by full_code; fallback: inspector_3 short опис codes NП/NД ↔ prod canonical NПОШ/NДОД (ДАДнО-Р6508)
create temp table ane_files on commit drop as
select i.full_code, i.author_title, i.tier,
  coalesce(f.id, f2.id) file_id
from ane_in i
left join files f on f.full_code = i.full_code
left join files f2 on f.id is null and f2.full_code = regexp_replace(regexp_replace(i.full_code,
      '^(ДАДнО-Р6508-\d+)П(-)', '\1ПОШ\2'), '^(ДАДнО-Р6508-\d+)Д(-)', '\1ДОД\2');

-- report unmatched (kept out of apply)
select tier, count(*) missing_files from ane_files where file_id is null group by 1;

-- create missing t1/t2 authors
create temp table ane_new_authors on commit drop as
select distinct author_title from ane_files t
where t.file_id is not null and t.tier in ('t1','t2-racs','t2-silrada')
  and not exists (select 1 from authors a where a.title = t.author_title);
insert into authors (title, tags)
select author_title, array['цивільний стан'] from ane_new_authors;

-- t3 rows whose author no longer exists on prod (merged/renamed) — reported, skipped
select tier, count(*) missing_authors from ane_files t
where t.file_id is not null and t.tier like 't3%'
  and not exists (select 1 from authors a where a.title = t.author_title)
group by 1;

create temp table ane_resolved on commit drop as
select distinct on (t.file_id, a.id) t.file_id, a.id author_id, t.author_title, t.tier,
       exists (select 1 from ane_new_authors n where n.author_title = t.author_title) created
from ane_files t
join authors a on a.title = t.author_title
where t.file_id is not null
order by t.file_id, a.id, t.tier;

with ins as (
  insert into file_authors (file_id, author_id)
  select file_id, author_id from ane_resolved
  on conflict do nothing
  returning file_id, author_id
)
insert into mig_author_name_enrich (tier, file_id, author_id, author_title, author_created)
select r.tier, r.file_id, r.author_id, r.author_title, r.created
from ane_resolved r join ins using (file_id, author_id);

do $$
declare v_orphan int;
begin
  select count(*) into v_orphan from authors a
  where a.tags = array['цивільний стан']
    and not exists (select 1 from file_authors fa where fa.author_id = a.id);
  if v_orphan > 0 then raise exception 'orphan created authors: %', v_orphan; end if;
end $$;

select tier, count(*) links, count(distinct author_id) authors,
       count(*) filter (where author_created) created_links
from mig_author_name_enrich group by 1 order by 1;

commit;
