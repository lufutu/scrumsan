/**
 * Demo file to showcase avatar generation with different seeds
 * This file demonstrates how the avatar generation utilities work
 * and can be used for testing and development purposes
 */

import {
  generateAvatarConfig,
  generateAppAvatarConfig,
  getUserAvatarSeed,
  getAvatarCacheKey
} from './avatar-generation'

// Sample user data for testing
const sampleUsers = [
  { email: 'john.doe@example.com', name: 'John Doe', id: 'user-1' },
  { email: 'jane.smith@company.org', name: 'Jane Smith', id: 'user-2' },
  { email: 'admin@test.com', name: 'Admin User', id: 'user-3' },
  { email: null, name: 'Anonymous User', id: 'user-4' },
  { email: null, name: null, id: 'user-5' },
]

/**
 * Demonstrates avatar generation for different user scenarios
 */
export const demonstrateAvatarGeneration = () => {
  console.log('=== Avatar Generation Demo ===\n')
  
  sampleUsers.forEach((user, index) => {
    console.log(`User ${index + 1}:`)
    console.log(`  Email: ${user.email || 'N/A'}`)
    console.log(`  Name: ${user.name || 'N/A'}`)
    console.log(`  ID: ${user.id}`)
    
    // Get the best seed for this user
    const seed = getUserAvatarSeed(user.email, user.name, user.id)
    console.log(`  Avatar Seed: ${seed}`)
    
    // Generate avatar config
    const config = generateAvatarConfig(seed)
    console.log(`  Avatar Config: ${JSON.stringify(config, null, 2)}`)
    
    // Generate app-specific config
    const appConfig = generateAppAvatarConfig(seed)
    console.log(`  App Avatar Config: ${JSON.stringify(appConfig, null, 2)}`)
    
    // Generate cache key
    const cacheKey = getAvatarCacheKey(seed)
    console.log(`  Cache Key: ${cacheKey}`)
    
    console.log('---\n')
  })
}

/**
 * Demonstrates consistency of avatar generation
 */
export const demonstrateConsistency = () => {
  console.log('=== Avatar Generation Consistency Demo ===\n')
  
  const testSeed = 'test@example.com'
  
  console.log(`Testing consistency with seed: ${testSeed}`)
  
  // Generate the same config multiple times
  const configs = Array.from({ length: 5 }, () => generateAvatarConfig(testSeed))
  
  // Check if all configs are identical
  const allIdentical = configs.every(config => 
    JSON.stringify(config) === JSON.stringify(configs[0])
  )
  
  console.log(`All configs identical: ${allIdentical}`)
  console.log(`First config: ${JSON.stringify(configs[0], null, 2)}`)
  
  if (!allIdentical) {
    console.log('Warning: Avatar generation is not consistent!')
    configs.forEach((config, index) => {
      console.log(`Config ${index + 1}: ${JSON.stringify(config, null, 2)}`)
    })
  }
}

/**
 * Demonstrates different avatar configs for different seeds
 */
export const demonstrateVariety = () => {
  console.log('=== Avatar Generation Variety Demo ===\n')
  
  const testSeeds = [
    'alice@example.com',
    'bob@example.com', 
    'charlie@example.com',
    'diana@example.com',
    'eve@example.com'
  ]
  
  const configs = testSeeds.map(seed => ({
    seed,
    config: generateAvatarConfig(seed)
  }))
  
  console.log('Generated configs for different seeds:')
  configs.forEach(({ seed, config }) => {
    console.log(`Seed: ${seed}`)
    console.log(`Config: ${JSON.stringify(config, null, 2)}`)
    console.log('---')
  })
  
  // Check uniqueness
  const uniqueConfigs = new Set(configs.map(({ config }) => JSON.stringify(config)))
  console.log(`\nUnique configs generated: ${uniqueConfigs.size} out of ${configs.length}`)
  
  if (uniqueConfigs.size === configs.length) {
    console.log('✅ All configs are unique - good variety!')
  } else {
    console.log('⚠️  Some configs are identical - limited variety')
  }
}

// Export a function to run all demos
export const runAllDemos = () => {
  demonstrateAvatarGeneration()
  demonstrateConsistency()
  demonstrateVariety()
}

// If running this file directly (for development/testing)
if (require.main === module) {
  runAllDemos()
}