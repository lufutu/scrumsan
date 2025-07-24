"use client"

import { EnhancedAvatar } from "@/components/ui/enhanced-avatar"

/**
 * Demo component to showcase Enhanced Avatar functionality
 * This can be used for testing and development purposes
 */
export function EnhancedAvatarDemo() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Enhanced Avatar Demo</h2>
        <p className="text-muted-foreground mb-6">
          Showcasing the Enhanced Avatar component with different sizes and fallback scenarios
        </p>
      </div>

      {/* Size Variants */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Size Variants</h3>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <EnhancedAvatar size="sm" fallbackSeed="john.doe@example.com" />
            <p className="text-xs mt-2">Small</p>
          </div>
          <div className="text-center">
            <EnhancedAvatar size="md" fallbackSeed="john.doe@example.com" />
            <p className="text-xs mt-2">Medium</p>
          </div>
          <div className="text-center">
            <EnhancedAvatar size="lg" fallbackSeed="john.doe@example.com" />
            <p className="text-xs mt-2">Large</p>
          </div>
          <div className="text-center">
            <EnhancedAvatar size="xl" fallbackSeed="john.doe@example.com" />
            <p className="text-xs mt-2">Extra Large</p>
          </div>
          <div className="text-center">
            <EnhancedAvatar size="2xl" fallbackSeed="john.doe@example.com" />
            <p className="text-xs mt-2">2X Large</p>
          </div>
        </div>
      </div>

      {/* Different Seeds */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Different Seeds (Consistent Generation)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <EnhancedAvatar size="lg" fallbackSeed="alice@example.com" />
            <p className="text-xs mt-2">alice@example.com</p>
          </div>
          <div className="text-center">
            <EnhancedAvatar size="lg" fallbackSeed="bob@example.com" />
            <p className="text-xs mt-2">bob@example.com</p>
          </div>
          <div className="text-center">
            <EnhancedAvatar size="lg" fallbackSeed="Charlie Smith" />
            <p className="text-xs mt-2">Charlie Smith</p>
          </div>
          <div className="text-center">
            <EnhancedAvatar size="lg" fallbackSeed="diana.jones@company.com" />
            <p className="text-xs mt-2">diana.jones@company.com</p>
          </div>
        </div>
      </div>

      {/* Consistency Test */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Consistency Test (Same Seed)</h3>
        <div className="flex items-center gap-4">
          <EnhancedAvatar size="lg" fallbackSeed="test@example.com" />
          <EnhancedAvatar size="lg" fallbackSeed="test@example.com" />
          <EnhancedAvatar size="lg" fallbackSeed="test@example.com" />
          <p className="text-sm text-muted-foreground">
            These should all look identical (same seed: test@example.com)
          </p>
        </div>
      </div>

      {/* With Image Source */}
      <div>
        <h3 className="text-lg font-semibold mb-4">With Image Source</h3>
        <div className="flex items-center gap-4">
          <EnhancedAvatar 
            size="lg" 
            fallbackSeed="user@example.com"
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
            alt="User with profile picture"
          />
          <p className="text-sm text-muted-foreground">
            When src is provided, it shows the image instead of generated avatar
          </p>
        </div>
      </div>

      {/* Fallback Chain */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Fallback Chain</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <EnhancedAvatar 
              size="lg" 
              fallbackSeed=""
              fallbackSeeds={["backup@example.com"]}
            />
            <p className="text-xs mt-2">Empty primary, uses backup seed</p>
          </div>
          <div className="text-center">
            <EnhancedAvatar 
              size="lg" 
              fallbackSeed=""
              fallbackSeeds={[]}
            />
            <p className="text-xs mt-2">No seeds, uses default</p>
          </div>
          <div className="text-center">
            <EnhancedAvatar 
              size="lg" 
              fallbackSeed="invalid-seed-123"
            />
            <p className="text-xs mt-2">Uses initials fallback</p>
          </div>
        </div>
      </div>
    </div>
  )
}