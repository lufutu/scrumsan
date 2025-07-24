"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ProfileEditorDialog } from "@/components/profile/profile-editor-dialog"

/**
 * Demo component for testing the Profile Editor Dialog
 */
export function ProfileEditorDemo() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Profile Editor Dialog Demo</h2>
        <p className="text-muted-foreground mb-4">
          Test the profile editor dialog component with different configurations.
        </p>
      </div>

      <div className="flex gap-4">
        <Button onClick={() => setIsOpen(true)}>
          Open Profile Editor
        </Button>
      </div>

      <ProfileEditorDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialTab="profile"
      />
    </div>
  )
}