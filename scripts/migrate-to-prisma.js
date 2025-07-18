#!/usr/bin/env node

/**
 * Migration Script: Supabase to Prisma
 * 
 * This script helps automate the migration from Supabase direct queries
 * to Prisma API calls by:
 * 1. Finding files with Supabase database queries
 * 2. Providing migration suggestions
 * 3. Generating replacement code patterns
 */

const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = './components';
const HOOKS_DIR = './hooks';

// Patterns to find Supabase usage
const SUPABASE_PATTERNS = [
  /\.from\(['"`]([^'"`]+)['"`]\)/g,
  /supabase\.from\(['"`]([^'"`]+)['"`]\)/g,
  /\.select\(/g,
  /\.insert\(/g,
  /\.update\(/g,
  /\.delete\(/g,
  /\.eq\(/g,
  /\.gte\(/g,
  /\.lte\(/g,
  /\.like\(/g,
  /\.ilike\(/g,
  /\.order\(/g,
];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = [];
    
    SUPABASE_PATTERNS.forEach(pattern => {
      const fileMatches = [...content.matchAll(pattern)];
      matches.push(...fileMatches.map(match => ({
        pattern: pattern.toString(),
        match: match[0],
        line: content.substring(0, match.index).split('\n').length,
        table: match[1] || 'unknown'
      })));
    });
    
    return matches.length > 0 ? { filePath, matches } : null;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

function scanDirectory(dir) {
  const results = [];
  
  function walkDir(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    files.forEach(file => {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.includes('node_modules')) {
        walkDir(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const result = scanFile(filePath);
        if (result) {
          results.push(result);
        }
      }
    });
  }
  
  walkDir(dir);
  return results;
}

function generateMigrationSuggestions(results) {
  console.log('\n🔍 SUPABASE TO PRISMA MIGRATION ANALYSIS\n');
  console.log('=' * 50);
  
  results.forEach(file => {
    console.log(`\n📁 File: ${file.filePath}`);
    console.log('-'.repeat(file.filePath.length + 8));
    
    const tableUsage = {};
    file.matches.forEach(match => {
      if (match.table !== 'unknown') {
        tableUsage[match.table] = (tableUsage[match.table] || 0) + 1;
      }
      console.log(`   Line ${match.line}: ${match.match}`);
    });
    
    // Suggest appropriate hook
    const tables = Object.keys(tableUsage);
    if (tables.length > 0) {
      console.log(`\n   💡 Suggested hooks:`);
      tables.forEach(table => {
        const hookSuggestion = getHookSuggestion(table);
        if (hookSuggestion) {
          console.log(`      - ${hookSuggestion} (for ${table} operations)`);
        }
      });
    }
  });
  
  console.log(`\n📊 SUMMARY`);
  console.log('=' * 20);
  console.log(`Total files needing migration: ${results.length}`);
  
  const allTables = new Set();
  results.forEach(file => {
    file.matches.forEach(match => {
      if (match.table !== 'unknown') {
        allTables.add(match.table);
      }
    });
  });
  
  console.log(`Tables being used: ${Array.from(allTables).join(', ')}`);
}

function getHookSuggestion(table) {
  const hookMap = {
    'boards': 'useBoards / useBoard',
    'tasks': 'useTasks',
    'projects': 'useProjects / useProject', 
    'organizations': 'useOrganizations (existing)',
    'sprints': 'useSprints (needs creation)',
    'board_columns': 'useBoards (columns included)',
    'users': 'useUsers (needs creation)',
    'project_members': 'useProjectMembers (needs creation)',
    'organization_members': 'useOrganizationMembers (needs creation)',
  };
  
  return hookMap[table] || `use${table.charAt(0).toUpperCase() + table.slice(1)} (needs creation)`;
}

// Run the analysis
console.log('🚀 Starting Supabase to Prisma migration analysis...\n');

const componentResults = scanDirectory(COMPONENTS_DIR);
const hookResults = scanDirectory(HOOKS_DIR);
const allResults = [...componentResults, ...hookResults];

if (allResults.length === 0) {
  console.log('✅ No Supabase database queries found! Migration might be complete.');
} else {
  generateMigrationSuggestions(allResults);
  
  console.log(`\n🛠️  NEXT STEPS`);
  console.log('=' * 20);
  console.log('1. Review the migration guide: SUPABASE_TO_PRISMA_MIGRATION.md');
  console.log('2. Start with high-priority components');
  console.log('3. Test each component after migration');
  console.log('4. Create missing custom hooks as needed');
  console.log('5. Update error handling and loading states');
}