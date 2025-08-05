const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixOrphanedTasks() {
  try {
    console.log('🔍 Searching for orphaned tasks...')
    
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
        sprintColumnId: true,
        columnId: true,
        boardId: true
      }
    })
    
    console.log(`🔧 Found ${orphanedTasks.length} orphaned tasks:`)
    orphanedTasks.forEach(task => {
      console.log(`  - ${task.title} (${task.id}) - sprintId: ${task.sprintId}, sprintColumnId: ${task.sprintColumnId}`)
    })
    
    if (orphanedTasks.length === 0) {
      console.log('✅ No orphaned tasks found!')
      return
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
    console.log('Tasks should now appear in the Product Backlog!')
    
  } catch (error) {
    console.error('❌ Error fixing orphaned tasks:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixOrphanedTasks()