/**
 * Migration script to convert organization logo URLs to filenames
 * 
 * This script updates organizations that have full URLs stored in the logo field
 * to store just the filename portion, following the new pattern.
 * 
 * Example:
 * Before: https://erprvaquhseykdxfzwea.supabase.co/storage/v1/object/public/organizations/ec17a4c8-a7f6-41dd-af1a-edd626bc15a5/logo/1750840733141_SnapZen%202.png
 * After: 1750840733141_SnapZen%202.png
 * 
 * Run with: npx tsx scripts/migrate-organization-logos.ts
 */

import { createClient } from '@supabase/supabase-js'

// Note: Next.js automatically loads .env.local files, so no need for dotenv

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateOrganizationLogos() {
  try {
    console.log('🔍 Fetching organizations with logo URLs...')
    
    // Get all organizations with logo field
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('id, name, logo')
      .not('logo', 'is', null)
    
    if (error) {
      throw error
    }
    
    if (!organizations || organizations.length === 0) {
      console.log('✅ No organizations with logos found')
      return
    }
    
    console.log(`📋 Found ${organizations.length} organizations with logos`)
    
    let migratedCount = 0
    let skippedCount = 0
    
    for (const org of organizations) {
      const { id, name, logo } = org
      
      // Skip if logo is null or already a filename (doesn't start with http)
      if (!logo || !logo.startsWith('http')) {
        console.log(`⏭️  Skipping ${name} - already has filename format`)
        skippedCount++
        continue
      }
      
      // Extract filename from URL
      // Example URL: https://erprvaquhseykdxfzwea.supabase.co/storage/v1/object/public/organizations/ec17a4c8-a7f6-41dd-af1a-edd626bc15a5/logo/1750840733141_SnapZen%202.png
      // We want: 1750840733141_SnapZen%202.png
      
      const urlParts = logo.split('/')
      const filename = urlParts[urlParts.length - 1] // Get the last part after the final /
      
      if (!filename || filename === logo) {
        console.log(`⚠️  Skipping ${name} - could not extract filename from: ${logo}`)
        skippedCount++
        continue
      }
      
      console.log(`🔄 Migrating ${name}:`)
      console.log(`   From: ${logo}`)
      console.log(`   To: ${filename}`)
      
      // Update the organization with just the filename
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo: filename })
        .eq('id', id)
      
      if (updateError) {
        console.error(`❌ Failed to update ${name}:`, updateError.message)
        continue
      }
      
      console.log(`✅ Successfully migrated ${name}`)
      migratedCount++
    }
    
    console.log('\n📊 Migration Summary:')
    console.log(`✅ Migrated: ${migratedCount}`)
    console.log(`⏭️  Skipped: ${skippedCount}`)
    console.log(`📋 Total: ${organizations.length}`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migrateOrganizationLogos()
  .then(() => {
    console.log('\n🎉 Migration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error)
    process.exit(1)
  }) 