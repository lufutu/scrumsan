#!/bin/bash

# Production Database Migration Script
# This script safely migrates your production database

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Try to load .env.production if it exists
if [ -f ".env.production" ]; then
    echo -e "${GREEN}Loading environment variables from .env.production...${NC}"
    source .env.production
fi

# Check if production database URL is set
if [ -z "$PRODUCTION_DATABASE_URL" ]; then
    echo -e "${RED}Error: PRODUCTION_DATABASE_URL environment variable is not set${NC}"
    echo ""
    echo "Please set it in your .env.production file or export it:"
    echo "export PRODUCTION_DATABASE_URL=\"your-production-database-url\""
    echo ""
    if [ -f ".env.production" ]; then
        echo "Found .env.production file but PRODUCTION_DATABASE_URL is not set in it."
        echo "Please check your .env.production file contains:"
        echo "PRODUCTION_DATABASE_URL=\"your-production-database-url\""
    fi
    exit 1
fi

echo -e "${YELLOW}🚨 PRODUCTION DATABASE MIGRATION SCRIPT 🚨${NC}"
echo -e "${YELLOW}=================================${NC}"
echo ""

# Safety check 1: Confirm this is intentional
echo -e "${RED}WARNING: You are about to migrate the PRODUCTION database!${NC}"
echo -e "Database URL is set in PRODUCTION_DATABASE_URL environment variable"
echo ""
read -p "Are you absolutely sure you want to continue? (type 'yes' to proceed): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}Migration cancelled.${NC}"
    exit 1
fi

# Safety check 2: Backup reminder
echo ""
echo -e "${YELLOW}📋 Pre-migration checklist:${NC}"
echo "  ✓ Have you backed up the production database?"
echo "  ✓ Are all users notified of potential downtime?"
echo "  ✓ Have you tested these migrations on a staging database?"
echo ""
read -p "Have you completed all items above? (type 'yes' to proceed): " checklist

if [ "$checklist" != "yes" ]; then
    echo -e "${RED}Migration cancelled. Please complete the checklist first.${NC}"
    exit 1
fi

# No need to create temporary env file since we're using PRODUCTION_DATABASE_URL

# Check if database is empty (no _prisma_migrations table)
echo ""
echo -e "${YELLOW}Checking if database is empty...${NC}"
HAS_MIGRATIONS_TABLE=$(DATABASE_URL="$PRODUCTION_DATABASE_URL" bunx prisma db execute --stdin <<< "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '_prisma_migrations';" 2>/dev/null | grep -E '^[0-9]+$' || echo "0")

if [ "$HAS_MIGRATIONS_TABLE" = "0" ]; then
    echo -e "${YELLOW}Empty database detected. Need to create schema first.${NC}"
    echo ""
    echo -e "${YELLOW}Options for empty database:${NC}"
    echo "1. Push schema (recommended for empty database)"
    echo "2. Deploy migrations (will create migration history)"
    echo ""
    read -p "Choose option (1 or 2): " db_option
    
    if [ "$db_option" = "1" ]; then
        echo ""
        echo -e "${GREEN}Pushing schema to empty production database...${NC}"
        DATABASE_URL="$PRODUCTION_DATABASE_URL" bunx prisma db push --accept-data-loss
        echo -e "${GREEN}Schema pushed successfully!${NC}"
    elif [ "$db_option" = "2" ]; then
        echo ""
        echo -e "${GREEN}Deploying migrations to production...${NC}"
        DATABASE_URL="$PRODUCTION_DATABASE_URL" bunx prisma migrate deploy
    else
        echo -e "${RED}Invalid option. Migration cancelled.${NC}"
        exit 1
    fi
else
    # Database has existing schema, show migration status
    echo -e "${GREEN}Existing database detected with migration history.${NC}"
    echo ""
    echo -e "${YELLOW}Checking migration status...${NC}"
    DATABASE_URL="$PRODUCTION_DATABASE_URL" bunx prisma migrate status
    
    echo ""
    echo -e "${YELLOW}The above shows the current migration status.${NC}"
    read -p "Do you want to proceed with applying migrations? (type 'yes' to proceed): " proceed
    
    if [ "$proceed" != "yes" ]; then
        echo -e "${RED}Migration cancelled.${NC}"
        exit 1
    fi
    
    # Run migrations
    echo ""
    echo -e "${GREEN}Applying migrations to production...${NC}"
    DATABASE_URL="$PRODUCTION_DATABASE_URL" bunx prisma migrate deploy
fi

# Generate Prisma Client
echo ""
echo -e "${GREEN}Generating Prisma Client...${NC}"
DATABASE_URL="$PRODUCTION_DATABASE_URL" bunx prisma generate

# No cleanup needed

echo ""
echo -e "${GREEN}✅ Production migration completed successfully!${NC}"
echo ""
echo -e "${YELLOW}Post-migration steps:${NC}"
echo "  1. Verify application functionality"
echo "  2. Check error logs for any issues"
echo "  3. Monitor database performance"
echo ""
echo -e "${GREEN}Migration completed at: $(date)${NC}"