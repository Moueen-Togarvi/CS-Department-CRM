# CS Department CRM

A Next.js 16 and PostgreSQL application for managing a Computer Science
department's students, faculty, courses, attendance, results, timetables,
announcements, documents, and final-year projects.

## Requirements

- Node.js 22.6 or newer (Node.js 24 is recommended)
- npm
- A PostgreSQL database (the included environment template is configured for
  Neon-style pooled and direct connections)

## Local setup

1. Install the locked dependencies:

   ```bash
   npm ci
   ```

2. Copy `.env.example` to `.env` and set:

   - `DATABASE_URL` to the pooled application connection
   - `DIRECT_URL` to the direct connection used by Prisma schema commands
   - `NEXTAUTH_SECRET` to a strong random value
   - `NEXTAUTH_URL` to `http://localhost:3000`

3. Create or synchronize the database schema:

   ```bash
   npm run db:push
   ```

4. Optionally load the demo dataset:

   ```bash
   npm run db:seed
   ```

   Warning: the seed clears existing application records before inserting the
   demo dataset. Do not run it against a database containing data you need.

5. Start the development server:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

## Demo accounts

After seeding, these accounts are available:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@csdept.edu` | `admin123` |
| Faculty | `sarah.khan@csdept.edu` | `faculty123` |
| Student | `CS-2023-001@student.csdept.edu` | `student123` |

Change these passwords before using the application outside local/demo use.

## Verification and production

```bash
npm run lint
npm exec tsc -- --noEmit
npm run build
npm start
```

The production build uses Next.js standalone output and packages the required
static and public assets into `.next/standalone`.
