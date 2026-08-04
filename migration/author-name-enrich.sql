-- Author enrichment from inventory/file names (2026-08-04)
-- Tiers: 1 = РАЦС structural inheritance (fond/опис title → office author, files inherit)
--        2 = in-title office extraction (genitive РАЦС / single сільрада)
--        3 = church backfill: unlinked «Метрична книга…» titles matched to EXISTING authors
-- Staging tables (built interactively, kept): mig_ane_units, mig_ane_links (tier1),
--   mig_ane_t2 (tier2), mig_ane_t3_cand/_exact/_trgm/_b/_c (tier3),
--   mig_ane_authors (author norm map); funcs mig_ane_norm, mig_ane_place, mig_ane_name_stem.
-- Audit: mig_author_name_enrich (permanent).
-- Idempotent: authors reused by exact title; links ON CONFLICT DO NOTHING.
-- Pre-run backup: ~/Projects/archive-duck/inspector_3_backup_20260804124019.sql.gz

begin;

create table if not exists mig_author_name_enrich (
  tier      text not null,          -- t1 | t2-racs | t2-silrada | t3-exact | t3-trgm | t3-prefix
  file_id   uuid not null,
  author_id uuid not null,
  author_title text not null,
  author_created boolean not null,
  applied_at timestamp default now()
);

-- ── 1. collect every (file, author_title, tier) to link ──────────────────
create temp table ane_all on commit drop as
select l.file_id, l.author_title, 't1' tier from mig_ane_links l
union all
select t.file_id, t.author_title, 't2-' || t.kind from mig_ane_t2 t
union all
select e.file_id, a.title, 't3-exact' from mig_ane_t3_exact e join authors a on a.id = e.author_id
union all
select b.file_id, a.title, 't3-trgm'  from mig_ane_t3_b b     join authors a on a.id = b.author_id
union all
select c.file_id, a.title, 't3-prefix' from mig_ane_t3_c c    join authors a on a.id = c.author_id;

-- ── 2. create missing authors (tier 1/2 offices; tier 3 uses existing) ───
create temp table ane_new_authors on commit drop as
select distinct author_title from ane_all t
where tier in ('t1','t2-racs','t2-silrada')
  and not exists (select 1 from authors a where a.title = t.author_title);

insert into authors (title, tags)
select author_title, array['цивільний стан'] from ane_new_authors;

-- ── 3. link files (fill-if-absent) ───────────────────────────────────────
create temp table ane_resolved on commit drop as
select distinct on (t.file_id, a.id) t.file_id, a.id author_id, t.author_title, t.tier,
       exists (select 1 from ane_new_authors n where n.author_title = t.author_title) created
from ane_all t
join authors a on a.title = t.author_title
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

-- ── 4. asserts ───────────────────────────────────────────────────────────
do $$
declare v_new int; v_orphan int; v_links int;
begin
  select count(*) into v_new from ane_new_authors;
  -- every newly created author has >=1 link
  select count(*) into v_orphan from authors a
  where a.tags = array['цивільний стан']
    and not exists (select 1 from file_authors fa where fa.author_id = a.id);
  if v_orphan > 0 then raise exception 'orphan created authors: %', v_orphan; end if;
  -- link volume sanity
  select count(*) into v_links from ane_resolved;
  if v_links < 17000 then raise exception 'unexpected low link count: %', v_links; end if;
  raise notice 'authors created: %, links staged: %', v_new, v_links;
end $$;

-- report
select tier, count(*) links, count(distinct author_id) authors,
       count(*) filter (where author_created) created_links
from mig_author_name_enrich group by 1 order by 1;

commit;
