-- Bulk admin enrichment (2026-08-04): управи/правління/виконкоми/ради/поліція/освіта/нотаріат/
-- колгоспи/управління (incl. СБУ фільтраційні fonds tag «спецслужби»). Staging mig_admin_fonds
-- (kept, cat+tag columns). Fond-level inheritance, tier 't1-admin'. Idempotent.
begin;

create temp table ad_targets on commit drop as
select c.fond_id, regexp_replace(c.t, '([а-яіїєґА-ЯІЇЄҐ]{4,})\.$', '\1') author_title, c.tag
from mig_admin_fonds c where c.qualifies;

create temp table ad_new on commit drop as
select distinct on (author_title) author_title, tag
from ad_targets t
where not exists (select 1 from authors a where a.title = t.author_title)
order by author_title;

insert into authors (title, tags)
select author_title, array[tag] from ad_new;

create temp table ad_links on commit drop as
select distinct fi.id file_id, a.id author_id, t.author_title,
  exists (select 1 from ad_new n where n.author_title = t.author_title) created
from ad_targets t
join authors a on a.title = t.author_title
join inventories i on i.fond_id = t.fond_id
join files fi on fi.inventory_id = i.id;

with ins as (
  insert into file_authors (file_id, author_id)
  select file_id, author_id from ad_links
  on conflict do nothing
  returning file_id, author_id
)
insert into mig_author_name_enrich (tier, file_id, author_id, author_title, author_created)
select 't1-admin', l.file_id, l.author_id, l.author_title, l.created
from ad_links l join ins using (file_id, author_id);

select count(*) links, count(distinct author_id) authors,
       count(*) filter (where author_created) via_new
from mig_author_name_enrich where tier='t1-admin';
select tag, count(*) new_authors from ad_new group by 1 order by 2 desc;

commit;
