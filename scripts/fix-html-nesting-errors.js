const fs = require('fs')
const path = require('path')

// Find all files with AlertDialogDescription containing div elements
const filesToFix = [
  '/Users/tutruong/Sites/scrumsan/components/scrum/SprintBacklog.tsx',
  '/Users/tutruong/Sites/scrumsan/components/team-management/TimelineManager.tsx',
  '/Users/tutruong/Sites/scrumsan/components/team-management/GuestsTab.tsx',
  '/Users/tutruong/Sites/scrumsan/components/team-management/PendingInvitationsTab.tsx',
  '/Users/tutruong/Sites/scrumsan/components/team-management/EngagementManager.tsx',
  '/Users/tutruong/Sites/scrumsan/app/(app)/sprints/[id]/active/page.tsx'
]

console.log('🔧 Fixing HTML nesting errors in AlertDialogDescription components...\n')

filesToFix.forEach((filePath, index) => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`)
    return
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8')
    
    // Pattern to find AlertDialogDescription with className and content containing divs
    const patterns = [
      // Match: <AlertDialogDescription className="...">content with divs</AlertDialogDescription>
      {
        regex: /<AlertDialogDescription(\s+className="[^"]*")>([\s\S]*?)<\/AlertDialogDescription>/g,
        replacement: (match, className, content) => {
          // Replace with a div that has the same styling as AlertDialogDescription
          return `<div className="text-muted-foreground text-sm${className.includes('space-y') ? ' space-y-3' : ''}">${content}</div>`
        }
      },
      // Match: <AlertDialogDescription>content with divs</AlertDialogDescription>
      {
        regex: /<AlertDialogDescription>([\s\S]*?)<\/AlertDialogDescription>/g,
        replacement: (match, content) => {
          // Only replace if content contains div elements
          if (content.includes('<div')) {
            return `<div className="text-muted-foreground text-sm">${content}</div>`
          }
          return match // Keep as-is if no divs
        }
      }
    ]

    let wasModified = false
    
    patterns.forEach(pattern => {
      const newContent = content.replace(pattern.regex, (match, ...args) => {
        // Check if the content contains div elements
        const fullMatch = match
        if (fullMatch.includes('<div')) {
          wasModified = true
          return pattern.replacement(match, ...args)
        }
        return match // Keep as-is if no divs
      })
      
      if (newContent !== content) {
        content = newContent
      }
    })
    
    if (wasModified) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`✅ Fixed: ${path.basename(filePath)}`)
    } else {
      console.log(`➖ No changes needed: ${path.basename(filePath)}`)
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message)
  }
})

console.log('\n🎉 HTML nesting error fixes completed!')
console.log('\nThe fixes replace <AlertDialogDescription> with <div> when it contains block elements like <div>')
console.log('This prevents the invalid HTML nesting: <p><div></p> → <div><div></div>')