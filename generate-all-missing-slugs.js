#!/usr/bin/env node

/**
 * Comprehensive Slug Generation Utility
 * 
 * This script ensures all entities in the database have proper slugs:
 * - Organizations: Unique globally
 * - Projects: Unique within organization
 * - Boards: Unique within organization  
 * - Sprints: Unique within board
 * 
 * Usage: node generate-all-missing-slugs.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function generateSlug(input) {
  return input
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
    .replace(/-+$/, '');
}

function generateUniqueSlug(baseSlug, existingSlugs) {
  let slug = baseSlug;
  let counter = 1;
  
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

async function generateAllMissingSlugs() {
  try {
    console.log('🔧 Generating missing slugs for all entities...\n');
    
    let totalGenerated = 0;
    
    // 1. Generate Organization slugs
    console.log('📊 Processing Organizations...');
    const orgsWithoutSlugs = await prisma.organization.findMany({
      where: { slug: null },
      select: { id: true, name: true }
    });
    
    if (orgsWithoutSlugs.length > 0) {
      console.log(`   Found ${orgsWithoutSlugs.length} organizations without slugs`);
      
      for (const org of orgsWithoutSlugs) {
        const baseSlug = generateSlug(org.name);
        const existingSlugs = await prisma.organization.findMany({
          where: { slug: { not: null } },
          select: { slug: true }
        }).then(orgs => orgs.map(o => o.slug));
        
        const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
        
        await prisma.organization.update({
          where: { id: org.id },
          data: { slug: uniqueSlug }
        });
        
        console.log(`   ✅ Generated slug "${uniqueSlug}" for organization "${org.name}"`);
        totalGenerated++;
      }
    } else {
      console.log('   ✅ All organizations already have slugs');
    }
    
    // 2. Generate Project slugs
    console.log('\n📊 Processing Projects...');
    const projectsWithoutSlugs = await prisma.project.findMany({
      where: { slug: null },
      include: {
        organization: { select: { id: true, name: true } }
      }
    });
    
    if (projectsWithoutSlugs.length > 0) {
      console.log(`   Found ${projectsWithoutSlugs.length} projects without slugs`);
      
      for (const project of projectsWithoutSlugs) {
        const baseSlug = generateSlug(project.name);
        const existingSlugs = await prisma.project.findMany({
          where: { 
            organizationId: project.organizationId,
            slug: { not: null } 
          },
          select: { slug: true }
        }).then(projects => projects.map(p => p.slug));
        
        const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
        
        await prisma.project.update({
          where: { id: project.id },
          data: { slug: uniqueSlug }
        });
        
        console.log(`   ✅ Generated slug "${uniqueSlug}" for project "${project.name}" in org "${project.organization?.name}"`);
        totalGenerated++;
      }
    } else {
      console.log('   ✅ All projects already have slugs (or no projects exist)');
    }
    
    // 3. Generate Board slugs
    console.log('\n📊 Processing Boards...');
    const boardsWithoutSlugs = await prisma.board.findMany({
      where: { slug: null },
      include: {
        organization: { select: { id: true, name: true } }
      }
    });
    
    if (boardsWithoutSlugs.length > 0) {
      console.log(`   Found ${boardsWithoutSlugs.length} boards without slugs`);
      
      for (const board of boardsWithoutSlugs) {
        const baseSlug = generateSlug(board.name);
        const existingSlugs = await prisma.board.findMany({
          where: { 
            organizationId: board.organizationId,
            slug: { not: null } 
          },
          select: { slug: true }
        }).then(boards => boards.map(b => b.slug));
        
        const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
        
        await prisma.board.update({
          where: { id: board.id },
          data: { slug: uniqueSlug }
        });
        
        console.log(`   ✅ Generated slug "${uniqueSlug}" for board "${board.name}" in org "${board.organization?.name}"`);
        totalGenerated++;
      }
    } else {
      console.log('   ✅ All boards already have slugs (or no boards exist)');
    }
    
    // 4. Generate Sprint slugs
    console.log('\n📊 Processing Sprints...');
    const sprintsWithoutSlugs = await prisma.sprint.findMany({
      where: { slug: null },
      include: {
        board: { 
          select: { 
            id: true, 
            name: true,
            organization: { select: { name: true } }
          } 
        }
      }
    });
    
    if (sprintsWithoutSlugs.length > 0) {
      console.log(`   Found ${sprintsWithoutSlugs.length} sprints without slugs`);
      
      for (const sprint of sprintsWithoutSlugs) {
        const baseSlug = generateSlug(sprint.name);
        const existingSlugs = await prisma.sprint.findMany({
          where: { 
            boardId: sprint.boardId,
            slug: { not: null } 
          },
          select: { slug: true }
        }).then(sprints => sprints.map(s => s.slug));
        
        const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
        
        await prisma.sprint.update({
          where: { id: sprint.id },
          data: { slug: uniqueSlug }
        });
        
        const sprintType = sprint.isBacklog ? 'Backlog' : 'Sprint';
        console.log(`   ✅ Generated slug "${uniqueSlug}" for ${sprintType.toLowerCase()} "${sprint.name}" in board "${sprint.board?.name}"`);
        totalGenerated++;
      }
    } else {
      console.log('   ✅ All sprints already have slugs (or no sprints exist)');
    }
    
    // 5. Final summary
    console.log('\n🎉 Slug generation complete!');
    console.log(`📊 Total slugs generated: ${totalGenerated}`);
    
    if (totalGenerated === 0) {
      console.log('✅ All entities already had slugs - no action needed');
    } else {
      console.log('✅ All missing slugs have been generated successfully');
    }
    
  } catch (error) {
    console.error('❌ Error generating slugs:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

generateAllMissingSlugs();