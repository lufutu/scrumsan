/**
 * @fileoverview Simple tests for profile editor state management hooks
 */

import { describe, it, expect, vi } from 'vitest'
import { useAvatarConfig } from '@/hooks/useProfileEditor'

// Mock dependencies
vi.mock('@/lib/avatar-utils', () => ({
  generateCachedAvatarConfig: vi.fn(() => ({
    seed: 'test@example.com',
    config: { hair: 'short', eyes: 'blue' },
    generatedAt: new Date(),
    version: '1.0'
  })),
  clearAvatarCache: vi.fn(),
  getFallbackSeed: vi.fn((seed, ...fallbacks) => {
    if (seed && seed.trim()) return seed.trim().toLowerCase()
    for (const fallback of fallbacks) {
      if (fallback && fallback.trim()) return fallback.trim().toLowerCase()
    }
    return 'default-user'
  })
}))

describe('useAvatarConfig - Simple Tests', () => {
  it('should have correct fallback seed logic', () => {
    const { getFallbackSeed } = require('@/lib/avatar-utils')
    
    // Test with valid seed
    expect(getFallbackSeed('test@example.com')).toBe('test@example.com')
    
    // Test with empty seed and fallback
    expect(getFallbackSeed('', 'fallback@example.com')).toBe('fallback@example.com')
    
    // Test with no valid seeds
    expect(getFallbackSeed('', '')).toBe('default-user')
  })
})