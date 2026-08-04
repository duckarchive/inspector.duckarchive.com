-- Консисторії/духовні правління enrichment (2026-08-04): fond-level author inheritance.
-- Staging mig_cons_fonds (kept); church-pass fonds excluded (they carry 'консисторії' in titles).
-- Files typically ALSO have/get church authors — consistory author is additive (creator chain).
-- Audit tier 't1-consistory'. Idempotent.
begin;

update mig_cons_fonds set qualifies = true
where fond_id in (select fond_id from mig_cons_fonds c where not c.qualifies
  and c.t ~ '[;]' and c.t ~* '^[А-ЯІЇЄҐ][а-яіїєґ''\-]+ське духовне правління');

create temp table cons_targets on commit drop as
select c.fond_id,
  regexp_replace(c.t, '([а-яіїєґА-ЯІЇЄҐ]{4,})\.$', '\1') author_title
from mig_cons_fonds c where c.qualifies;

create temp table cons_new on commit drop as
select distinct on (author_title) author_title,
  case
    when author_title ~* 'римо-катол|римсько-катол' then 'римо-католицизм'
    when author_title ~* 'греко-катол|уніат' then 'греко-католицизм'
    else 'православ''я'
  end tag
from cons_targets t
where not exists (select 1 from authors a where a.title = t.author_title)
order by author_title;

insert into authors (title, tags)
select author_title, array[tag] from cons_new;

create temp table cons_links on commit drop as
select distinct fi.id file_id, a.id author_id, t.author_title,
  exists (select 1 from cons_new n where n.author_title = t.author_title) created
from cons_targets t
join authors a on a.title = t.author_title
join inventories i on i.fond_id = t.fond_id
join files fi on fi.inventory_id = i.id;

with ins as (
  insert into file_authors (file_id, author_id)
  select file_id, author_id from cons_links
  on conflict do nothing
  returning file_id, author_id
)
insert into mig_author_name_enrich (tier, file_id, author_id, author_title, author_created)
select 't1-consistory', l.file_id, l.author_id, l.author_title, l.created
from cons_links l join ins using (file_id, author_id);

select count(*) links, count(distinct author_id) authors,
       count(*) filter (where author_created) via_new
from mig_author_name_enrich where tier='t1-consistory';
select tag, count(*) from cons_new group by 1;

commit;
