## Brief: gotchas.md

Focus: Sharp edges that will bite a contributor — ranked by severity.

Recent fix / revert / bug commits (for Critical / High candidates):
```
4702c84 fix: cookie Secure flag based on APP_URL scheme, not NODE_ENV (HTTP support)
ddfa5cc fix: import @nuxt/ui styles in main.css
20fefb2 fix: use Nuxt auto-import prefixed component names (SetupStepPassword etc.)
b99fd73 fix: disable SSR — SPA mode eliminates hydration mismatch on HTTP
7557b4e fix: remove Transition wrapper from SetupWizard to fix hydration
a2b7fd4 fix: hydration mismatch — ClientOnly wrapper + colorMode classSuffix
d21ddc4 fix: auto-create Settings record in docker entrypoint for first-run setup
4dc239b fix: remove prisma stdout from migration SQL
5f3e08f fix: add initial Prisma migration + disable CI workflow
bbc6834 fix: rename to ПодписачЪ in UI, setupCompleted default false, gitignore .claude/.serena
1fd2eed fix: Prisma 7 — use @prisma/adapter-pg for PrismaClient initialization
f2511cf fix: revert datasourceUrl — Prisma 7 uses prisma.config.ts for runtime URL
c372cf8 fix: Prisma 7 datasourceUrl + shared package exports point to compiled JS
45f218f fix: prisma.config.ts — fallback URL for docker build (env not available at build time)
fe4fa59 fix: Prisma 7 config — use env() helper + dotenv/config, copy shared to bot, keep schema clean
d03024e fix: Docker — add DATABASE_URL to schema.prisma, copy shared package to bot image
674bd6d fix: Dockerfile — copy full node_modules for pnpm compatibility
bd47185 fix: correct type cast in Google Analytics integration
9cb9691 fix: review fixes for subscribers API and CSV export
```

TODO / FIXME / HACK / XXX comments (raw material for Medium / Low):
```
/home/ubuntu/apps/podpisach/apps/web/server/api/integrations/ga/index.post.ts:6:    .regex(/^G-[A-Z0-9]+$/, 'Measurement ID должен быть в формате G-XXXXXXXXXX'),
/home/ubuntu/apps/podpisach/apps/web/.output/server/node_modules/@prisma/client/runtime/client.js:2:`);return t.length<e?t:t.slice(-e)}function Ni(){ct.length=0}var $i=B(_i(),1);function en(e){let t=(0,$i.default)(e);if(t===0)return e;let r=new RegExp(`^[ \\t]{${t}}`,"gm");return e.replace(r,"")}var Li="prisma+postgres",Gt=`${Li}:`;function Vi(e){return e?.toString().startsWith(`${Gt}//`)??!1}function tn(e){if(!Vi(e))return!1;let{host:t}=new URL(e);return t.includes("localhost")||t.includes("127.0.0.1")||t.includes("[::1]")}var mt={};Ne(mt,{error:()=>Du,info:()=>Nu,log:()=>Ou,query:()=>Mu,should:()=>Ui,tags:()=>dt,warn:()=>rn});var dt={error:be("prisma:error"),warn:lt("prisma:warn"),info:oe("prisma:info"),query:xe("prisma:query")},Ui={warn:()=>!process.env.PRISMA_DISABLE_WARNINGS};function Ou(...e){console.log(...e)}function rn(e,...t){Ui.warn()&&console.warn(`${dt.warn} ${e}`,...t)}function Nu(e,...t){console.info(`${dt.info} ${e}`,...t)}function Du(e,...t){console.error(`${dt.error} ${e}`,...t)}function Mu(e,...t){console.log(`${dt.query} ${e}`,...t)}function se(e,t){throw new Error(t)}function nn({onlyFirst:e=!1}={}){let r=["[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?(?:\\u0007|\\u001B\\u005C|\\u009C))","(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR
```

GitNexus queries for context:
- `gitnexus_impact` on any symbol whose change caused a past fix commit
- `gitnexus_cypher` with `MATCH (f:Function)-[:CALLS]->(g:Function) WHERE f.name CONTAINS "try" OR f.name CONTAINS "retry"`

Do NOT cover:
- Architectural decisions (`decisions.md`)
- Deployment issues (`deployment.md`)

MUST have ## Critical / ## High / ## Medium / ## Low sections with ≥10 entries total. Each entry: **Problem** / **Risk** / **Workaround**.
