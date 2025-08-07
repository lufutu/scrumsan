import { prisma } from '@/lib/prisma'

async function fixBoardLogos() {
  console.log('🔍 Finding boards with full URL logos...')
  
  // Find all boards with logos that are full URLs
  const boards = await prisma.board.findMany({
    where: {
      logo: {
        not: null,
        startsWith: 'https://'
      }
    },
    select: {
      id: true,
      name: true,
      logo: true
    }
  })

  console.log(`📋 Found ${boards.length} boards with full URL logos`)

  if (boards.length === 0) {
    console.log('✅ No boards need fixing!')
    return
  }

  for (const board of boards) {
    if (!board.logo) continue

    try {
      // Extract filename from URL
      // URL format: https://scrumsan.s3.ap-southeast-1.amazonaws.com/boards/{boardId}/logos/{filename}
      const urlParts = board.logo.split('/')
      const filename = urlParts[urlParts.length - 1]

      if (!filename) {
        console.log(`⚠️ Could not extract filename from ${board.logo}`)
        continue
      }

      // Update board to store only filename
      await prisma.board.update({
        where: { id: board.id },
        data: { logo: filename }
      })

      console.log(`✅ Updated board "${board.name}" logo: ${board.logo} -> ${filename}`)

    } catch (error) {
      console.error(`❌ Failed to update board "${board.name}":`, error)
    }
  }

  console.log('🎉 Board logo migration completed!')
}

// Run the migration
fixBoardLogos()
  .catch((error) => {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })