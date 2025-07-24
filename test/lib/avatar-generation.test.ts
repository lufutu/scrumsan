import { describe, it, expect } from 'vitest'
import {
  generateAvatarConfig,
  generateCustomAvatarConfig,
  generateAppAvatarConfig,
  getUserAvatarSeed,
  isValidAvatarSeed,
  getAvatarCacheKey
} from '../../lib/avatar-generation'

describe('Avatar Generation Utilities', () => {
  describe('generateAvatarConfig', () => {
    it('should generate consistent config for same seed', () => {
      const seed = 'test@example.com'
      const config1 = generateAvatarConfig(seed)
      const config2 = generateAvatarConfig(seed)
      
      expect(config1).toEqual(config2)
    })

    it('should generate different configs for different seeds', () => {
      const config1 = generateAvatarConfig('user1@example.com')
      const config2 = generateAvatarConfig('user2@example.com')
      
      expect(config1).not.toEqual(config2)
    })

    it('should handle empty or invalid seeds gracefully', () => {
      const config1 = generateAvatarConfig('')
      const config2 = generateAvatarConfig(null as any)
      const config3 = generateAvatarConfig(undefined as any)
      
      expect(config1).toBeDefined()
      expect(config2).toBeDefined()
      expect(config3).toBeDefined()
      
      // All should use fallback seed and be identical
      expect(config1).toEqual(config2)
      expect(config2).toEqual(config3)
    })

    it('should generate valid avatar configuration object', () => {
      const config = generateAvatarConfig('test@example.com')
      
      expect(config).toBeDefined()
      expect(typeof config).toBe('object')
      // Basic structure validation - react-nice-avatar should provide these
      expect(config).toHaveProperty('sex')
      expect(config).toHaveProperty('faceColor')
      expect(config).toHaveProperty('earSize')
      expect(config).toHaveProperty('hairStyle')
    })
  })

  describe('generateCustomAvatarConfig', () => {
    it('should apply custom options to base config', () => {
      const seed = 'test@example.com'
      const customOptions = { shape: 'square' as const }
      
      const config = generateCustomAvatarConfig(seed, customOptions)
      
      expect(config.shape).toBe('square')
    })

    it('should preserve base config when no options provided', () => {
      const seed = 'test@example.com'
      const baseConfig = generateAvatarConfig(seed)
      const customConfig = generateCustomAvatarConfig(seed)
      
      expect(customConfig).toEqual(baseConfig)
    })
  })

  describe('generateAppAvatarConfig', () => {
    it('should generate config with app-specific styling', () => {
      const config = generateAppAvatarConfig('test@example.com')
      
      expect(config).toBeDefined()
      expect(config.shape).toBe('circle')
    })

    it('should be consistent for same seed', () => {
      const seed = 'test@example.com'
      const config1 = generateAppAvatarConfig(seed)
      const config2 = generateAppAvatarConfig(seed)
      
      expect(config1).toEqual(config2)
    })
  })

  describe('getUserAvatarSeed', () => {
    it('should prefer email over other options', () => {
      const email = 'user@example.com'
      const name = 'John Doe'
      const id = '123'
      
      const seed = getUserAvatarSeed(email, name, id)
      expect(seed).toBe(email)
    })

    it('should use name when email is not available', () => {
      const name = 'John Doe'
      const id = '123'
      
      const seed = getUserAvatarSeed(null, name, id)
      expect(seed).toBe(name)
    })

    it('should use id when email and name are not available', () => {
      const id = '123'
      
      const seed = getUserAvatarSeed(null, null, id)
      expect(seed).toBe(id)
    })

    it('should use fallback when all options are null', () => {
      const seed = getUserAvatarSeed(null, null, null)
      expect(seed).toBe('anonymous-user')
    })

    it('should handle empty strings correctly', () => {
      const seed = getUserAvatarSeed('', 'John Doe', '123')
      expect(seed).toBe('John Doe')
    })
  })

  describe('isValidAvatarSeed', () => {
    it('should return true for valid seeds', () => {
      expect(isValidAvatarSeed('test@example.com')).toBe(true)
      expect(isValidAvatarSeed('John Doe')).toBe(true)
      expect(isValidAvatarSeed('123')).toBe(true)
    })

    it('should return false for invalid seeds', () => {
      expect(isValidAvatarSeed('')).toBe(false)
      expect(isValidAvatarSeed(null as any)).toBe(false)
      expect(isValidAvatarSeed(undefined as any)).toBe(false)
      expect(isValidAvatarSeed(123 as any)).toBe(false)
    })
  })

  describe('getAvatarCacheKey', () => {
    it('should generate consistent cache keys', () => {
      const seed = 'test@example.com'
      const key1 = getAvatarCacheKey(seed)
      const key2 = getAvatarCacheKey(seed)
      
      expect(key1).toBe(key2)
    })

    it('should include version in cache key', () => {
      const seed = 'test@example.com'
      const key1 = getAvatarCacheKey(seed, '1.0')
      const key2 = getAvatarCacheKey(seed, '2.0')
      
      expect(key1).not.toBe(key2)
      expect(key1).toContain('1.0')
      expect(key2).toContain('2.0')
    })

    it('should use default version when not specified', () => {
      const seed = 'test@example.com'
      const key = getAvatarCacheKey(seed)
      
      expect(key).toContain('1.0')
    })
  })

  describe('Avatar generation with real-world seeds', () => {
    const testSeeds = [
      'john.doe@example.com',
      'jane.smith@company.org',
      'admin@test.com',
      'user123@domain.net',
      'Alice Johnson',
      'Bob Wilson',
      'Charlie Brown',
      'user-id-12345',
      'user-id-67890'
    ]

    it('should generate unique configs for different seeds', () => {
      const configs = testSeeds.map(seed => generateAvatarConfig(seed))
      
      // Check that we have different configurations
      const uniqueConfigs = new Set(configs.map(config => JSON.stringify(config)))
      expect(uniqueConfigs.size).toBeGreaterThan(1)
    })

    it('should maintain consistency across multiple generations', () => {
      testSeeds.forEach(seed => {
        const config1 = generateAvatarConfig(seed)
        const config2 = generateAvatarConfig(seed)
        const config3 = generateAvatarConfig(seed)
        
        expect(config1).toEqual(config2)
        expect(config2).toEqual(config3)
      })
    })

    it('should generate valid configurations for all test seeds', () => {
      testSeeds.forEach(seed => {
        const config = generateAvatarConfig(seed)
        
        expect(config).toBeDefined()
        expect(typeof config).toBe('object')
        expect(config).toHaveProperty('sex')
        expect(config).toHaveProperty('faceColor')
      })
    })
  })
})