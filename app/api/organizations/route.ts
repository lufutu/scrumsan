import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const organizationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  logo: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient() 
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_members (
          user_id,
          role
        )
      `)
    
    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = organizationSchema.parse(body)
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')
    
    // Create organization
    const { data, error } = await supabase
      .from('organizations')
      .insert([{
        name: validatedData.name,
        description: validatedData.description,
        owner_id: user.id
      }])
      .select()
      .single()
    
    if (error) throw error
    
    // Add owner as organization member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert([{
        organization_id: data.id,
        user_id: user.id,
        role: 'owner'
      }])
    
    if (memberError) throw memberError

    // Return the organization data with ID so frontend can upload logo
    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
} 