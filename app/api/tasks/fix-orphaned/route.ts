import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Find all orphaned tasks (have sprintId but no sprintColumnId)
    const orphanedTasks = await prisma.task.findMany({
      where: {
        sprintId: { not: null },
        sprintColumnId: null
      },
      select: {
        id: true,
        title: true,
        sprintId: true,
        boardId: true
      }
    })
    
    console.log(`🔧 Found ${orphanedTasks.length} orphaned tasks:`, orphanedTasks)
    
    if (orphanedTasks.length === 0) {
      return NextResponse.json({ 
        message: 'No orphaned tasks found',
        fixed: 0 
      })
    }
    
    // Fix orphaned tasks by moving them back to backlog
    const result = await prisma.task.updateMany({
      where: {
        sprintId: { not: null },
        sprintColumnId: null
      },
      data: {
        sprintId: null,
        sprintColumnId: null,
        columnId: null
      }
    })
    
    console.log(`✅ Fixed ${result.count} orphaned tasks - moved to backlog`)
    
    return NextResponse.json({
      message: `Successfully fixed ${result.count} orphaned tasks`,
      fixed: result.count,
      tasks: orphanedTasks
    })
    
  } catch (error: unknown) {
    console.error('Error fixing orphaned tasks:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fix orphaned tasks' },
      { status: 500 }
    )
  }
}