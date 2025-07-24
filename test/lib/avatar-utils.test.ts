import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  generateAvatarConfig,
  generateCachedAvatarConfig,
  getFallbackSeed,
  clearAvatarCache,
  isValidAvatarSeed
} from '../../lib/avatar-utils'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('Avatar Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('generateAvatarConfig', () => {
    it('should generate consistent config for the same seed', () => {
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
      
      // All should be the same since they use the default fallback
      expect(config1).toEqual(config2)
      expect(config2).toEqual(config3)
    })

    it('should generate valid avatar config object', () => {
      const config = generateAvatarConfig('test@example.com')
      
      expect(config).toBeDefined()
      expect(typeof config).toBe('object')
      // react-nice-avatar config should have certain properties
      expect(config).toHaveProperty('sex')
      expect(config).toHaveProperty('faceColor')
    })
  })

  describe('generateCachedAvatarConfig', () => {
    it('should generate and cache avatar config', () => {
      const seed = 'test@example.com'
      const result = generateCachedAvatarConfig(seed)
      
      expect(result).toBeDefined()
      expect(result.seed).toBe(seed)
      expect(result.config).toBeDefined()
      expect(result.generatedAt).toBeInstanceOf(Date)
      expect(result.version).toBe('1.0')
      
      // Should have attempted to cache
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should return cached config when available and valid', () => {
      const seed = 'cached@example.com'
      const cachedConfig = {
        seed,
        config: { sex: 'man', faceColor: '#AC6651' },
        generatedAt: new Date().toISOString(),
        version: '1.0'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedConfig))
      
      const result = generateCachedAvatarConfig(seed)
      
      expect(result.seed).toBe(seed)
      expect(result.config).toEqual(cachedConfig.config)
      expect(localStorageMock.getItem).toHaveBeenCalledWith(`avatar-config-${seed}-1.0`)
    })

    it('should regenerate config when cache is expired', () => {
      const seed = 'expired@example.com'
      const expiredDate = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      const cachedConfig = {
        seed,
        config: { sex: 'man', faceColor: '#AC6651' },
        generatedAt: expiredDate.toISOString(),
        version: '1.0'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedConfig))
      
      const result = generateCachedAvatarConfig(seed)
      
      expect(result.generatedAt.getTime()).toBeGreaterThan(expiredDate.getTime())
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const seed = 'error@example.com'
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      const result = generateCachedAvatarConfig(seed)
      
      expect(result).toBeDefined()
      expect(result.seed).toBe(seed)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to read avatar config from cache:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('getFallbackSeed', () => {
    it('should prioritize email over other options', () => {
      const result = getFallbackSeed('user@example.com', 'John Doe', 'user123')
      expect(result).toBe('user@example.com')
    })

    it('should use name when email is not available', () => {
      const result = getFallbackSeed(null, 'John Doe', 'user123')
      expect(result).toBe('john doe')
    })

    it('should use userId when email and name are not available', () => {
      const result = getFallbackSeed(null, null, 'user123')
      expect(result).toBe('user123')
    })

    it('should return default when all options are empty', () => {
      const result = getFallbackSeed(null, null, null)
      expect(result).toBe('default-user')
    })

    it('should handle whitespace-only strings', () => {
      const result = getFallbackSeed('   ', '   ', 'user123')
      expect(result).toBe('user123')
    })

    it('should normalize email to lowercase', () => {
      const result = getFallbackSeed('USER@EXAMPLE.COM', null, null)
      expect(result).toBe('user@example.com')
    })
  })

  describe('isValidAvatarSeed', () => {
    it('should return true for valid seeds', () => {
      expect(isValidAvatarSeed('test@example.com')).toBe(true)
      expect(isValidAvatarSeed('John Doe')).toBe(true)
      expect(isValidAvatarSeed('user123')).toBe(true)
    })

    it('should return false for invalid seeds', () => {
      expect(isValidAvatarSeed('')).toBe(false)
      expect(isValidAvatarSeed('   ')).toBe(false)
      expect(isValidAvatarSeed(null as any)).toBe(false)
      expect(isValidAvatarSeed(undefined as any)).toBe(false)
    })
  })

  describe('clearAvatarCache', () => {
    const originalObjectKeys = Object.keys

    beforeEach(() => {
      // Mock Object.keys to return some avatar cache keys
      Object.keys = vi.fn().mockReturnValue([
        'avatar-config-user1@example.com-1.0',
        'avatar-config-user2@example.com-1.0',
        'other-cache-key',
        'avatar-config-user3@example.com-1.0'
      ])
    })

    afterEach(() => {
      Object.keys = originalObjectKeys
    })

    it('should clear specific seed cache', () => {
      clearAvatarCache('user1@example.com')
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('avatar-config-user1@example.com-1.0')
      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(1)
    })

    it('should clear all avatar cache when no seed provided', () => {
      clearAvatarCache()
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('avatar-config-user1@example.com-1.0')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('avatar-config-user2@example.com-1.0')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('avatar-config-user3@example.com-1.0')
      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(3)
    })

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Simulate error by making localStorage.removeItem throw
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      // This should not throw even if localStorage operations fail
      expect(() => clearAvatarCache('test-user')).not.toThrow()
      
      consoleSpy.mockRestore()
    })
  })
})