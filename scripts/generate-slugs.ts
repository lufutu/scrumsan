#!/usr/bin/env bun

/**
 * Data migration script to generate slugs for existing entities
 * This script should be run after adding slug fields to the database
 */

import { PrismaClient } from '@prisma/client'
import { generateSlug, generateUniqueSlug } from '../lib/slug-utils'

const prisma = new PrismaClient()

async function generateOrganizationSlugs() {
  console.log('🏢 Generating slugs for organizations...')
  
  const organizations = await prisma.organization.findMany({
    where: { slug: null },
    select: { id: true, name: true }
  })

  if (organizations.length === 0) {
    console.log('✅ All organizations already have slugs')
    return
  }

  // Get existing slugs to ensure uniqueness
  const existingSlugs = await prisma.organization.findMany({
    where: { slug: { not: null } },
    select: { slug: true }
  }).then(orgs => orgs.map(o => o.slug!))

  let processedCount = 0
  
  for (const org of organizations) {
    try {
      const baseSlug = generateSlug(org.name)
      const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs)
      
      await prisma.organization.update({
        where: { id: org.id },
        data: { slug: uniqueSlug }
      })
      
      existingSlugs.push(uniqueSlug)
      processedCount++
      
      console.log(`  ✅ ${org.name} -> ${uniqueSlug}`)
    } catch (error) {
      console.error(`  ❌ Failed to generate slug for ${org.name}:`, error)
    }
  }
  
  console.log(`📊 Generated slugs for ${processedCount}/${organizations.length} organizations\n`)
}

async function generateProjectSlugs() {
  console.log('📁 Generating slugs for projects...')
  
  const projects = await prisma.project.findMany({
    where: { slug: null },
    select: { id: true, name: true, organizationId: true }
  })

  if (projects.length === 0) {
    console.log('✅ All projects already have slugs')
    return
  }

  // Group projects by organization to ensure uniqueness within org
  const projectsByOrg = projects.reduce((acc, project) => {
    if (!acc[project.organizationId]) {
      acc[project.organizationId] = []
    }
    acc[project.organizationId].push(project)
    return acc
  }, {} as Record<string, typeof projects>)

  let processedCount = 0

  for (const [orgId, orgProjects] of Object.entries(projectsByOrg)) {
    // Get existing slugs for this organization
    const existingSlugs = await prisma.project.findMany({
      where: { 
        organizationId: orgId,
        slug: { not: null }
      },
      select: { slug: true }
    }).then(projects => projects.map(p => p.slug!))

    for (const project of orgProjects) {
      try {
        const baseSlug = generateSlug(project.name)
        const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs)
        
        await prisma.project.update({
          where: { id: project.id },
          data: { slug: uniqueSlug }
        })
        
        existingSlugs.push(uniqueSlug)
        processedCount++
        
        console.log(`  ✅ ${project.name} -> ${uniqueSlug}`)
      } catch (error) {
        console.error(`  ❌ Failed to generate slug for ${project.name}:`, error)
      }
    }
  }
  
  console.log(`📊 Generated slugs for ${processedCount}/${projects.length} projects\n`)
}

async function generateBoardSlugs() {
  console.log('📋 Generating slugs for boards...')
  
  const boards = await prisma.board.findMany({
    where: { slug: null },
    select: { id: true, name: true, organizationId: true }
  })

  if (boards.length === 0) {
    console.log('✅ All boards already have slugs')
    return
  }

  // Group boards by organization to ensure uniqueness within org
  const boardsByOrg = boards.reduce((acc, board) => {
    if (!acc[board.organizationId]) {
      acc[board.organizationId] = []
    }
    acc[board.organizationId].push(board)
    return acc
  }, {} as Record<string, typeof boards>)

  let processedCount = 0

  for (const [orgId, orgBoards] of Object.entries(boardsByOrg)) {
    // Get existing slugs for this organization
    const existingSlugs = await prisma.board.findMany({
      where: { 
        organizationId: orgId,
        slug: { not: null }
      },
      select: { slug: true }
    }).then(boards => boards.map(b => b.slug!))

    for (const board of orgBoards) {
      try {
        const baseSlug = generateSlug(board.name)
        const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs)
        
        await prisma.board.update({
          where: { id: board.id },
          data: { slug: uniqueSlug }
        })
        
        existingSlugs.push(uniqueSlug)
        processedCount++
        
        console.log(`  ✅ ${board.name} -> ${uniqueSlug}`)
      } catch (error) {
        console.error(`  ❌ Failed to generate slug for ${board.name}:`, error)
      }
    }
  }
  
  console.log(`📊 Generated slugs for ${processedCount}/${boards.length} boards\n`)
}

async function generateSprintSlugs() {
  console.log('🏃 Generating slugs for sprints...')
  
  const sprints = await prisma.sprint.findMany({
    where: { slug: null },
    select: { id: true, name: true, boardId: true }
  })

  if (sprints.length === 0) {
    console.log('✅ All sprints already have slugs')
    return
  }

  // Group sprints by board to ensure uniqueness within board
  const sprintsByBoard = sprints.reduce((acc, sprint) => {
    if (!acc[sprint.boardId]) {
      acc[sprint.boardId] = []
    }
    acc[sprint.boardId].push(sprint)
    return acc
  }, {} as Record<string, typeof sprints>)

  let processedCount = 0

  for (const [boardId, boardSprints] of Object.entries(sprintsByBoard)) {
    // Get existing slugs for this board
    const existingSlugs = await prisma.sprint.findMany({
      where: { 
        boardId: boardId,
        slug: { not: null }
      },
      select: { slug: true }
    }).then(sprints => sprints.map(s => s.slug!))

    for (const sprint of boardSprints) {
      try {
        const baseSlug = generateSlug(sprint.name)
        const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs)
        
        await prisma.sprint.update({
          where: { id: sprint.id },
          data: { slug: uniqueSlug }
        })
        
        existingSlugs.push(uniqueSlug)
        processedCount++
        
        console.log(`  ✅ ${sprint.name} -> ${uniqueSlug}`)
      } catch (error) {
        console.error(`  ❌ Failed to generate slug for ${sprint.name}:`, error)
      }
    }
  }
  
  console.log(`📊 Generated slugs for ${processedCount}/${sprints.length} sprints\n`)
}

async function validateSlugs() {
  console.log('🔍 Validating generated slugs...')
  
  // Check for any entities still missing slugs
  const [orgsWithoutSlugs, projectsWithoutSlugs, boardsWithoutSlugs, sprintsWithoutSlugs] = await Promise.all([
    prisma.organization.count({ where: { slug: null } }),
    prisma.project.count({ where: { slug: null } }),
    prisma.board.count({ where: { slug: null } }),
    prisma.sprint.count({ where: { slug: null } })
  ])

  let hasIssues = false

  if (orgsWithoutSlugs > 0) {
    console.log(`  ⚠️  ${orgsWithoutSlugs} organizations still missing slugs`)
    hasIssues = true
  }

  if (projectsWithoutSlugs > 0) {
    console.log(`  ⚠️  ${projectsWithoutSlugs} projects still missing slugs`)
    hasIssues = true
  }

  if (boardsWithoutSlugs > 0) {
    console.log(`  ⚠️  ${boardsWithoutSlugs} boards still missing slugs`)
    hasIssues = true
  }

  if (sprintsWithoutSlugs > 0) {
    console.log(`  ⚠️  ${sprintsWithoutSlugs} sprints still missing slugs`)
    hasIssues = true
  }

  if (!hasIssues) {
    console.log('  ✅ All entities have slugs')
  }

  // Check for duplicate slugs
  const [duplicateOrgSlugs, duplicateProjectSlugs, duplicateBoardSlugs, duplicateSprintSlugs] = await Promise.all([
    prisma.$queryRaw`
      SELECT slug, COUNT(*) as count 
      FROM organizations 
      WHERE slug IS NOT NULL 
      GROUP BY slug 
      HAVING COUNT(*) > 1
    `,
    prisma.$queryRaw`
      SELECT organization_id, slug, COUNT(*) as count 
      FROM projects 
      WHERE slug IS NOT NULL 
      GROUP BY organization_id, slug 
      HAVING COUNT(*) > 1
    `,
    prisma.$queryRaw`
      SELECT organization_id, slug, COUNT(*) as count 
      FROM boards 
      WHERE slug IS NOT NULL 
      GROUP BY organization_id, slug 
      HAVING COUNT(*) > 1
    `,
    prisma.$queryRaw`
      SELECT board_id, slug, COUNT(*) as count 
      FROM sprints 
      WHERE slug IS NOT NULL 
      GROUP BY board_id, slug 
      HAVING COUNT(*) > 1
    `
  ])

  if (Array.isArray(duplicateOrgSlugs) && duplicateOrgSlugs.length > 0) {
    console.log(`  ⚠️  Found ${duplicateOrgSlugs.length} duplicate organization slugs`)
    hasIssues = true
  }

  if (Array.isArray(duplicateProjectSlugs) && duplicateProjectSlugs.length > 0) {
    console.log(`  ⚠️  Found ${duplicateProjectSlugs.length} duplicate project slugs`)
    hasIssues = true
  }

  if (Array.isArray(duplicateBoardSlugs) && duplicateBoardSlugs.length > 0) {
    console.log(`  ⚠️  Found ${duplicateBoardSlugs.length} duplicate board slugs`)
    hasIssues = true
  }

  if (Array.isArray(duplicateSprintSlugs) && duplicateSprintSlugs.length > 0) {
    console.log(`  ⚠️  Found ${duplicateSprintSlugs.length} duplicate sprint slugs`)
    hasIssues = true
  }

  if (!hasIssues) {
    console.log('  ✅ No duplicate slugs found')
  }
  
  console.log('')
}

async function main() {
  console.log('🚀 Starting slug generation for existing entities...\n')

  try {
    await generateOrganizationSlugs()
    await generateProjectSlugs()
    await generateBoardSlugs()
    await generateSprintSlugs()
    await validateSlugs()
    
    console.log('✅ Slug generation completed successfully!')
  } catch (error) {
    console.error('❌ Error during slug generation:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  main()
}