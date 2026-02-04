# PostgreSQL Migration Guide for Render Deployment

This guide explains how to migrate your DoctorPod application from SQLite to PostgreSQL for persistent data storage on Render.

## Why PostgreSQL?

On Render's free tier, the filesystem is **ephemeral** — any data written to the local disk (including SQLite databases) is lost when:
- Your service restarts
- You redeploy your application
- The service scales down

PostgreSQL provides persistent storage that survives restarts and deployments.

## Step-by-Step Migration

### 1. Create PostgreSQL Database on Render

1. Log into your [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure your database:
   - **Name**: `doctorpod-db` (or any name you prefer)
   - **Database**: `doctorpod` (or any name)
   - **User**: Auto-generated
   - **Region**: Same as your web service (for lower latency)
   - **PostgreSQL Version**: 15 or 16 (latest stable)
   - **Plan**: Free (for testing) or paid (for production)
4. Click **"Create Database"**
5. Wait for the database to be provisioned (1-2 minutes)

### 2. Get Database Connection Details

After creation, you'll see:
- **Internal Database URL**: Use this for connecting from your Render web service
- **External Database URL**: Use this for connecting from your local machine or external tools

The URL format is:
```
postgres://username:password@host:port/database
```

Example:
```
postgres://doctorpod_user:abc123xyz@dpg-xxxxx-a.oregon-postgres.render.com:5432/doctorpod
```

### 3. Update Your Render Web Service Environment Variables

1. Go to your Render web service dashboard
2. Click on **"Environment"** tab
3. Add the following environment variable:
   - **Key**: `DATABASE_TYPE`
   - **Value**: `postgres`
4. Add another environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Paste the **Internal Database URL** from step 2
5. Click **"Save Changes"**

The environment variables should look like:
```
DATABASE_TYPE=postgres
DATABASE_URL=postgres://doctorpod_user:password@dpg-xxxxx.oregon-postgres.render.com/doctorpod
BASE_URL=https://doctorpod.onrender.com
SESSION_SECRET=your-secret-key
```

### 4. Update Your Code (Already Done in This Branch!)

The following files have been created/updated:

✅ **package.json** - Added PostgreSQL dependencies (`pg`, `pg-hstore`)

✅ **database/schema_postgres.sql** - PostgreSQL-compatible schema

✅ **src/utils/db_new.js** - Database utility supporting both SQLite and PostgreSQL

✅ **initDatabase_new.js** - Database initialization script for both databases

✅ **.env.example** - Updated with PostgreSQL configuration examples

### 5. Replace Old Database Files

Before deploying, you need to replace the old database utilities with the new ones:

**Option A: Manual Replacement (Recommended for safety)**
```bash
# Backup old files
cp src/utils/db.js src/utils/db.js.backup
cp initDatabase.js initDatabase.js.backup

# Replace with new files
cp src/utils/db_new.js src/utils/db.js
cp initDatabase_new.js initDatabase.js
```

**Option B: Direct replacement (if you're confident)**
```bash
mv src/utils/db_new.js src/utils/db.js
mv initDatabase_new.js initDatabase.js
```

### 6. Initialize PostgreSQL Database

Before deploying to Render, you can initialize the database schema:

**From your local machine:**
```bash
# Set environment variables
export DATABASE_TYPE=postgres
export DATABASE_URL="postgres://username:password@host:port/database"

# Run initialization
npm run init-db
```

**Or let Render initialize it:**

Add a build command in your Render web service settings:
```bash
npm install && npm run init-db
```

### 7. Deploy to Render

1. **Commit your changes:**
```bash
git add .
git commit -m "feat: migrate to PostgreSQL for persistent storage"
git push origin feature/postgres-migration
```

2. **Merge to main (or your deployment branch):**
```bash
git checkout main
git merge feature/postgres-migration
git push origin main
```

3. **Render will automatically deploy** (if auto-deploy is enabled)

Or manually trigger a deploy from the Render dashboard.

### 8. Verify the Migration

1. Check Render logs:
   - Go to your web service → **Logs**
   - Look for: `✅ Using PostgreSQL database`
   - Verify no database errors

2. Test your application:
   - Add a doctor
   - Create a booking
   - Restart your Render service (from dashboard)
   - Verify the data persists after restart

## Local Development

For local development, you can continue using SQLite:

1. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

2. Edit `.env`:
```env
DATABASE_TYPE=sqlite
DB_PATH=./database/doctorpod.db
BASE_URL=http://localhost:3000
```

3. Initialize local database:
```bash
npm run init-db
npm start
```

## Switching Between SQLite and PostgreSQL

The application automatically detects which database to use based on the `DATABASE_TYPE` environment variable:

- `DATABASE_TYPE=sqlite` → Uses SQLite (local development)
- `DATABASE_TYPE=postgres` → Uses PostgreSQL (production)

## Troubleshooting

### Error: "relation does not exist"
**Solution**: Run database initialization:
```bash
npm run init-db
```

### Error: "Connection refused"
**Solution**: 
- Check that `DATABASE_URL` is correct
- Verify PostgreSQL instance is running on Render
- Use **Internal Database URL** for Render services

### Error: "SSL required"
**Solution**: The connection is already configured with SSL for Render. If you still see this error, ensure you're using the correct database URL.

### Data not persisting
**Solution**:
- Verify `DATABASE_TYPE=postgres` is set in Render environment
- Check logs for database connection messages
- Ensure `DATABASE_URL` is using the Internal URL from Render

## Data Migration (Optional)

If you have existing data in SQLite that you want to migrate to PostgreSQL:

1. Export data from SQLite:
```bash
sqlite3 database/doctorpod.db .dump > data_export.sql
```

2. Convert SQLite dump to PostgreSQL format (manual editing required):
   - Change `INTEGER PRIMARY KEY AUTOINCREMENT` to `SERIAL PRIMARY KEY`
   - Change `DATETIME` to `TIMESTAMP`
   - Remove SQLite-specific commands

3. Import to PostgreSQL:
```bash
psql $DATABASE_URL < data_export_postgres.sql
```

## Cost Considerations

**Render Free Tier:**
- PostgreSQL: 1 GB storage, 90 days retention
- After 90 days, database is deleted (upgrade to paid plan)

**Paid Plans:**
- Starter: $7/month (10 GB storage, permanent)
- Standard: $20/month (50 GB storage, better performance)

## Next Steps

✅ Test your application thoroughly on Render
✅ Monitor database performance and storage
✅ Set up regular backups (Render provides automatic backups on paid plans)
✅ Consider upgrading to a paid plan before the 90-day free trial expires

## Support

- [Render PostgreSQL Docs](https://render.com/docs/databases)
- [PostgreSQL Official Docs](https://www.postgresql.org/docs/)
- [Node.js pg Library](https://node-postgres.com/)

---

**Created**: February 2026
**Status**: Ready for deployment
**Branch**: feature/postgres-migration
