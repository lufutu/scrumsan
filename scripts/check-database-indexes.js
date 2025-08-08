#!/usr/bin/env node
/**
 * Database Index Checker
 * Validates that all Prisma models have proper indexing
 * Run: node scripts/check-database-indexes.js
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

console.log('🔍 Checking database indexes in Prisma schema...\n');

// Extract models from schema
const models = [];
const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
let match;

while ((match = modelRegex.exec(schema)) !== null) {
  const modelName = match[1];
  const modelContent = match[2];
  
  // Extract fields with foreign key patterns
  const fields = [];
  const fieldRegex = /(\w+)\s+(\w+[\?\[\]]*)\s+@(?:map\(["']([^"']+)["']\)\s+)?@db\.Uuid/g;
  let fieldMatch;
  
  while ((fieldMatch = fieldRegex.exec(modelContent)) !== null) {
    const fieldName = fieldMatch[1];
    const mappedName = fieldMatch[3] || fieldName;
    
    // Skip id fields
    if (fieldName !== 'id') {
      fields.push({ name: fieldName, mappedName });
    }
  }
  
  // Extract indexes
  const indexes = [];
  const indexRegex = /@@index\(\[([^\]]+)\]\)/g;
  let indexMatch;
  
  while ((indexMatch = indexRegex.exec(modelContent)) !== null) {
    indexes.push(indexMatch[1]);
  }
  
  models.push({
    name: modelName,
    fields,
    indexes,
    content: modelContent
  });
}

console.log(`📋 Found ${models.length} models in schema\n`);

let hasIssues = false;
let totalIndexes = 0;

models.forEach(model => {
  console.log(`📊 Model: ${model.name}`);
  
  const issues = [];
  const foreignKeyFields = model.fields.filter(field => 
    field.name.endsWith('Id') || field.name.endsWith('_id')
  );
  
  totalIndexes += model.indexes.length;
  
  // Check foreign key indexes
  foreignKeyFields.forEach(field => {
    const hasIndex = model.indexes.some(index => 
      index.includes(field.name) || index.includes(field.mappedName)
    );
    
    if (!hasIndex) {
      issues.push(`❌ Missing index for foreign key: ${field.name}`);
      hasIssues = true;
    } else {
      console.log(`   ✅ ${field.name} is indexed`);
    }
  });
  
  // Check if it's a junction table (has exactly 2 foreign keys)
  if (foreignKeyFields.length === 2 && !model.name.toLowerCase().includes('profile')) {
    const field1 = foreignKeyFields[0].name;
    const field2 = foreignKeyFields[1].name;
    const hasUniqueConstraint = model.content.includes(`@@unique([${field1}, ${field2}])`) ||
                               model.content.includes(`@@unique([${field2}, ${field1}])`);
    
    if (!hasUniqueConstraint) {
      issues.push(`❌ Junction table missing unique constraint: @@unique([${field1}, ${field2}])`);
      hasIssues = true;
    }
  }
  
  // Check for timestamp fields that should be indexed
  const timestampFields = ['createdAt', 'updatedAt', 'created_at', 'updated_at'];
  timestampFields.forEach(field => {
    if (model.content.includes(field)) {
      const hasTimestampIndex = model.indexes.some(index => index.includes(field));
      if (!hasTimestampIndex && foreignKeyFields.length > 0) {
        issues.push(`⚠️  Consider adding composite index with timestamp: [foreignKey, ${field}]`);
      }
    }
  });
  
  if (issues.length === 0) {
    console.log('   🟢 All foreign keys properly indexed');
  } else {
    issues.forEach(issue => console.log(`   ${issue}`));
    hasIssues = true;
  }
  
  console.log(`   📈 Total indexes: ${model.indexes.length}`);
  console.log('');
});

console.log(`\n📊 Summary:`);
console.log(`- Models checked: ${models.length}`);
console.log(`- Total indexes: ${totalIndexes}`);

if (hasIssues) {
  console.log('❌ Issues found! Please add missing indexes before migration.');
  console.log('\n💡 Quick fixes:');
  console.log('1. Add @@index([fieldName]) for each foreign key');
  console.log('2. Add @@unique([field1, field2]) for junction tables');
  console.log('3. Consider composite indexes for common query patterns');
  console.log('\n📖 See CLAUDE.md "Database Indexing Rule" for complete guide');
  process.exit(1);
} else {
  console.log('✅ All models have proper indexing!');
  console.log('🚀 Ready for migration');
}