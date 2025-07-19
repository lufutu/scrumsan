import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { uploadOrganizationLogoToS3, deleteFileFromS3ByUrl } from '@/lib/aws/s3'

// POST /api/organizations/[id]/logo - Upload organization logo
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: organizationId } = await params

    // Check if user is a member of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: user.id
      }
    })

    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Parse the form data
    const formData = await req.formData()
    const file = formData.get('logo') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Get current organization to check for existing logo
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { logo: true }
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Upload new logo to S3
    const uploadResult = await uploadOrganizationLogoToS3(organizationId, file)

    // Update organization with new logo filename
    await prisma.organization.update({
      where: { id: organizationId },
      data: { logo: uploadResult.filename }
    })

    // Delete old logo if it exists and is different
    if (organization.logo && organization.logo !== uploadResult.filename) {
      try {
        // Construct old logo URL and delete it
        const region = process.env.AWS_REGION || 'ap-southeast-1'
        const bucket = process.env.AWS_S3_BUCKET || 'scrumsan'
        const oldLogoUrl = `https://${bucket}.s3.${region}.amazonaws.com/organizations/${organizationId}/logos/${organization.logo}`
        await deleteFileFromS3ByUrl(oldLogoUrl)
      } catch (deleteError) {
        console.error('Error deleting old logo:', deleteError)
        // Don't fail the upload if old logo deletion fails
      }
    }

    return NextResponse.json({
      success: true,
      filename: uploadResult.filename,
      url: uploadResult.url
    })

  } catch (error: unknown) {
    console.error('Error uploading organization logo:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload logo' },
      { status: 500 }
    )
  }
}

// DELETE /api/organizations/[id]/logo - Remove organization logo
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: organizationId } = await params

    // Check if user is a member of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: user.id
      }
    })

    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get current organization logo
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { logo: true }
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Remove logo from database
    await prisma.organization.update({
      where: { id: organizationId },
      data: { logo: null }
    })

    // Delete logo from S3 if it exists
    if (organization.logo) {
      try {
        const region = process.env.AWS_REGION || 'ap-southeast-1'
        const bucket = process.env.AWS_S3_BUCKET || 'scrumsan'
        const logoUrl = `https://${bucket}.s3.${region}.amazonaws.com/organizations/${organizationId}/logos/${organization.logo}`
        await deleteFileFromS3ByUrl(logoUrl)
      } catch (deleteError) {
        console.error('Error deleting logo from S3:', deleteError)
        // Don't fail the request if S3 deletion fails
      }
    }

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    console.error('Error removing organization logo:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove logo' },
      { status: 500 }
    )
  }
}