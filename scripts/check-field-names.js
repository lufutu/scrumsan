#!/usr/bin/env node
/**
 * Field Name Checker
 * Searches for potential Prisma field name mismatches
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 Checking for field name mismatches...\n');

// Common field mappings from snake_case to camelCase
const fieldMappings = {
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
  'uploaded_at': 'uploadedAt',
  'item_code': 'itemCode',
  'task_type': 'taskType',
  'board_id': 'boardId',
  'user_id': 'userId',
  'task_id': 'taskId',
  'organization_id': 'organizationId',
  'project_id': 'projectId',
  'sprint_id': 'sprintId',
  'column_id': 'columnId',
  'parent_id': 'parentId',
  'epic_id': 'epicId',
  'story_points': 'storyPoints',
  'due_date': 'dueDate',
  'start_date': 'startDate',
  'end_date': 'endDate',
  'join_date': 'joinDate',
  'full_name': 'fullName',
  'avatar_url': 'avatarUrl',
  'billing_email': 'billingEmail',
  'permission_set_id': 'permissionSetId',
  'custom_field_id': 'customFieldId',
  'checklist_id': 'checklistId',
  'completed_at': 'completedAt',
  'completed_by': 'completedBy',
  'created_by': 'createdBy',
  'invited_by': 'invitedBy',
  'accepted_by': 'acceptedBy',
  'accepted_at': 'acceptedAt',
  'triggered_by': 'triggeredBy',
  'resource_id': 'resourceId',
  'entity_id': 'entityId',
  'source_task_id': 'sourceTaskId',
  'target_task_id': 'targetTaskId',
  'relation_type': 'relationType',
  'activity_type': 'activityType',
  'old_value': 'oldValue',
  'new_value': 'newValue',
  'hours_logged': 'hoursLogged',
  'date_logged': 'dateLogged',
  'sprint_column_id': 'sprintColumnId',
  'wip_limit': 'wipLimit',
  'is_done': 'isDone',
  'is_backlog': 'isBacklog',
  'is_finished': 'isFinished',
  'is_priority': 'isPriority',
  'is_archived': 'isArchived',
  'is_read': 'isRead',
  'is_required': 'isRequired',
  'is_default': 'isDefault',
  'is_active': 'isActive',
  'hours_per_week': 'hoursPerWeek',
  'working_hours_per_week': 'workingHoursPerWeek',
  'secondary_email': 'secondaryEmail',
  'marital_status': 'maritalStatus',
  'board_type': 'boardType'
};

const issuesFound = [];

console.log('📋 Checking for snake_case field usage in TypeScript files...\n');

// Check for object property access patterns
Object.keys(fieldMappings).forEach(snakeCase => {
  const camelCase = fieldMappings[snakeCase];
  
  try {
    // Check for .field_name usage (object property access)
    const propertyAccessCmd = `rg "\\\.${snakeCase}\\b" --type ts --type tsx -n || true`;
    const propertyResults = execSync(propertyAccessCmd, { encoding: 'utf8' }).trim();
    
    if (propertyResults) {
      issuesFound.push({
        type: 'property_access',
        snakeCase,
        camelCase,
        occurrences: propertyResults.split('\n').filter(line => line.trim()).length,
        details: propertyResults.split('\n').slice(0, 5) // Show first 5 occurrences
      });
    }
    
    // Check for "field_name": true in select statements
    const selectCmd = `rg "${snakeCase}.*true" --type ts --type tsx -n || true`;
    const selectResults = execSync(selectCmd, { encoding: 'utf8' }).trim();
    
    if (selectResults && !selectResults.includes('user_metadata')) {
      issuesFound.push({
        type: 'select_statement',
        snakeCase,
        camelCase,
        occurrences: selectResults.split('\n').filter(line => line.trim()).length,
        details: selectResults.split('\n').slice(0, 3)
      });
    }
    
  } catch (error) {
    // Ignore errors for fields that don't exist
  }
});

// Report results
if (issuesFound.length === 0) {
  console.log('✅ No field name mismatches found!');
  console.log('🚀 All field names appear to be using correct camelCase format');
} else {
  console.log('❌ Field name mismatches found:\n');
  
  issuesFound.forEach(issue => {
    console.log(`🔸 ${issue.type === 'property_access' ? 'Property Access' : 'Select Statement'}: ${issue.snakeCase} → ${issue.camelCase}`);
    console.log(`   Occurrences: ${issue.occurrences}`);
    console.log(`   Examples:`);
    issue.details.forEach(detail => {
      if (detail.trim()) {
        console.log(`     ${detail}`);
      }
    });
    console.log('');
  });
  
  console.log('💡 Recommendations:');
  console.log('1. Replace snake_case field names with camelCase equivalents');
  console.log('2. Use Prisma field names (camelCase) in select statements');  
  console.log('3. Exception: Supabase auth user_metadata fields are correct as snake_case');
  console.log('\n📖 See CLAUDE.md "Database Indexing Rule" for complete guide');
}

console.log(`\n📊 Summary: ${issuesFound.length} potential issues found`);