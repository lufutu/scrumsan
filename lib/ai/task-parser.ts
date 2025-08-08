import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { AITaskGenerationSchema, type AITaskInput, type AITaskGeneration, type AITask } from './schemas'
import { logger } from '@/lib/logger'

/**
 * AI Task Parser Service
 * Generates structured tasks from natural language input using OpenAI
 */
export class AITaskParser {
  private model = openai('gpt-4o-mini') // Cost-effective model for task generation

  /**
   * Generate tasks from natural language input
   */
  async generateTasks(input: AITaskInput): Promise<AITaskGeneration> {
    try {
      logger.log('AI Task Parser: Starting task generation', {
        inputLength: input.input.length,
        boardType: input.context.boardType,
        maxTasks: input.options?.maxTasks
      })

      const prompt = this.buildPrompt(input)
      
      const { object } = await generateObject({
        model: this.model,
        schema: AITaskGenerationSchema,
        prompt,
        temperature: 0.7, // Balance creativity with consistency
        maxTokens: 4000, // Generous limit for complex task generation
      })

      logger.log('AI Task Parser: Successfully generated tasks', {
        taskCount: object.tasks.length,
        boardType: object.boardType
      })

      return object
    } catch (error) {
      logger.error('AI Task Parser: Generation failed', error)
      throw new Error('Failed to generate tasks. Please try again with different input.')
    }
  }

  /**
   * Build the AI prompt based on input context
   */
  private buildPrompt(input: AITaskInput): string {
    const { context, options } = input
    
    let prompt = `You are an expert product manager and scrum master. Generate structured tasks from the following requirements:

REQUIREMENTS:
${input.input}

CONTEXT:
- Board Type: ${context.boardType || 'scrum'}
- Organization: ${context.organizationId}
- Max Tasks: ${options?.maxTasks || 10}
- Detail Level: ${options?.detailLevel || 'detailed'}`

    if (context.existingTasks && context.existingTasks.length > 0) {
      prompt += `\n- Existing Tasks: ${context.existingTasks.map(t => `"${t.title}" (${t.taskType})`).join(', ')}`
    }

    if (context.teamMembers && context.teamMembers.length > 0) {
      prompt += `\n- Team Members: ${context.teamMembers.map(m => `${m.name}${m.skills?.length ? ` (skills: ${m.skills.join(', ')})` : ''}`).join(', ')}`
    }

    if (context.projectGoals) {
      prompt += `\n- Project Goals: ${context.projectGoals}`
    }

    if (context.constraints) {
      prompt += `\n- Constraints: ${context.constraints}`
    }

    prompt += `

TASK TYPES (use these exact values):
- story: New functionality being created
- improvement: Existing functionalities needing additional work  
- bug: Errors, flaws, failures
- task: Technical work not covered by other types
- note: Valuable or relevant information
- idea: Product improvement thoughts

PRIORITIES (use these exact values):
- critical: Urgent, blocking issues
- high: Important, should be done soon
- medium: Standard priority (default)
- low: Nice to have, can wait

STORY POINTS (optional, use fibonacci): 1, 2, 3, 5, 8, 13, 21

INSTRUCTIONS:
1. Break down the requirements into ${options?.maxTasks || 10} or fewer actionable tasks
2. Each task should be specific, measurable, and achievable
3. Use appropriate task types based on the work description
4. Assign realistic priorities based on business impact and urgency
5. Estimate story points for development tasks (stories, improvements, bugs)
6. For Scrum: Consider sprint planning and task dependencies
7. For Kanban: Focus on workflow and task relationships
8. Include acceptance criteria for complex tasks
9. Suggest appropriate team member assignments if team info provided
10. Provide reasoning for key decisions (priority, story points, sprint assignment)

${context.boardType === 'scrum' ? `
SCRUM SPECIFIC:
- Assign tasks to sprints: "backlog", "sprint-1", "sprint-2", or "current"
- Consider task dependencies when planning sprints
- Break large features into multiple smaller tasks
- Include both user-facing and technical tasks
` : `
KANBAN SPECIFIC:
- All tasks will go to the backlog/to-do column initially  
- Focus on smooth workflow and minimal dependencies
- Prioritize tasks for continuous delivery
`}

Generate a well-structured set of tasks that a development team can immediately start working on.`

    return prompt
  }

  /**
   * Generate tasks for a specific column (Kanban) or sprint (Scrum)
   */
  async generateColumnTasks(
    input: string,
    context: {
      boardType: 'scrum' | 'kanban'
      columnName?: string
      sprintName?: string
      organizationId: string
      maxTasks?: number
    }
  ): Promise<AITask[]> {
    const taskInput: AITaskInput = {
      input,
      context: {
        boardType: context.boardType,
        organizationId: context.organizationId,
        existingTasks: [],
        teamMembers: []
      },
      options: {
        maxTasks: context.maxTasks || 5,
        includeSubtasks: false,
        detailLevel: 'detailed',
        generateSprintPlan: false,
        suggestAssignees: false
      }
    }

    const generation = await this.generateTasks(taskInput)
    return generation.tasks
  }

  /**
   * Generate tasks with image context (future enhancement)
   */
  async generateTasksWithImage(
    input: AITaskInput,
    imageUrl: string
  ): Promise<AITaskGeneration> {
    // For now, just use text input - image support can be added later
    logger.log('AI Task Parser: Image input received but not yet supported', { imageUrl })
    return this.generateTasks(input)
  }
}

// Singleton instance
export const aiTaskParser = new AITaskParser()

/**
 * Convenience function for quick task generation
 */
export async function generateAITasks(
  input: string,
  boardType: 'scrum' | 'kanban' = 'scrum',
  organizationId: string,
  options?: Partial<AITaskInput['options']>
): Promise<AITaskGeneration> {
  const taskInput: AITaskInput = {
    input,
    context: {
      boardType,
      organizationId,
      existingTasks: [],
      teamMembers: []
    },
    options: {
      maxTasks: 10,
      includeSubtasks: false,
      detailLevel: 'detailed',
      generateSprintPlan: boardType === 'scrum',
      suggestAssignees: true,
      ...options
    }
  }

  return aiTaskParser.generateTasks(taskInput)
}