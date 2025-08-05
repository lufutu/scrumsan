const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkTaskStates() {
  try {
    console.log('🔍 Checking all task states...\n')
    
    // Get all tasks for the board you're working on
    const tasks = await prisma.task.findMany({
      where: {
        boardId: '295a5423-951f-4edf-9a3f-2cddda1eb263' // From your debug data
      },
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
      }
    })
    
    console.log(`📊 Found ${tasks.length} tasks for board 295a5423-951f-4edf-9a3f-2cddda1eb263:\n`)
    
    const categories = {
      backlog: [],
      sprint: [],
      orphaned: [],
      board: []
    }
    
    tasks.forEach(task => {
      if (!task.sprintId && !task.columnId) {
        categories.backlog.push(task)
      } else if (task.sprintId && task.sprintColumnId) {
        categories.sprint.push(task)
      } else if (task.sprintId && !task.sprintColumnId) {
        categories.orphaned.push(task)
      } else if (task.columnId) {
        categories.board.push(task)
      }
    })
    
    console.log('🗂️  BACKLOG TASKS (sprintId: null, columnId: null):')
    console.log(`   Count: ${categories.backlog.length}`)
    categories.backlog.forEach(task => {
      console.log(`   - ${task.title} (${task.id.slice(0, 8)}...)`)
    })
    
    console.log('\n🏃 SPRINT TASKS (has both sprintId and sprintColumnId):')
    console.log(`   Count: ${categories.sprint.length}`)
    categories.sprint.forEach(task => {
      console.log(`   - ${task.title} (${task.id.slice(0, 8)}...) - Sprint: ${task.sprintId?.slice(0, 8)}..., Column: ${task.sprintColumnId?.slice(0, 8)}...`)
    })
    
    console.log('\n🚨 ORPHANED TASKS (has sprintId but no sprintColumnId):')
    console.log(`   Count: ${categories.orphaned.length}`)
    categories.orphaned.forEach(task => {
      console.log(`   - ${task.title} (${task.id.slice(0, 8)}...) - Sprint: ${task.sprintId?.slice(0, 8)}..., Column: null`)
    })
    
    console.log('\n📋 BOARD TASKS (has columnId):')
    console.log(`   Count: ${categories.board.length}`)
    categories.board.forEach(task => {
      console.log(`   - ${task.title} (${task.id.slice(0, 8)}...) - Column: ${task.columnId?.slice(0, 8)}...`)
    })
    
    if (categories.orphaned.length > 0) {
      console.log('\n🔧 FIXING ORPHANED TASKS...')
      const result = await prisma.task.updateMany({
        where: {
          id: { in: categories.orphaned.map(t => t.id) }
        },
        data: {
          sprintId: null,
          sprintColumnId: null,
          columnId: null
        }
      })
      console.log(`✅ Fixed ${result.count} orphaned tasks - moved to backlog`)
    } else {
      console.log('\n✅ No orphaned tasks found!')
    }
    
  } catch (error) {
    console.error('❌ Error checking task states:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTaskStates()