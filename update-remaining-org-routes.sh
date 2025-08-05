#!/bin/bash

# Script to update remaining organization API routes to use slug resolution

echo "🔧 Updating remaining organization API routes to use slug resolution..."

# List of files to update
files=(
  "app/api/organizations/[id]/roles/[roleId]/route.ts"
  "app/api/organizations/[id]/permission-sets/[setId]/route.ts"
  "app/api/organizations/[id]/members/[memberId]/route.ts"
  "app/api/organizations/[id]/members/[memberId]/profile/route.ts"
  "app/api/organizations/[id]/members/[memberId]/avatar/route.ts"
  "app/api/organizations/[id]/members/[memberId]/boards/route.ts"
  "app/api/organizations/[id]/members/[memberId]/timeline/route.ts"
  "app/api/organizations/[id]/members/[memberId]/timeline/[eventId]/route.ts"
  "app/api/organizations/[id]/members/[memberId]/engagements/route.ts"
  "app/api/organizations/[id]/members/[memberId]/engagements/[engagementId]/route.ts"
  "app/api/organizations/[id]/members/[memberId]/time-off/route.ts"
  "app/api/organizations/[id]/members/[memberId]/time-off/[entryId]/route.ts"
  "app/api/organizations/[id]/admin/profiles/[memberId]/avatar/reset/route.ts"
)

# Function to update a single file
update_file() {
  local file="$1"
  
  if [ ! -f "$file" ]; then
    echo "⚠️  File not found: $file"
    return
  fi
  
  echo "📝 Updating $file..."
  
  # 1. Add imports for slug resolution
  sed -i.bak 's/import { validateUUID/import { resolveOrganization } from "@\/lib\/slug-resolver"\
import { createErrorResponse } from "@\/lib\/api-auth-utils"\
import { validateUUID/g' "$file"
  
  # 2. Remove validateUUID import if it's now unused
  sed -i.bak 's/, validateUUID//g' "$file"
  sed -i.bak 's/validateUUID, //g' "$file"
  sed -i.bak 's/{ validateUUID }/{ }/g' "$file"
  
  # 3. Replace parameter extraction and validation
  sed -i.bak 's/const { id: organizationId } = await params/const { id: organizationSlugOrId } = await params/g' "$file"
  sed -i.bak 's/const { id: organizationId } = params/const { id: organizationSlugOrId } = await params/g' "$file"
  
  # 4. Replace UUID validation with slug resolution
  sed -i.bak '/const orgIdValidation = validateUUID(organizationId/,/)/c\
    \/\/ Resolve organization by slug or UUID\
    const orgResult = await resolveOrganization(organizationSlugOrId)\
    if (!orgResult.success) {\
      return createErrorResponse(orgResult.error, orgResult.status)\
    }\
    \
    const organizationId = orgResult.entity.id' "$file"
  
  # Clean up backup file
  rm -f "$file.bak"
  
  echo "✅ Updated $file"
}

# Update all files
for file in "${files[@]}"; do
  update_file "$file"
done

echo "🎉 All organization API routes updated to use slug resolution!"
echo "📊 Updated ${#files[@]} files"