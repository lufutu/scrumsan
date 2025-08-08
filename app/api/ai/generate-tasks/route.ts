import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { aiTaskParser } from '@/lib/ai/task-parser'
import { validateTaskInput, createDefaultInput, type AITask } from '@/lib/ai/schemas'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Rate limiting (simple in-memory store - in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10 // requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in ms

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimits = rateLimitMap.get(userId)
  
  if (!userLimits || now > userLimits.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (userLimits.count >= RATE_LIMIT) {
    return false
  }
  
  userLimits.count++
  return true
}

const generateTasksRequestSchema = z.object({
  input: z.string().min(10, 'Please provide more detailed requirements'),
  boardType: z.enum(['scrum', 'kanban']).optional().default('scrum'),
  boardId: z.string().uuid().optional(),
  columnId: z.string().uuid().optional(),
  sprintId: z.string().uuid().optional(),
  options: z.object({
    maxTasks: z.number().min(1).max(20).default(10),
    detailLevel: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed'),
    generateSprintPlan: z.boolean().default(false),
    suggestAssignees: z.boolean().default(true)
  }).optional()
})

export async function POST(req: NextRequest) {
  try {
    // Authentication
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request
    const body = await req.json()
    const validatedData = generateTasksRequestSchema.parse(body)

    logger.log('AI Generate Tasks API: Request received', {
      userId: user.id,
      inputLength: validatedData.input.length,
      boardType: validatedData.boardType,
      maxTasks: validatedData.options?.maxTasks
    })

    // Get organization context
    let organizationId: string
    
    if (validatedData.boardId) {
      // Get organization from board
      const board = await prisma.board.findFirst({
        where: {
          id: validatedData.boardId,
          organization: {
            members: {
              some: { userId: user.id }
            }
          }
        },
        select: { organizationId: true }
      })
      
      if (!board) {
        return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
      }
      
      organizationId = board.organizationId
    } else {
      // Get user's active organization (fallback)
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: user.id },
        select: { organizationId: true }
      })
      
      if (!membership) {
        return NextResponse.json({ error: 'No organization found' }, { status: 400 })
      }
      
      organizationId = membership.organizationId
    }

    // Get context data for better task generation
    const [teamMembers, existingTasks] = await Promise.all([
      // Get team members
      prisma.organizationMember.findMany({
        where: { organizationId },
        select: {
          id: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      }),
      
      // Get existing tasks if board specified
      validatedData.boardId ? prisma.task.findMany({
        where: { boardId: validatedData.boardId },
        select: {
          id: true,
          title: true,
          taskType: true
        },
        take: 20 // Recent tasks for context
      }) : []
    ])

    // Build AI input with context
    const aiInput = createDefaultInput(
      validatedData.input,
      validatedData.boardType,
      organizationId,
      {
        boardId: validatedData.boardId,
        columnId: validatedData.columnId,
        sprintId: validatedData.sprintId,
        teamMembers: teamMembers.map(member => ({
          id: member.user.id,
          name: member.user.fullName || member.user.email?.split('@')[0] || 'User',
          skills: [] // TODO: Add skills support later
        })),
        existingTasks: existingTasks.map(task => ({
          id: task.id,
          title: task.title,
          taskType: task.taskType || 'story'
        }))
      }
    )

    // Override with request options
    if (validatedData.options) {
      aiInput.options = {
        ...aiInput.options,
        ...validatedData.options
      }
    }

    // Generate tasks using AI
    const generation = await aiTaskParser.generateTasks(aiInput)

    // Log successful generation
    logger.log('AI Generate Tasks API: Successfully generated tasks', {
      userId: user.id,
      taskCount: generation.tasks.length,
      boardType: generation.boardType
    })

    return NextResponse.json({
      success: true,
      data: generation
    })

  } catch (error) {
    logger.error('AI Generate Tasks API: Error', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return NextResponse.json(
        { error: 'AI service temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate tasks. Please try again.' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    // Authentication
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current rate limit status
    const userLimits = rateLimitMap.get(user.id)
    const now = Date.now()
    
    let remaining = RATE_LIMIT
    let resetTime = now + RATE_LIMIT_WINDOW
    
    if (userLimits && now <= userLimits.resetTime) {
      remaining = Math.max(0, RATE_LIMIT - userLimits.count)
      resetTime = userLimits.resetTime
    }

    return NextResponse.json({
      rateLimit: {
        limit: RATE_LIMIT,
        remaining,
        resetTime
      },
      status: 'AI task generation service is operational'
    })

  } catch (error) {
    logger.error('AI Generate Tasks API: Status check error', error)
    return NextResponse.json(
      { error: 'Service status check failed' },
      { status: 500 }
    )
  }
}