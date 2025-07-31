# Production Database Migration Guide

## 🚨 Important: Production Database Setup

### Setting up Production Database URL
1. Create a `.env.production` file in your project root (DO NOT commit this file)
2. Add your production database URL:
   ```bash
   PRODUCTION_DATABASE_URL="your-production-database-url"
   ```
3. Or export it in your terminal session:
   ```bash
   export PRODUCTION_DATABASE_URL="your-production-database-url"
   ```

## 📋 Pre-Migration Checklist

### 1. Backup Production Database
```bash
# Using Supabase Dashboard:
# 1. Go to your Supabase project dashboard
# 2. Navigate to Settings > Database
# 3. Click "Backups" tab
# 4. Create a new backup

# OR using pg_dump:
pg_dump "$PRODUCTION_DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Test Migrations on Staging
1. Create a staging database in Supabase
2. Restore your production backup to staging
3. Test the migration script on staging first

### 3. Notify Team/Users
- Schedule a maintenance window
- Notify users of potential downtime
- Prepare rollback plan

## 🗄️ Empty Database vs Existing Database

### If Your Production Database is Empty:
- **Use `prisma db push`** - This creates the schema directly without migration history
- **Faster and simpler** for initial setup
- **No migration history** is created (which is fine for new databases)

### If Your Production Database Has Existing Data:
- **Use `prisma migrate deploy`** - This applies migrations with proper history tracking  
- **Safer for existing data** as it follows the exact migration steps
- **Maintains migration history** for future changes

## 🚀 Migration Steps

### Option 1: Using the Migration Script (Recommended)
```bash
# First, set your production database URL
export PRODUCTION_DATABASE_URL="your-production-database-url"

# Or source from .env.production
source .env.production

# Run the production migration script
./scripts/migrate-production.sh
```

The script will:
1. Ask for multiple confirmations
2. **Detect if database is empty** and offer appropriate options
3. For empty databases: Push schema directly (recommended)
4. For existing databases: Show migration status and apply migrations
5. Generate Prisma client

### Option 2: Manual Migration

#### For Empty Database (Recommended):
```bash
# 1. Set production database URL
export DATABASE_URL="$PRODUCTION_DATABASE_URL"

# 2. Push schema to empty database (no migration history needed)
bunx prisma db push --accept-data-loss

# 3. Generate Prisma Client
bunx prisma generate

# 4. Unset the DATABASE_URL to avoid accidents
unset DATABASE_URL
```

#### For Existing Database with Migration History:
```bash
# 1. Set production database URL
export DATABASE_URL="$PRODUCTION_DATABASE_URL"

# 2. Check migration status
bunx prisma migrate status

# 3. Deploy migrations (production-safe command)
bunx prisma migrate deploy

# 4. Generate Prisma Client
bunx prisma generate

# 5. Unset the DATABASE_URL to avoid accidents
unset DATABASE_URL
```

### Option 3: Using Environment File
```bash
# 1. Ensure .env.production contains DATABASE_URL
# DATABASE_URL="your-production-database-url"

# 2. Run migrations with production env
bunx dotenv -e .env.production -- prisma migrate deploy

# 3. Generate client
bunx dotenv -e .env.production -- prisma generate

# 4. Remove production env file
rm .env.production
```

## 🔄 Rollback Plan

### If Migration Fails:

1. **Immediate Rollback from Backup**:
```bash
# Restore from Supabase backup
# Go to Supabase Dashboard > Database > Backups
# Select your pre-migration backup and restore
```

2. **Manual SQL Rollback**:
```bash
# Connect to production database
psql "$PRODUCTION_DATABASE_URL"

# Check migration history
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC;

# Remove failed migration record
DELETE FROM _prisma_migrations WHERE migration_name = 'MIGRATION_NAME_HERE';

# Run reverse SQL manually if needed
```

## 📊 Post-Migration Verification

### 1. Check Application Health
```bash
# Test your application endpoints
curl https://your-app-url.com/api/health

# Check logs for errors
# Monitor error tracking service (Sentry, etc.)
```

### 2. Verify Database Schema
```bash
# Connect to production
psql "$PRODUCTION_DATABASE_URL"

# Check tables
\dt

# Verify specific schema changes
\d table_name
```

### 3. Test Critical Features
- [ ] User authentication
- [ ] Organization creation/switching
- [ ] Board operations
- [ ] Task management
- [ ] File uploads
- [ ] Real-time features

## ⚠️ Common Issues & Solutions

### Issue 1: Connection Timeout
```bash
# Try using direct connection instead of pooler
# Update your PRODUCTION_DATABASE_URL to use the direct connection format
# postgresql://[user]:[password]@db.[project-ref].supabase.co:5432/postgres
```

### Issue 2: Migration Already Applied
```bash
# Check migration status
bunx prisma migrate status

# If needed, mark as applied without running
bunx prisma migrate resolve --applied "MIGRATION_NAME"
```

### Issue 3: Schema Drift
```bash
# Reset to baseline (DANGEROUS - only with backup)
bunx prisma migrate reset --skip-generate --skip-seed
```

### Issue 4: Empty Database Not Detected
```bash
# If the script doesn't detect your empty database, manually check:
psql "$PRODUCTION_DATABASE_URL" -c "\dt"

# If you see "No relations found", it's empty. Use db push:
DATABASE_URL="$PRODUCTION_DATABASE_URL" bunx prisma db push --accept-data-loss
```

## 🔐 Security Notes

1. **Never commit production credentials** to version control
2. **Use environment variables** for production URLs
3. **Rotate credentials** after migration if exposed
4. **Enable SSL** for production connections
5. **Use connection pooling** for better performance

## 📞 Emergency Contacts

- Supabase Support: support@supabase.io
- Database Admin: [Your DBA contact]
- DevOps Team: [Your DevOps contact]

## 📝 Migration Log Template

```
Date: ____________
Migrated by: ____________
Migration version: ____________
Start time: ____________
End time: ____________
Issues encountered: ____________
Resolution: ____________
```

Remember: Always backup before migrating production!