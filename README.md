## TODO

- add child count to response of instance
- add unescape HTML https://stackoverflow.com/questions/18749591/encode-html-entities-in-javascript/39243641#39243641
- add logs saving to file


<!-- The provided value for the column is too long for the column's type. Column: (not available)
    at In.handleRequestError (/home/alexandrtovmach/Projects/geneo/duck-inspector/node_modules/@prisma/client/runtime/library.js:122:6877)
    at In.handleAndLogRequestError (/home/alexandrtovmach/Projects/geneo/duck-inspector/node_modules/@prisma/client/runtime/library.js:122:6211)
    at In.request (/home/alexandrtovmach/Projects/geneo/duck-inspector/node_modules/@prisma/client/runtime/library.js:122:5919)
    at async l (/home/alexandrtovmach/Projects/geneo/duck-inspector/node_modules/@prisma/client/runtime/library.js:127:11167)
    at async fetchFundDescriptions (webpack-internal:///(api)/./pages/api/fetch/archium/[archive_id]/[fund_id]/index.ts:94:41)
    at async Promise.all (index 0)
    at async fetchArchiveFunds (webpack-internal:///(api)/./pages/api/fetch/archium/[archive_id]/index.ts:118:21)
    at async handler (webpack-internal:///(api)/./pages/api/fetch/archium/full.ts:45:37)
    at async K (/home/alexandrtovmach/Projects/geneo/duck-inspector/node_modules/next/dist/compiled/next-server/pages-api.runtime.dev.js:21:2871)
    at async U.render (/home/alexandrtovmach/Projects/geneo/duck-inspector/node_modules/next/dist/compiled/next-server/pages-api.runtime.dev.js:21:3955)
    at async DevServer.runApi (/home/alexandrtovmach/Projects/geneo/duck-inspector/node_modules/next/dist/server/next-server.js:600:9)
    at async NextNodeServer.handleCatchallRenderRequest (/home/alexandrtovmach/Projects/geneo/duck-inspector/node_modules/next/dist/server/next-server.js:269:37)
    at async DevServer.handleRequestImpl (/home/alexandrtovmach/Projects/geneo/duck-inspector/node_modules/next/dist/server/base-server.js:816:17)
    at async /home/alexandrtovmach/Projects/geneo/duck-inspector/node_modules/next/dist/server/dev/next-dev-server.js:339:20
    at async Span.traceAsyncFn (/home/alexandrtovmach/Projects/geneo/duck-inspector/node_modules/next/dist/trace/trace.js:154:20) {
  code: 'P2000',
  clientVersion: '5.15.1',
  meta: { modelName: 'Description', column_name: '(not available)' }
} {
  chunk: [
    {
      resourceId: '8b2e5d9a-4369-47c0-bb2b-eb2e8252009d',
      code: '1',
      title: 'Опис 1',
      matchApiUrl: 'https://e.archivelviv.gov.ua/fonds/196//inventories/622/',
      fetchApiUrl: 'https://e.archivelviv.gov.ua/fonds/196//inventories/622/'
    },
    {
      resourceId: '8b2e5d9a-4369-47c0-bb2b-eb2e8252009d',
      code: '1&quot;а&quot;',
      title: 'Опис 1&quot;а&quot;',
      matchApiUrl: 'https://e.archivelviv.gov.ua/fonds/196//inventories/620/',
      fetchApiUrl: 'https://e.archivelviv.gov.ua/fonds/196//inventories/620/'
    },
    {
      resourceId: '8b2e5d9a-4369-47c0-bb2b-eb2e8252009d',
      code: '2',
      title: 'Опис 2',
      matchApiUrl: 'https://e.archivelviv.gov.ua/fonds/196//inventories/623/',
      fetchApiUrl: 'https://e.archivelviv.gov.ua/fonds/196//inventories/623/'
    },
    {
      resourceId: '8b2e5d9a-4369-47c0-bb2b-eb2e8252009d',
      code: '2&quot;а&quot;',
      title: 'Опис 2&quot;а&quot;',
      matchApiUrl: 'https://e.archivelviv.gov.ua/fonds/196//inventories/621/',
      fetchApiUrl: 'https://e.archivelviv.gov.ua/fonds/196//inventories/621/'
    }
  ]
} -->