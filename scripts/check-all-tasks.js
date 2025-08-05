const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkAllTasks() {
  try {
    console.log('🔍 Checking ALL tasks in database...\n')
    
    // Get count of all tasks
    const totalTasks = await prisma.task.count()
    console.log(`📊 Total tasks in database: ${totalTasks}`)
    
    if (totalTasks === 0) {
      console.log('❌ No tasks found in database at all!')
      return
    }
    
    // Get all tasks with their relationships
    const tasks = await prisma.task.findMany({
      select: {
        id: true,
        title: true,
        sprintId: true,
        sprintColumnId: true,
        columnId: true,
        boardId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20 // Limit to 20 most recent
    })
    
    console.log(`\n📋 Last ${Math.min(tasks.length, 20)} tasks:`)
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title}`)
      console.log(`   ID: ${task.id}`)
      console.log(`   Board: ${task.boardId}`)
      console.log(`   Sprint: ${task.sprintId || 'null'}`)
      console.log(`   SprintColumn: ${task.sprintColumnId || 'null'}`)
      console.log(`   Column: ${task.columnId || 'null'}`)
      console.log(`   Created: ${task.createdAt.toISOString()}`)
      console.log('')
    })
    
    // Check for orphaned tasks across all boards
    const orphanedTasks = await prisma.task.findMany({
      where: {
        sprintId: { not: null },
        sprintColumnId: null
      }
    })
    
    console.log(`🚨 Total orphaned tasks across all boards: ${orphanedTasks.length}`)
    if (orphanedTasks.length > 0) {
      orphanedTasks.forEach(task => {
        console.log(`   - ${task.title} (Board: ${task.boardId}, Sprint: ${task.sprintId})`)
      })
    }
    
    // Get unique board IDs
    const boardIds = await prisma.task.groupBy({
      by: ['boardId'],
      _count: { boardId: true }
    })
    
    console.log(`\n📊 Tasks by board:`)
    for (const board of boardIds) {
      console.log(`   Board ${board.boardId}: ${board._count.boardId} tasks`)
    }
    
  } catch (error) {
    console.error('❌ Error checking tasks:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAllTasks()