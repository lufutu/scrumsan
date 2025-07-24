"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/animate-ui/radix/dialog'

interface SprintDialogsProps {
  // Create Sprint Dialog
  isCreateSprintOpen: boolean
  setIsCreateSprintOpen: (open: boolean) => void
  newSprintData: { name: string; goal: string }
  setNewSprintData: (data: { name: string; goal: string } | ((prev: { name: string; goal: string }) => { name: string; goal: string })) => void
  onCreateSprint: () => void

  // Edit Sprint Dialog
  isEditSprintOpen: boolean
  setIsEditSprintOpen: (open: boolean) => void
  editSprintData: { name: string; goal: string }
  setEditSprintData: (data: { name: string; goal: string } | ((prev: { name: string; goal: string }) => { name: string; goal: string })) => void
  onEditSprint: () => void

  // Start Sprint Dialog
  isStartSprintOpen: boolean
  setIsStartSprintOpen: (open: boolean) => void
  startSprintData: { dueDate: string; goal: string }
  setStartSprintData: (data: { dueDate: string; goal: string } | ((prev: { dueDate: string; goal: string }) => { dueDate: string; goal: string })) => void
  onStartSprint: () => void
}

export function SprintDialogs({
  isCreateSprintOpen,
  setIsCreateSprintOpen,
  newSprintData,
  setNewSprintData,
  onCreateSprint,
  isEditSprintOpen,
  setIsEditSprintOpen,
  editSprintData,
  setEditSprintData,
  onEditSprint,
  isStartSprintOpen,
  setIsStartSprintOpen,
  startSprintData,
  setStartSprintData,
  onStartSprint
}: SprintDialogsProps) {
  return (
    <>
      {/* Create Sprint Dialog */}
      <Dialog open={isCreateSprintOpen} onOpenChange={setIsCreateSprintOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Sprint</DialogTitle>
            <DialogDescription>
              Add a new sprint to your board. It will be created with default columns.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Sprint Name</Label>
              <Input
                id="name"
                value={newSprintData.name}
                onChange={(e) => setNewSprintData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Sprint 2"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal">Sprint Goal (optional)</Label>
              <Textarea
                id="goal"
                value={newSprintData.goal}
                onChange={(e) => setNewSprintData(prev => ({ ...prev, goal: e.target.value }))}
                placeholder="Complete user authentication and profile features"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateSprintOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onCreateSprint}>
              Create Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sprint Dialog */}
      <Dialog open={isEditSprintOpen} onOpenChange={setIsEditSprintOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sprint</DialogTitle>
            <DialogDescription>
              Update the sprint name and goal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Sprint Name</Label>
              <Input
                id="edit-name"
                value={editSprintData.name}
                onChange={(e) => setEditSprintData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Sprint 2"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-goal">Sprint Goal (optional)</Label>
              <Textarea
                id="edit-goal"
                value={editSprintData.goal}
                onChange={(e) => setEditSprintData(prev => ({ ...prev, goal: e.target.value }))}
                placeholder="Complete user authentication and profile features"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSprintOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onEditSprint}>
              Update Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Sprint Dialog */}
      <Dialog open={isStartSprintOpen} onOpenChange={setIsStartSprintOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Sprint</DialogTitle>
            <DialogDescription>
              Set the sprint goal and due date before starting the sprint.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="due-date">Due Date (optional)</Label>
              <Input
                id="due-date"
                type="date"
                value={startSprintData.dueDate}
                onChange={(e) => setStartSprintData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sprint-goal">Sprint Goal (optional)</Label>
              <Textarea
                id="sprint-goal"
                value={startSprintData.goal}
                onChange={(e) => setStartSprintData(prev => ({ ...prev, goal: e.target.value }))}
                placeholder="Complete user authentication and profile features"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStartSprintOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onStartSprint}>
              Start Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}