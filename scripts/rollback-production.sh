#!/bin/bash

# Production Database Rollback Script
# This script helps rollback migrations if something goes wrong

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

echo -e "${RED}🚨 PRODUCTION DATABASE ROLLBACK SCRIPT 🚨${NC}"
echo -e "${RED}====================================${NC}"
echo ""

# Safety check
echo -e "${RED}WARNING: You are about to ROLLBACK the PRODUCTION database!${NC}"
echo -e "Database URL is set in PRODUCTION_DATABASE_URL environment variable"
echo ""
echo -e "${YELLOW}This will revert to the previous migration.${NC}"
echo ""
read -p "Are you absolutely sure you want to continue? (type 'rollback' to proceed): " confirm

if [ "$confirm" != "rollback" ]; then
    echo -e "${GREEN}Rollback cancelled.${NC}"
    exit 1
fi

# Show current migration status
echo ""
echo -e "${YELLOW}Current migration status:${NC}"
DATABASE_URL="$PRODUCTION_DATABASE_URL" bunx prisma migrate status

# Get the last migration name
echo ""
read -p "Enter the name of the migration to rollback to (or 'cancel' to exit): " migration_name

if [ "$migration_name" == "cancel" ]; then
    echo -e "${GREEN}Rollback cancelled.${NC}"
    exit 1
fi

echo ""
echo -e "${RED}⚠️  This is a destructive operation that cannot be undone!${NC}"
echo -e "${YELLOW}You are about to rollback to: ${migration_name}${NC}"
read -p "Type 'ROLLBACK PRODUCTION' to confirm: " final_confirm

if [ "$final_confirm" != "ROLLBACK PRODUCTION" ]; then
    echo -e "${GREEN}Rollback cancelled.${NC}"
    exit 1
fi

# Perform rollback
echo ""
echo -e "${YELLOW}Rolling back production database...${NC}"

# Note: Prisma doesn't have a built-in rollback command
# You'll need to manually restore from backup or use raw SQL
echo -e "${RED}Manual rollback steps:${NC}"
echo "1. Restore from your database backup"
echo "2. OR manually reverse the migration using SQL"
echo ""
echo "To view the migration SQL that needs to be reversed:"
echo "cat prisma/migrations/${migration_name}/migration.sql"
echo ""
echo -e "${YELLOW}After manual rollback, update the _prisma_migrations table:${NC}"
echo "DELETE FROM _prisma_migrations WHERE migration_name > '${migration_name}';"

echo ""
echo -e "${RED}Rollback must be performed manually for safety.${NC}"