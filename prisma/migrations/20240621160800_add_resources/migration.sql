-- insert into the resources table
INSERT INTO
  "resources" (id, code, title, "url")
VALUES
  (
    gen_random_uuid(),
    'fs',
    'FamilySearch',
    'https://familysearch.org/'
  ),
  (
    gen_random_uuid(),
    'wiki',
    'Wikipedia',
    'https://uk.wikisource.org/wiki/%D0%90%D1%80%D1%85%D1%96%D0%B2:%D0%90%D1%80%D1%85%D1%96%D0%B2%D0%B8'
  ),
  (
    gen_random_uuid(),
    'by',
    'Архів проєкту "Бабин Яр"',
    'https://babynyar.org/'
  ),
  (
    gen_random_uuid(),
    'archium_dakro',
    'Archium: Державний архів Кіровоградської області',
    'http://archium.krop.archives.gov.ua/'
  ),
  (
    gen_random_uuid(),
    'archium_cdiak',
    'Archium: Центральний державний історичний архів України м.Київ',
    'https://archium.cdiak.archives.gov.ua/'
  ),
  (
    gen_random_uuid(),
    'archium_tsdavo',
    'Archium: Центральний державний архів вищих органів влади та управління України',
    'https://e-resource.tsdavo.gov.ua/'
  ),
  (
    gen_random_uuid(),
    'archium_tsdahou',
    'Archium: Центральний державний архів громадських об''єднаннь та україніки',
    'https://e.tsdahou.archives.gov.ua/'
  ),
  (
    gen_random_uuid(),
    'archium_csamm',
    'Archium: Центральний державний архів-музей літератури і мистецтва України',
    'https://ksi-csamm.archives.gov.ua/'
  ),
  (
    gen_random_uuid(),
    'archium_dalo',
    'Archium: Державний архів Львівської області',
    'https://e.archivelviv.gov.ua/'
  ),
  (
    gen_random_uuid(),
    'archium_zunr',
    'Archium: Цифровий архів Західноукраїнської Народної Республіки',
    'https://zunr.arinsy.com/'
  ),
  (
    gen_random_uuid(),
    'archium_dapo',
    'Archium: Державний архів Полтавської області',
    'http://185.250.20.252/'
  ),
  (
    gen_random_uuid(),
    'archium_tsdial',
    'Archium: Центральний державний історичний архів України м. Львів',
    'https://archium.tsdial.archives.gov.ua/'
  );