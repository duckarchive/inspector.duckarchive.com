-- Latin→Cyrillic code fix (2026-08-04), prod. Homoglyphs found: A T D B O (504 codes).
-- Families: (1) ЦДІАК latin-Т том описи (dodged every том-cleanup regex) — non-empty fold
-- into base описи per locked continuous-tiling rule (collide → merge with title-fill from
-- wiki-titled том file, base FS placeholders overridden; else move), empty shells deleted;
-- (2) опис merges into cyrillic twins; (3) опис renames + child full_code rebuild;
-- (4) file merges into cyrillic twins (copies/authors/years repointed, dedup);
-- (5) file renames. Audit: mig_latin_fix. Single txn, asserts at end.
begin;

create table if not exists mig_latin_fix (
  action text, lvl text, old_full text, new_full text,
  old_id uuid, tgt_id uuid, note text, applied_at timestamp default now());

-- ═══ 1. ЦДІАК latin-Т томи ═══════════════════════════════════════════════
create temp table tom_inv on commit drop as
select i.id inv_id, i.code, i.fond_id,
       (select i2.id from inventories i2 where i2.fond_id = i.fond_id
         and i2.code = split_part(translate(i.code, 'T', '#'), '#', 1)) base_inv_id
from inventories i
join fonds f on i.fond_id = f.id
join archives a on f.archive_id = a.id
where a.code = 'ЦДІАК' and i.code ~ '[A-Z]';

do $$ declare n int; begin
  select count(*) into n from tom_inv where base_inv_id is null;
  if n > 0 then raise exception 'том опис without base: %', n; end if;
end $$;

-- 1a. merge colliding files into base twins
create temp table tom_merge on commit drop as
select tf.id tom_id, bf.id base_id, tf.title tom_title, bf.title base_title, tf.full_code old_full, bf.full_code new_full
from files tf
join tom_inv t on tf.inventory_id = t.inv_id
join files bf on bf.inventory_id = t.base_inv_id and bf.code = tf.code;

update files bf set title = translate(m.tom_title, '’ʼ', '''''')
from tom_merge m
where bf.id = m.base_id
  and m.tom_title is not null and m.tom_title <> ''
  and (bf.title is null or bf.title = '' or bf.title like 'Православні церковні документи%');

update online_copies oc set file_id = m.base_id
from tom_merge m where oc.file_id = m.tom_id
  and not exists (select 1 from online_copies oc2
    where oc2.resource_id = oc.resource_id and oc2.file_id = m.base_id
      and oc2.parsed = oc.parsed and oc2.url = oc.url and oc2.inventory_id is null);

insert into file_authors (file_id, author_id)
select m.base_id, fa.author_id from file_authors fa join tom_merge m on fa.file_id = m.tom_id
on conflict do nothing;
delete from file_authors fa using tom_merge m where fa.file_id = m.tom_id;

update file_years fy set file_id = m.base_id
from tom_merge m where fy.file_id = m.tom_id
  and not exists (select 1 from file_years fy2 where fy2.file_id = m.base_id);
delete from file_years fy using tom_merge m where fy.file_id = m.tom_id;

insert into mig_latin_fix (action, lvl, old_full, new_full, old_id, tgt_id)
select 'tom-merge', 'file', old_full, new_full, tom_id, base_id from tom_merge;
delete from files f using tom_merge m where f.id = m.tom_id;

-- 1b. move non-colliding files to base опис
create temp table tom_move on commit drop as
select tf.id, tf.full_code old_full, t.base_inv_id,
  (select a.code || '-' || fo.code || '-' || i2.code || '-' || tf.code
   from inventories i2 join fonds fo on i2.fond_id = fo.id join archives a on fo.archive_id = a.id
   where i2.id = t.base_inv_id) new_full
from files tf join tom_inv t on tf.inventory_id = t.inv_id;

update files f set inventory_id = m.base_inv_id, full_code = m.new_full
from tom_move m where f.id = m.id;
insert into mig_latin_fix (action, lvl, old_full, new_full, old_id)
select 'tom-move', 'file', old_full, new_full, id from tom_move;

-- 1c. delete emptied том описи
do $$ declare n int; begin
  select count(*) into n from files f join tom_inv t on f.inventory_id = t.inv_id;
  if n > 0 then raise exception 'том опис still has files: %', n; end if;
end $$;
delete from inventory_years iy using tom_inv t where iy.inventory_id = t.inv_id;
insert into mig_latin_fix (action, lvl, old_full, old_id, note)
select 'tom-inv-delete', 'inventory', code, inv_id, 'emptied latin-T опис' from tom_inv;
delete from inventories i using tom_inv t where i.id = t.inv_id;

-- ═══ 2. опис merges into cyrillic twins ══════════════════════════════════
create temp table inv_merge on commit drop as
select i.id old_id, i2.id tgt_id, i.code old_code
from inventories i
join inventories i2 on i2.fond_id = i.fond_id
  and i2.code = translate(i.code, 'ATDBO', 'АТДВО') and i2.id <> i.id
where i.code ~ '[A-Za-z]';

do $$ declare n int; begin
  select count(*) into n from files f join inv_merge m on f.inventory_id = m.old_id;
  if n > 0 then raise exception 'merging опис has files: %', n; end if;
end $$;
update inventory_years iy set inventory_id = m.tgt_id
from inv_merge m where iy.inventory_id = m.old_id
  and not exists (select 1 from inventory_years iy2 where iy2.inventory_id = m.tgt_id);
delete from inventory_years iy using inv_merge m where iy.inventory_id = m.old_id;
insert into mig_latin_fix (action, lvl, old_full, old_id, tgt_id)
select 'inv-merge', 'inventory', old_code, old_id, tgt_id from inv_merge;
delete from inventories i using inv_merge m where i.id = m.old_id;

-- ═══ 3. опис renames + child full_code rebuild ═══════════════════════════
create temp table inv_ren on commit drop as
select id, code old_code, translate(code, 'ATDBO', 'АТДВО') new_code
from inventories where code ~ '[A-Za-z]';
update inventories i set code = r.new_code from inv_ren r where i.id = r.id;
update files f set full_code = a.code || '-' || fo.code || '-' || i.code || '-' || f.code
from inventories i, fonds fo, archives a, inv_ren r
where f.inventory_id = i.id and i.fond_id = fo.id and fo.archive_id = a.id and i.id = r.id;
insert into mig_latin_fix (action, lvl, old_full, new_full, old_id)
select 'inv-rename', 'inventory', old_code, new_code, id from inv_ren;

-- ═══ 4. file merges into cyrillic twins ══════════════════════════════════
create temp table file_merge on commit drop as
select f.id old_id, f2.id tgt_id, f.title old_title, f2.title tgt_title, f.full_code old_full, f2.full_code new_full
from files f
join files f2 on f2.inventory_id = f.inventory_id
  and f2.code = translate(f.code, 'ATDBO', 'АТДВО') and f2.id <> f.id
where f.code ~ '[A-Za-z]';

update files f2 set title = translate(m.old_title, '’ʼ', '''''')
from file_merge m
where f2.id = m.tgt_id and m.old_title is not null and m.old_title <> ''
  and (f2.title is null or f2.title = '' or f2.title like 'Православні церковні документи%');

update online_copies oc set file_id = m.tgt_id
from file_merge m where oc.file_id = m.old_id
  and not exists (select 1 from online_copies oc2
    where oc2.resource_id = oc.resource_id and oc2.file_id = m.tgt_id
      and oc2.parsed = oc.parsed and oc2.url = oc.url and oc2.inventory_id is null);

insert into file_authors (file_id, author_id)
select m.tgt_id, fa.author_id from file_authors fa join file_merge m on fa.file_id = m.old_id
on conflict do nothing;
delete from file_authors fa using file_merge m where fa.file_id = m.old_id;

update file_years fy set file_id = m.tgt_id
from file_merge m where fy.file_id = m.old_id
  and not exists (select 1 from file_years fy2 where fy2.file_id = m.tgt_id);
delete from file_years fy using file_merge m where fy.file_id = m.old_id;

insert into mig_latin_fix (action, lvl, old_full, new_full, old_id, tgt_id)
select 'file-merge', 'file', old_full, new_full, old_id, tgt_id from file_merge;
delete from files f using file_merge m where f.id = m.old_id;

-- ═══ 5. file renames ═════════════════════════════════════════════════════
create temp table file_ren on commit drop as
select f.id, f.full_code old_full, translate(f.code, 'ATDBO', 'АТДВО') new_code,
  a.code || '-' || fo.code || '-' || i.code || '-' || translate(f.code, 'ATDBO', 'АТДВО') new_full
from files f join inventories i on f.inventory_id = i.id
join fonds fo on i.fond_id = fo.id join archives a on fo.archive_id = a.id
where f.code ~ '[A-Za-z]';
update files f set code = r.new_code, full_code = r.new_full from file_ren r where f.id = r.id;
insert into mig_latin_fix (action, lvl, old_full, new_full, old_id)
select 'file-rename', 'file', old_full, new_full, id from file_ren;

-- ═══ asserts ═════════════════════════════════════════════════════════════
do $$ declare n int; begin
  select count(*) into n from fonds where code ~ '[A-Za-z]';
  if n > 0 then raise exception 'latin fond codes left: %', n; end if;
  select count(*) into n from inventories where code ~ '[A-Za-z]';
  if n > 0 then raise exception 'latin опис codes left: %', n; end if;
  select count(*) into n from files where code ~ '[A-Za-z]';
  if n > 0 then raise exception 'latin file codes left: %', n; end if;
  select count(*) into n from (select full_code from files group by full_code having count(*) > 1) d;
  if n > 0 then raise exception 'dup full_codes: %', n; end if;
end $$;

select action, count(*) from mig_latin_fix group by 1 order by 1;
commit;
