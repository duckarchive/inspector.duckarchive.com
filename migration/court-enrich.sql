-- Courts enrichment (2026-08-04): fond-level author inheritance for суди/прокуратура/нотаріат fonds.
-- Staging mig_court_fonds (kept): 511 fonds w/ files, eyeballed; 7 excluded (collections/person fonds),
-- title cleanups (26.04.2018 garbage, «Опис N» tails, Вознесеньский typo). Tag by role.
-- Idempotent; audit tier 't1-court' in mig_author_name_enrich.
begin;

create temp table court_new_authors on commit drop as
select distinct on (author_title) author_title, tag from mig_court_fonds c
where qualifies
  and not exists (select 1 from authors a where a.title = c.author_title)
order by author_title;

insert into authors (title, tags)
select author_title, array[tag] from court_new_authors;

create temp table court_links on commit drop as
select distinct fi.id file_id, a.id author_id, c.author_title,
  exists (select 1 from court_new_authors n where n.author_title = c.author_title) created
from mig_court_fonds c
join authors a on a.title = c.author_title
join inventories i on i.fond_id = c.fond_id
join files fi on fi.inventory_id = i.id
where c.qualifies;

with ins as (
  insert into file_authors (file_id, author_id)
  select file_id, author_id from court_links
  on conflict do nothing
  returning file_id, author_id
)
insert into mig_author_name_enrich (tier, file_id, author_id, author_title, author_created)
select 't1-court', l.file_id, l.author_id, l.author_title, l.created
from court_links l join ins using (file_id, author_id);

do $$
declare v_orphan int; v_links int;
begin
  select count(*) into v_orphan from authors a
  where (a.tags in (array['суд'], array['прокуратура'], array['нотаріат']))
    and not exists (select 1 from file_authors fa where fa.author_id = a.id);
  if v_orphan > 0 then raise exception 'orphan created authors: %', v_orphan; end if;
  select count(*) into v_links from court_links;
  if v_links < 200000 then raise exception 'unexpected low link count: %', v_links; end if;
end $$;

select count(*) links, count(distinct author_id) authors,
       count(*) filter (where author_created) via_new_authors
from mig_author_name_enrich where tier='t1-court';

commit;
