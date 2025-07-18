"use client"

import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Plus, Clock, Target, Trash2, Edit, Search } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

type LabelWithStats = {
  id: string
  name: string
  description: string | null
  color: string | null
  createdAt: string
  itemCount: number
  totalPoints: number
  totalLoggedTime: number
  assignees: Array<{
    id: string
    fullName: string | null
    avatarUrl: string | null
  }>
}

type SortField = 'name' | 'itemCount' | 'totalPoints' | 'totalLoggedTime'

export default function LabelsPage() {
  const params = useParams()
  const boardId = params?.boardId as string
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [newLabel, setNewLabel] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  })

  const { data: labels, error, isLoading, mutate } = useSWR<LabelWithStats[]>(
    boardId ? `/api/boards/${boardId}/labels` : null,
    fetcher
  )

  const filteredAndSortedLabels = labels ? [...labels]
    .filter(label => 
      label.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (label.description && label.description.toLowerCase().includes(searchFilter.toLowerCase()))
    )
    .sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = (bValue as string).toLowerCase()
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    }) : []

  const handleCreateLabel = async () => {
    try {
      const response = await fetch(`/api/boards/${boardId}/labels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLabel),
      })

      if (response.ok) {
        setIsCreateDialogOpen(false)
        setNewLabel({ name: '', description: '', color: '#3B82F6' })
        mutate()
      }
    } catch (error) {
      console.error('Failed to create label:', error)
    }
  }

  const handleDeleteLabel = async (labelId: string) => {
    if (!confirm('Are you sure you want to delete this label? This will remove it from all tasks.')) {
      return
    }

    try {
      const response = await fetch(`/api/boards/${boardId}/labels/${labelId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        mutate()
      }
    } catch (error) {
      console.error('Failed to delete label:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading labels...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <h1 className="text-2xl font-bold text-red-600">Error loading labels</h1>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/boards/${boardId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Board
            </Link>
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold">Labels & Epics</h1>
            <p className="text-muted-foreground">
              Manage labels and track epic progress across your board
            </p>
          </div>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Label
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Label</DialogTitle>
              <DialogDescription>
                Create a new label to organize your tasks. Labels can be used as Epics for larger bodies of work.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newLabel.name}
                  onChange={(e) => setNewLabel(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Label name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newLabel.description}
                  onChange={(e) => setNewLabel(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Epic description (optional)"
                />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={newLabel.color}
                  onChange={(e) => setNewLabel(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateLabel} disabled={!newLabel.name.trim()}>
                  Create Label
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Labels</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="search"
                  placeholder="Search labels..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="itemCount">Items</SelectItem>
                    <SelectItem value="totalPoints">Points</SelectItem>
                    <SelectItem value="totalLoggedTime">Time Logged</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedLabels.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchFilter ? 'No labels match your search.' : 'No labels found. Create your first label to get started.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Assignees</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-center">Points</TableHead>
                  <TableHead className="text-center">Time Logged</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedLabels.map((label) => (
                  <TableRow key={label.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/boards/${boardId}/labels/${label.id}`} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: label.color || '#3B82F6' }}
                        />
                        <span className="font-medium">{label.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {label.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {label.assignees.slice(0, 3).map((assignee) => (
                          <Avatar key={assignee.id} className="w-6 h-6 border-2 border-background">
                            <AvatarImage src={assignee.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {assignee.fullName?.split(' ').map(n => n[0]).join('') || '?'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {label.assignees.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">+{label.assignees.length - 3}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{label.itemCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Target className="h-3 w-3" />
                        {label.totalPoints}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" />
                        {label.totalLoggedTime.toFixed(1)}h
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link href={`/boards/${boardId}/labels/${label.id}?tab=details`}>
                            <Edit className="h-3 w-3" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            handleDeleteLabel(label.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}