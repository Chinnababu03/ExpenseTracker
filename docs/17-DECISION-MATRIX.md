# Technology Decision Matrix

| Decision | Selected | Alternatives | Main reason |
|---|---|---|---|
| Database | PostgreSQL | MongoDB, Firestore, DynamoDB | relational + SQL analytics |
| Managed DB | Supabase | Neon, RDS, self-hosted | integrated Auth/Storage/Postgres |
| Frontend | Next.js | React SPA, Vue | integrated server/client model |
| Backend initially | Next.js server-side | FastAPI, Express | fewer moving parts |
| Mutation mechanism | Server Actions | REST, GraphQL | low boilerplate for same app |
| Database access | Supabase server client + SQL | ORM | SQL visibility |
| ORM | None initially | Prisma, Drizzle | DE learning objective |
| Money | NUMERIC | integer minor units | explicit financial type |
| IDs | UUID | BIGINT | safe distributed identifiers |
| Operational model | normalized | single wide table | integrity + flexibility |
| Analytics initially | PostgreSQL views | warehouse | avoid premature infrastructure |
| Materialization | only when justified | always materialize | freshness vs performance |
| Ingestion | batch | streaming | workload is file-oriented |
| Ingestion language | Python later | TypeScript | DE ecosystem |
| Transformations | SQL then dbt | dbt immediately | learn fundamentals first |
| Scheduling | managed cron | Airflow | low initial complexity |
| CI | GitHub Actions | other CI | integrated repository workflow |
| Hosting | Vercel | Netlify, Render | Next.js integration |

This matrix is not a universal technology ranking. It records decisions for this project's current workload and learning objectives.
