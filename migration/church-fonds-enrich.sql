-- Церква fonds enrichment (2026-08-04): fond-level author inheritance for church-family fonds.
-- Staging mig_church_fonds + mig_church_match (kept): 906 qualifying fonds eyeballed,
-- 317 matched to EXISTING authors (100 exact-norm + 217 guarded trigram), rest create new.
-- Tags by confession markers; plain церква → православ'я (central/eastern archives, precedent).
-- Audit tier 't1-church'. Idempotent.
begin;

create temp table ch_targets on commit drop as
select c.fond_id, coalesce(m.author_id, a.id) author_id, c.author_title
from mig_church_fonds c
left join mig_church_match m on m.fond_id = c.fond_id
left join authors a on a.title = c.author_title
where c.qualifies;

create temp table ch_new on commit drop as
select distinct on (author_title) author_title,
  case
    when author_title ~* 'вірмено-катол' then 'вірмено-католицизм'
    when author_title ~* 'греко-катол' then 'греко-католицизм'
    when author_title ~* 'костел|костьол|римо-катол|римсько-катол' then 'римо-католицизм'
    when author_title ~* 'синагог|єврейськ|іудей|юдей' then 'іудаїзм'
    when author_title ~* 'мечет' then 'іслам'
    when author_title ~* 'лютеран|євангел' then 'лютеранство'
    when author_title ~* 'реформат' then 'реформаторство'
    when author_title ~* 'старообряд' then 'старообрядництво'
    else 'православ''я'
  end tag
from ch_targets where author_id is null
order by author_title;

insert into authors (title, tags)
select author_title, array[tag] from ch_new;

create temp table ch_links on commit drop as
select distinct fi.id file_id, coalesce(t.author_id, a.id) author_id, t.author_title,
  (t.author_id is null) created
from ch_targets t
left join authors a on t.author_id is null and a.title = t.author_title
join inventories i on i.fond_id = t.fond_id
join files fi on fi.inventory_id = i.id;

with ins as (
  insert into file_authors (file_id, author_id)
  select file_id, author_id from ch_links
  on conflict do nothing
  returning file_id, author_id
)
insert into mig_author_name_enrich (tier, file_id, author_id, author_title, author_created)
select 't1-church', l.file_id, l.author_id, l.author_title, l.created
from ch_links l join ins using (file_id, author_id);

do $$
declare v_null int;
begin
  select count(*) into v_null from ch_links where author_id is null;
  if v_null > 0 then raise exception 'unresolved authors: %', v_null; end if;
end $$;

select count(*) links, count(distinct author_id) authors,
       count(*) filter (where author_created) via_new
from mig_author_name_enrich where tier='t1-church';
select tag, count(*) from ch_new group by 1 order by 2 desc;

commit;
