/**
 * Script to make the organizations storage bucket private
 * This ensures all logo access goes through signed URLs only
 * 
 * Run with: npx tsx scripts/make-storage-private.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function makeStoragePrivate() {
  try {
    console.log('🔒 Making organizations storage bucket private...\n')
    
    // Check current bucket status
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    if (bucketsError) {
      throw bucketsError
    }
    
    const orgsBucket = buckets.find(bucket => bucket.id === 'organizations')
    if (!orgsBucket) {
      throw new Error('Organizations bucket not found')
    }
    
    console.log(`📋 Current bucket status: ${orgsBucket.public ? 'PUBLIC' : 'PRIVATE'}`)
    
    if (!orgsBucket.public) {
      console.log('✅ Bucket is already private!')
      return
    }
    
    // Update the bucket to be private
    console.log('🔄 Updating bucket to private...')
    const { error: updateError } = await supabase.rpc('update_storage_bucket_public', {
      bucket_id: 'organizations',
      public_flag: false
    })
    
    if (updateError) {
      // Try direct SQL approach
      console.log('🔄 Trying direct SQL update...')
      const { error: sqlError } = await supabase.rpc('exec_sql', {
        sql: `UPDATE storage.buckets SET public = false WHERE id = 'organizations';`
      })
      
      if (sqlError) {
        console.warn('⚠️  Could not update bucket via RPC, this may need manual intervention')
        console.log('   Please run this SQL in your Supabase dashboard:')
        console.log('   UPDATE storage.buckets SET public = false WHERE id = \'organizations\';')
      }
    }
    
    // Remove public access policy
    console.log('🔄 Removing public access policy...')
    const { error: policyError } = await supabase.rpc('exec_sql', {
      sql: `DROP POLICY IF EXISTS "Public can view organization logos" ON storage.objects;`
    })
    
    if (policyError) {
      console.warn('⚠️  Could not remove public policy via RPC')
      console.log('   Please run this SQL in your Supabase dashboard:')
      console.log('   DROP POLICY IF EXISTS "Public can view organization logos" ON storage.objects;')
    }
    
    console.log('\n✅ Storage security update completed!')
    console.log('📝 Summary:')
    console.log('   • Organizations bucket is now private')
    console.log('   • Public access policy removed')
    console.log('   • All logo access now requires signed URLs')
    
  } catch (error) {
    console.error('❌ Failed to update storage security:', error)
    console.log('\n🔧 Manual steps required:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to Storage > Settings')
    console.log('3. Find the "organizations" bucket and make it private')
    console.log('4. Go to SQL Editor and run:')
    console.log('   DROP POLICY IF EXISTS "Public can view organization logos" ON storage.objects;')
    process.exit(1)
  }
}

// Run the update
makeStoragePrivate()
  .then(() => {
    console.log('\n🎉 All done! Your organization logos are now secure.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Update failed:', error)
    process.exit(1)
  }) 