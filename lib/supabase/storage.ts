import { createClient } from '@/lib/supabase/client'

/**
 * Generate a signed URL for an organization logo
 * @param organizationId - The organization ID
 * @param logoPath - The logo filename or path (e.g., "1750840733141_SnapZen 2.png")
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 */
export async function getOrganizationLogoUrl(
  organizationId: string, 
  logoPath: string, 
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const supabase = createClient()
    
    // Construct the full path: organizationId/logo/filename
    const fullPath = `${organizationId}/logo/${logoPath}`
    
    const { data, error } = await supabase.storage
      .from('organizations')
      .createSignedUrl(fullPath, expiresIn)
    
    if (error) {
      console.error('Error creating signed URL:', error)
      return null
    }
    
    return data.signedUrl
  } catch (error) {
    console.error('Error generating organization logo URL:', error)
    return null
  }
}

/**
 * Get signed URL for organization logo (private bucket)
 * All logo access must go through signed URLs for security
 * @param organizationId - The organization ID  
 * @param logoPath - The logo filename or path
 * @param expiresIn - Expiration time in seconds (default: 24 hours)
 */
export async function getOrganizationLogoSignedUrl(
  organizationId: string,
  logoPath: string,
  expiresIn: number = 86400 // 24 hours
): Promise<string | null> {
  try {
    const supabase = createClient()
    
    // Construct the full path: organizationId/logo/filename
    const fullPath = `${organizationId}/logo/${logoPath}`
    
    // Create signed URL for private bucket access
    const { data, error } = await supabase.storage
      .from('organizations')
      .createSignedUrl(fullPath, expiresIn)
    
    if (error) {
      console.error('Error creating signed URL:', error)
      return null
    }
    
    return data.signedUrl
  } catch (error) {
    console.error('Error generating organization logo URL:', error)
    return null
  }
}

/**
 * Upload organization logo and return just the filename
 * @param organizationId - The organization ID
 * @param file - The file to upload
 */
export async function uploadOrganizationLogo(
  organizationId: string,
  file: File
): Promise<{ filename: string; publicUrl: string }> {
  const supabase = createClient()
  
  // Create filename with timestamp - avoid special characters
  const timestamp = Date.now()
  const fileExt = file.name.split('.').pop()
  // Replace spaces and special characters with underscores
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const fileName = `${timestamp}_${cleanFileName}`
  const filePath = `${organizationId}/logo/${fileName}`
  

  
  const { data, error } = await supabase.storage
    .from('organizations')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })
  
  if (error) {
    throw new Error(`Failed to upload logo: ${error.message}`)
  }
  
  // Get signed URL for immediate display
  const signedUrl = await getOrganizationLogoSignedUrl(organizationId, fileName)
  
  return {
    filename: fileName,
    publicUrl: signedUrl || ''
  }
}

/**
 * List files in organization logo storage (for debugging)
 * @param organizationId - The organization ID
 */
export async function listOrganizationLogos(organizationId: string) {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.storage
      .from('organizations')
      .list(`${organizationId}/logo`, {
        limit: 100,
        offset: 0,
      })
    
    if (error) {
      console.error('Error listing organization logos:', error)
      return []
    }
    

    return data
  } catch (error) {
    console.error('Error listing organization logos:', error)
    return []
  }
}

/**
 * Check if organization logo file exists
 * @param organizationId - The organization ID
 * @param logoPath - The logo filename
 */
export async function checkOrganizationLogoExists(
  organizationId: string,
  logoPath: string
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const fullPath = `${organizationId}/logo/${logoPath}`
    
    const { data, error } = await supabase.storage
      .from('organizations')
      .list(`${organizationId}/logo`, {
        limit: 100,
        offset: 0,
      })
    
    if (error) {
      console.error('Error checking file existence:', error)
      return false
    }
    
    const fileExists = data.some(file => file.name === logoPath)
    return fileExists
  } catch (error) {
    console.error('Error checking file existence:', error)
    return false
  }
} 