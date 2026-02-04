# PostgreSQL Migration - Quick Reference

## What Changed?

### New Files Created:
- `database/schema_postgres.sql` - PostgreSQL-compatible database schema
- `src/utils/db_new.js` - Universal database connection (SQLite + PostgreSQL)
- `initDatabase_new.js` - Database initialization for both databases
- `docs/POSTGRES_MIGRATION_GUIDE.md` - Complete migration guide

### Modified Files:
- `package.json` - Added `pg` and `pg-hstore` dependencies
- `.env.example` - Added PostgreSQL configuration variables

### Files to Replace (Before Deployment):
```bash
mv src/utils/db_new.js src/utils/db.js
mv initDatabase_new.js initDatabase.js
```

## Quick Setup for Render

### 1. Create PostgreSQL Database
- Dashboard → New → PostgreSQL
- Copy the **Internal Database URL**

### 2. Set Environment Variables in Render
```
DATABASE_TYPE=postgres
DATABASE_URL=<paste-internal-database-url-here>
```

### 3. Deploy
```bash
git add .
git commit -m "feat: PostgreSQL migration"
git push origin main
```

## Key Features

✅ **Dual Database Support**: Works with both SQLite (local) and PostgreSQL (production)
✅ **Auto-Detection**: Automatically uses the right database based on `DATABASE_TYPE`
✅ **Zero Code Changes**: Your existing controllers work without modification
✅ **Persistent Storage**: Data survives restarts and redeployments

## Environment Variables

### Local Development (.env)
```env
DATABASE_TYPE=sqlite
DB_PATH=./database/doctorpod.db
BASE_URL=http://localhost:3000
```

### Production (Render)
```env
DATABASE_TYPE=postgres
DATABASE_URL=postgres://user:pass@host:5432/dbname
BASE_URL=https://doctorpod.onrender.com
```

## Testing Checklist

- [ ] Create PostgreSQL database on Render
- [ ] Add environment variables to Render
- [ ] Replace old db files with new ones
- [ ] Deploy to Render
- [ ] Check logs for "✅ Using PostgreSQL database"
- [ ] Add a doctor (test write)
- [ ] Restart service on Render
- [ ] Verify doctor still exists (test persistence)

## Important Notes

⚠️ **SQLite on Render**: Data is ephemeral (lost on restart)
✅ **PostgreSQL on Render**: Data is persistent (survives restarts)

🆓 **Free Tier**: 1 GB storage, 90 days (then deleted)
💰 **Paid Plans**: From $7/month for permanent storage

## Support

See `docs/POSTGRES_MIGRATION_GUIDE.md` for detailed instructions.
