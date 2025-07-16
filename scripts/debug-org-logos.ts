/**
 * Debug script to check organization logos in database vs storage
 * 
 * Run with: npx tsx scripts/debug-org-logos.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugOrganizationLogos() {
  try {
    console.log('🔍 Checking organization logos...\n')
    
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
    
    console.log(`📋 Found ${organizations.length} organizations with logos:\n`)
    
    for (const org of organizations) {
      console.log(`🏢 Organization: ${org.name}`)
      console.log(`   ID: ${org.id}`)
      console.log(`   Logo in DB: ${org.logo}`)
      
      // List files in storage for this organization
      const { data: files, error: listError } = await supabase.storage
        .from('organizations')
        .list(`${org.id}/logo`, {
          limit: 100,
          offset: 0,
        })
      
      if (listError) {
        console.log(`   ❌ Error listing files: ${listError.message}`)
      } else if (files && files.length > 0) {
        console.log(`   📁 Files in storage:`)
        files.forEach(file => {
          const isMatch = file.name === org.logo
          console.log(`      ${isMatch ? '✅' : '❌'} ${file.name}${isMatch ? ' (MATCH)' : ''}`)
        })
      } else {
        console.log(`   📭 No files in storage`)
      }
      
      // Try to get the public URL
      if (org.logo) {
        const { data: urlData } = supabase.storage
          .from('organizations')
          .getPublicUrl(`${org.id}/logo/${org.logo}`)
        
        console.log(`   🔗 Generated URL: ${urlData.publicUrl}`)
      }
      
      console.log('') // Empty line for readability
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
    process.exit(1)
  }
}

// Run the debug
debugOrganizationLogos()
  .then(() => {
    console.log('🎉 Debug completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Debug failed:', error)
    process.exit(1)
  }) 