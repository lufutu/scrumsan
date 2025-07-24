'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Paperclip,
  MessageCircle,
  Tag,
  ListTodo,
  Calendar,
  Flag,
  UserPlus,
  Check,
  Search,
  X,
  Plus,
  Upload
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/animate-ui/radix/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { getItemTypeColor, getPriorityColor, getItemTypeById } from '@/lib/constants';
import { useUsers } from '@/hooks/useUsers';
import { useLabels } from '@/hooks/useLabels';
import { useSupabase } from '@/providers/supabase-provider';
import { useComments } from '@/hooks/useComments';
import { toast } from 'sonner';

import { TaskCardProps as TaskCardModernProps } from '@/types/shared';

export function TaskCardModern({
  id,
  itemCode,
  title,
  taskType,
  storyPoints,
  assignees = [],
  labels = [],
  priority,
  commentsCount = 0,
  filesCount = 0,
  checklistsCount = 0,
  completedChecklists = 0,
  subitemsCount = 0,
  dueDate,
  status = 'todo',
  organizationId,
  boardId,
  onClick,
  onAssigneesChange
}: TaskCardModernProps) {
  // Get boardId from task data or props
  const taskBoardId = (boardId || (typeof window !== 'undefined' && window.location.pathname.includes('/boards/')
    ? window.location.pathname.split('/boards/')[1]?.split('/')[0]
    : null));
  const { user } = useSupabase();
  const [assigneeSelectorOpen, setAssigneeSelectorOpen] = useState(false);

  // Helper function to determine text color based on background color
  const getTextColor = (backgroundColor: string) => {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return white text for dark backgrounds, dark text for light backgrounds
    return luminance > 0.5 ? '#374151' : '#ffffff';
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentAssignees, setCurrentAssignees] = useState(assignees);

  // Inline editing states
  const [storyPointsOpen, setStoryPointsOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [checklistsOpen, setChecklistsOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);

  // Quick edit states
  const [quickComment, setQuickComment] = useState('');
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3B82F6');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<File[]>([]);

  // Ref to track previous assignees to prevent infinite re-renders
  const prevAssigneesRef = useRef<string>('');

  // Sync local state with prop changes (e.g., after refresh)
  useEffect(() => {
    // Create a stable string representation of assignees for comparison
    const assigneesKey = assignees.map(a => a.id).sort().join(',');

    // Only update if the assignees actually changed
    if (prevAssigneesRef.current !== assigneesKey) {
      setCurrentAssignees(assignees);
      prevAssigneesRef.current = assigneesKey;
    }
  }, [assignees]);

  // Fetch organization members
  const { users: organizationMembers, loading: loadingMembers } = useUsers({
    organizationId
  });

  // Fetch board labels
  const { labels: boardLabels } = useLabels(boardId);

  // Fetch comments
  const { comments, loading: loadingComments, mutate: mutateComments } = useComments(id);

  const checklistProgress = checklistsCount ?
    Math.round((completedChecklists || 0) / checklistsCount * 100) : 0;

  const filteredMembers = organizationMembers?.filter(member =>
    member.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleToggleAssignee = async (userId: string) => {
    if (!id) return;

    try {
      setIsUpdating(true);

      // Get current assignee IDs
      const currentAssigneeIds = currentAssignees.map(a => a.id);
      let newAssigneeIds: string[] = [];

      if (currentAssigneeIds.includes(userId)) {
        // Remove user from assignees
        newAssigneeIds = currentAssigneeIds.filter(id => id !== userId);
      } else {
        // Add user to assignees
        newAssigneeIds = [...currentAssigneeIds, userId];
      }

      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assigneeIds: newAssigneeIds
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update assignees');
      }

      const updatedTask = await response.json();

      // Convert to the expected format and update local state
      const newAssignees = updatedTask.taskAssignees?.map((ta: unknown) => ({
        id: ta.user.id,
        name: ta.user.fullName || ta.user.email || 'Unknown User',
        avatar: ta.user.avatarUrl,
        initials: ta.user.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'
      })) || [];

      setCurrentAssignees(newAssignees);
      onAssigneesChange?.();

      const member = organizationMembers?.find(m => m.id === userId);
      const message = currentAssigneeIds.includes(userId)
        ? `Removed ${member?.fullName || 'user'} from assignees`
        : `Added ${member?.fullName || 'user'} to assignees`;
      toast.success(message);

    } catch (error) {
      console.error('Error updating assignees:', error);
      toast.error('Failed to update assignees');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearAllAssignees = async () => {
    if (!id || currentAssignees.length === 0) return;

    try {
      setIsUpdating(true);

      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assigneeIds: []
        })
      });

      if (!response.ok) {
        throw new Error('Failed to clear assignees');
      }

      setCurrentAssignees([]);
      onAssigneesChange?.();
      toast.success('All assignees removed');

    } catch (error) {
      console.error('Error clearing assignees:', error);
      toast.error('Failed to clear assignees');
    } finally {
      setIsUpdating(false);
    }
  };

  // Quick edit handlers
  const handleStoryPointsChange = async (points: number) => {
    if (!id) return;

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyPoints: points })
      });

      if (!response.ok) throw new Error('Failed to update story points');

      onAssigneesChange?.();
      toast.success('Story points updated');
      setStoryPointsOpen(false);
    } catch (error) {
      toast.error('Failed to update story points');
    }
  };

  const handleQuickComment = async () => {
    if (!id || !quickComment.trim()) return;

    try {
      const response = await fetch(`/api/tasks/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: quickComment.trim() })
      });

      if (!response.ok) throw new Error('Failed to add comment');

      // Refresh comments and task data
      mutateComments();
      onAssigneesChange?.();
      toast.success('Comment added');
      setQuickComment('');
      // Don't close the popover to show the new comment immediately
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };


  const handleAddExistingLabel = async (label: { id: string; name: string; color: string | null }) => {
    try {
      // Get current label IDs and add the selected one
      const currentLabelIds = labels?.map(l => l.id) || [];
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labels: [...currentLabelIds, label.id]
        })
      });

      if (!response.ok) throw new Error('Failed to assign label');

      onAssigneesChange?.();
      toast.success(`Label "${label.name}" assigned`);
      setLabelsOpen(false);
    } catch (error) {
      console.error('Label assignment error:', error);
      toast.error('Failed to assign label');
    }
  };

  const handleRemoveLabel = async (labelToRemove: { id: string; name: string; color: string }) => {
    try {
      // Get current label IDs and remove the selected one
      const currentLabelIds = labels?.map(l => l.id) || [];
      const updatedLabelIds = currentLabelIds.filter(id => id !== labelToRemove.id);

      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labels: updatedLabelIds
        })
      });

      if (!response.ok) throw new Error('Failed to remove label');

      onAssigneesChange?.();
      toast.success(`Label "${labelToRemove.name}" removed`);
    } catch (error) {
      console.error('Label removal error:', error);
      toast.error('Failed to remove label');
    }
  };

  const handleCreateLabel = async (boardIdParam?: string) => {
    if (!newLabelName.trim() || !boardIdParam) return;

    try {
      // First create the label using the correct board-specific API
      const labelResponse = await fetch(`/api/boards/${boardIdParam}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLabelName.trim(),
          color: newLabelColor
        })
      });

      if (!labelResponse.ok) throw new Error('Failed to create label');

      const newLabel = await labelResponse.json();

      // Then assign it to the task
      // Get current label IDs and add the new one
      const currentLabelIds = labels?.map(l => l.id) || [];
      const taskResponse = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labels: [...currentLabelIds, newLabel.id]
        })
      });

      if (!taskResponse.ok) throw new Error('Failed to assign label');

      onAssigneesChange?.();
      toast.success('Label created and assigned');
      setNewLabelName('');
      setLabelsOpen(false);
    } catch (error) {
      console.error('Label creation error:', error);
      toast.error('Failed to create label');
    }
  };

  // Image upload handlers
  const handleImageUpload = async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setUploadingImages(imageFiles);

    try {
      // Upload each image and get URLs
      const uploadPromises = imageFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/tasks/${id}/attachments`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error('Failed to upload image');

        const attachment = await response.json();
        return attachment.url;
      });

      const imageUrls = await Promise.all(uploadPromises);

      // Insert image markdown into comment
      const imageMarkdown = imageUrls.map(url => `![Image](${url})`).join('\n');
      const newComment = quickComment + (quickComment ? '\n\n' : '') + imageMarkdown;
      setQuickComment(newComment);

      toast.success(`${imageFiles.length} image(s) uploaded`);
    } catch (error) {
      toast.error('Failed to upload images');
    } finally {
      setUploadingImages([]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    handleImageUpload(files);
  };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      handleImageUpload(files);
    };
    input.click();
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!id) return;

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      });

      if (!response.ok) throw new Error('Failed to update priority');

      onAssigneesChange?.();
      toast.success('Priority updated');
      setPriorityOpen(false);
    } catch (error) {
      toast.error('Failed to update priority');
    }
  };

  return (
    <div
      className={cn(
        "group bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-pointer",
        "shadow-sm hover:shadow-lg hover:-translate-y-0.5 transform duration-200 ease-out",
        status === 'done' && "opacity-75"
      )}
      onClick={onClick}
    >
      {/* Task Header with Icon, Title, and Assignees */}
      <div className="flex items-start justify-between p-3 pb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={cn(
            "w-6 h-6 rounded flex items-center justify-center text-white text-sm flex-shrink-0",
            getItemTypeColor(taskType).bgColor
          )}>
            {getItemTypeById(taskType)?.icon || '●'}
          </div>
          <h3 className={cn(
            "text-sm font-medium text-gray-900 line-clamp-2 flex-1",
            status === 'done' && "line-through"
          )}>
            {title}
          </h3>
        </div>

        {/* Assignees in top right - always show something with built-in selector */}
        <div className="flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
          <Popover modal={true} open={assigneeSelectorOpen} onOpenChange={setAssigneeSelectorOpen}>
            <PopoverTrigger asChild>
              {currentAssignees.length > 0 ? (
                <div className="cursor-pointer flex -space-x-2">
                  {currentAssignees.slice(0, 3).map((assigneeItem) => (
                    <EnhancedAvatar
                      key={assigneeItem.id}
                      src={assigneeItem.avatar}
                      fallbackSeed={assigneeItem.name}
                      size="md"
                      className="h-8 w-8 border-2 border-green-500 hover:border-green-600 transition-colors"
                      alt={assigneeItem.name}
                    />
                  ))}
                  {currentAssignees.length > 3 && (
                    <div className="h-8 w-8 border-2 border-green-500 hover:border-green-600 transition-colors rounded-full bg-gray-500 text-white flex items-center justify-center text-xs">
                      +{currentAssignees.length - 3}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-8 w-8 border-2 border-green-500 cursor-pointer bg-green-100 hover:bg-green-200 transition-colors rounded-full flex items-center justify-center text-green-600">
                  <UserPlus className="h-4 w-4" />
                </div>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <Command className="rounded-lg border shadow-md">
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <CommandInput
                    placeholder="Search members..."
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                    className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <CommandList className="max-h-60">
                  {loadingMembers ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      Loading members...
                    </div>
                  ) : (
                    <>
                      <CommandEmpty>No members found.</CommandEmpty>
                      <CommandGroup>
                        {/* Clear all assignees option */}
                        {currentAssignees.length > 0 && (
                          <>
                            <CommandItem
                              onSelect={handleClearAllAssignees}
                              disabled={isUpdating}
                              className="flex items-center gap-3 p-3 cursor-pointer"
                            >
                              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                                <X className="h-4 w-4 text-slate-600" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">Unassign all</div>
                                <div className="text-xs text-slate-500">Remove all assignees</div>
                              </div>
                            </CommandItem>
                            <Separator className="my-1" />
                          </>
                        )}

                        {/* Current user first */}
                        {user && (
                          <CommandItem
                            onSelect={() => handleToggleAssignee(user.id)}
                            disabled={isUpdating}
                            className="flex items-center gap-3 p-3 cursor-pointer"
                          >
                            <div className="relative">
                              <EnhancedAvatar
                                src={user.user_metadata?.avatar_url}
                                fallbackSeed={user.email || user.user_metadata?.full_name || 'user'}
                                fallbackSeeds={[user.user_metadata?.full_name || '']}
                                size="md"
                                className="h-8 w-8"
                                alt={user.user_metadata?.full_name || user.email || 'User'}
                              />
                              {currentAssignees.some(a => a.id === user.id) && (
                                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                  <Check className="h-2.5 w-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {user.user_metadata?.full_name || user.email}
                                <span className="text-xs text-slate-500 ml-1">(me)</span>
                                {currentAssignees.some(a => a.id === user.id) && (
                                  <span className="text-xs text-emerald-600 ml-1">✓ Assigned</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500">{user.email}</div>
                            </div>
                          </CommandItem>
                        )}

                        {/* Other organization members */}
                        {filteredMembers
                          .filter(member => member.id !== user?.id)
                          .map((member) => (
                            <CommandItem
                              key={member.id}
                              onSelect={() => handleToggleAssignee(member.id)}
                              disabled={isUpdating}
                              className="flex items-center gap-3 p-3 cursor-pointer"
                            >
                              <div className="relative">
                                <EnhancedAvatar
                                  src={member.avatarUrl}
                                  fallbackSeed={member.fullName || member.email || 'user'}
                                  size="md"
                                  className="h-8 w-8"
                                  alt={member.fullName || 'User'}
                                />
                                {currentAssignees.some(a => a.id === member.id) && (
                                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                    <Check className="h-2.5 w-2.5 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {member.fullName}
                                  {currentAssignees.some(a => a.id === member.id) && (
                                    <span className="text-xs text-emerald-600 ml-1">✓ Assigned</span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500">{member.email}</div>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>

                      {filteredMembers.length === 0 && !loadingMembers && (
                        <div className="p-4 text-center text-sm text-slate-500">
                          No members found matching &quot;{searchTerm}&quot;
                        </div>
                      )}
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Labels - Interactive */}
      <div className="px-3 pb-2">
        <div className="flex flex-wrap gap-1 items-center">
          {labels.map((label, index) => (
            <div
              key={index}
              className="px-2 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity text-xs font-medium"
              style={{
                backgroundColor: label.color,
                color: getTextColor(label.color),
                minWidth: 'auto'
              }}
              title={label.name}
              onClick={(e) => {
                e.stopPropagation();
                setLabelsOpen(true);
              }}
            >
              {label.name}
            </div>
          ))}

          {/* Add Label Button */}
          <Popover modal={true} open={labelsOpen} onOpenChange={setLabelsOpen}>
            <PopoverTrigger asChild>
              <button
                className="px-2 py-1 flex items-center justify-center border border-dashed border-gray-300 rounded-full hover:border-gray-400 transition-colors text-xs"
                onClick={(e) => e.stopPropagation()}
                title="Add labels"
              >
                <Tag className="w-3 h-3 text-gray-500 mr-1" />
                <span className="text-gray-500">Add</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <Label className="text-sm font-medium">Edit Labels</Label>

                {/* Current Labels */}
                {labels.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500">Current Labels</div>
                    <div className="flex flex-wrap gap-2">
                      {labels.map((label, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1 rounded-full text-xs"
                          style={{ backgroundColor: label.color + '20', color: label.color }}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          {label.name}
                          <button
                            className="hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveLabel(label);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Labels */}
                {boardLabels && boardLabels.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500">Available Labels</div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {boardLabels
                        .filter(boardLabel => !labels.some(currentLabel => currentLabel.id === boardLabel.id))
                        .map((boardLabel) => (
                          <button
                            key={boardLabel.id}
                            className="w-full flex items-center gap-2 p-2 rounded-md text-left hover:bg-gray-50 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddExistingLabel(boardLabel);
                            }}
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: boardLabel.color || '#6B7280' }}
                            />
                            <span className="flex-1 text-sm">{boardLabel.name}</span>
                            <Plus className="w-3 h-3 text-gray-400" />
                          </button>
                        ))}
                      {boardLabels.filter(boardLabel => !labels.some(currentLabel => currentLabel.id === boardLabel.id)).length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-2">All labels are already assigned</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Create New Label */}
                <div className="space-y-3 border-t pt-3">
                  <div className="text-xs text-gray-500">Add New Label</div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Label name"
                      value={newLabelName}
                      onChange={(e) => {
                        e.stopPropagation();
                        setNewLabelName(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newLabelColor}
                        onChange={(e) => {
                          e.stopPropagation();
                          setNewLabelColor(e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded border cursor-pointer"
                      />
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateLabel(taskBoardId!);
                        }}
                        disabled={!newLabelName.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>


      {/* Bottom Info Row */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0 text-xs text-gray-500">
            {/* Story Points - Interactive */}
            <Popover modal={true} open={storyPointsOpen} onOpenChange={setStoryPointsOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-1 hover:bg-blue-100 p-1 rounded transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center",
                    storyPoints && storyPoints > 0 ? "bg-blue-100" : "bg-gray-100"
                  )}>
                    <span className={cn(
                      "text-xs font-medium",
                      storyPoints && storyPoints > 0 ? "text-blue-700" : "text-gray-400"
                    )}>
                      {storyPoints || '?'}
                    </span>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-3" align="start">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Story Points</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 5, 8, 13].map((point) => (
                      <Button
                        key={point}
                        variant={storyPoints === point ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStoryPointsChange(point);
                        }}
                        className="h-8"
                      >
                        {point}
                      </Button>
                    ))}
                  </div>
                  {storyPoints && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStoryPointsChange(0);
                      }}
                      className="w-full text-red-600 hover:text-red-700"
                    >
                      Remove Points
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Comments - Interactive */}
            <Popover modal={true} open={commentsOpen} onOpenChange={setCommentsOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-1 hover:bg-amber-100 p-1 rounded transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>{commentsCount || 0}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="start">
                <div className="max-h-96 flex flex-col">
                  {/* Header */}
                  <div className="px-4 py-3 border-b">
                    <Label className="text-sm font-medium">Comments</Label>
                  </div>

                  {/* Comments List */}
                  <div className="flex-1 overflow-y-auto max-h-48 px-4 py-3">
                    {loadingComments ? (
                      <div className="text-sm text-gray-500 text-center py-4">Loading comments...</div>
                    ) : comments.length > 0 ? (
                      <div className="space-y-3">
                        {comments.map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            <EnhancedAvatar
                              src={comment.user.avatarUrl}
                              fallbackSeed={comment.user.email}
                              fallbackSeeds={[comment.user.fullName || '']}
                              size="sm"
                              className="h-6 w-6 mt-0.5"
                              alt={comment.user.fullName || comment.user.email}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="bg-gray-50 rounded-lg px-3 py-2">
                                <div className="text-xs font-medium text-gray-900 mb-1">
                                  {comment.user.fullName || comment.user.email}
                                </div>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {comment.content}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(comment.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">No comments yet</div>
                    )}
                  </div>

                  {/* Add Comment Form */}
                  <div className="border-t px-4 py-3 space-y-3">
                    <div
                      className={cn(
                        "relative",
                        isDragOver && "bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg"
                      )}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Textarea
                        placeholder="Write a comment..."
                        value={quickComment}
                        onChange={(e) => {
                          e.stopPropagation();
                          setQuickComment(e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onFocus={(e) => e.stopPropagation()}
                        className={cn(
                          "min-h-[60px] resize-none text-sm",
                          isDragOver && "border-blue-300"
                        )}
                      />
                      {isDragOver && (
                        <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-75 rounded-lg pointer-events-none">
                          <div className="text-blue-600 font-medium">Drop images here</div>
                        </div>
                      )}
                    </div>

                    {/* Upload Status */}
                    {uploadingImages.length > 0 && (
                      <div className="text-xs text-blue-600">
                        Uploading {uploadingImages.length} image(s)...
                      </div>
                    )}

                    {/* Image Upload Area */}
                    <div className="text-xs text-gray-500">
                      Drag&Drop or <button
                        className="text-blue-500 hover:text-blue-600 underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileSelect();
                        }}
                      >
                        select images
                      </button> Formatting rules
                    </div>

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickComment();
                        }}
                        disabled={!quickComment.trim() || uploadingImages.length > 0}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Files - Interactive */}
            <Popover modal={true} open={filesOpen} onOpenChange={setFilesOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-1 hover:bg-yellow-100 p-1 rounded transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Paperclip className="h-5 w-5" />
                  <span>{filesCount || 0}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4" align="start">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Files</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">Drop files here</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      or browse files
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Checklists - Interactive */}
            <Popover modal={true} open={checklistsOpen} onOpenChange={setChecklistsOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-1 hover:bg-purple-100 p-1 rounded transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ListTodo className="h-5 w-5" />
                  <span>{checklistsCount > 0 ? `${completedChecklists || 0}/${checklistsCount}` : '0'}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4" align="start">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Checklists</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Checklist
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Due Date - Interactive */}
            <Popover modal={true} open={dueDateOpen} onOpenChange={setDueDateOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-1 hover:bg-orange-100 p-1 rounded transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Calendar className="h-5 w-5" />
                  <span className="text-xs">
                    {dueDate
                      ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'Due'
                    }
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4" align="start">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Due Date</Label>
                  <Input
                    type="date"
                    defaultValue={dueDate ? new Date(dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      e.stopPropagation();
                      // Handle due date change
                      if (e.target.value) {
                        // Update due date via API
                        fetch(`/api/tasks/${id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ dueDate: e.target.value })
                        }).then(() => {
                          onAssigneesChange?.();
                          toast.success('Due date updated');
                          setDueDateOpen(false);
                        }).catch(() => {
                          toast.error('Failed to update due date');
                        });
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Priority Badge - Interactive */}
          <Popover modal={true} open={priorityOpen} onOpenChange={setPriorityOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "text-xs px-2 py-0 rounded-md transition-colors hover:opacity-80",
                  priority && priority !== 'medium'
                    ? cn(getPriorityColor(priority).color, getPriorityColor(priority).bgColor)
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {priority || 'medium'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="end">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Priority</Label>
                <div className="grid gap-2">
                  {['critical', 'high', 'medium', 'low'].map((priorityOption) => (
                    <Button
                      key={priorityOption}
                      variant={priority === priorityOption ? "default" : "outline"}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePriorityChange(priorityOption);
                      }}
                      className={cn(
                        "w-full justify-start",
                        priority === priorityOption && getPriorityColor(priorityOption).bgColor
                      )}
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      {priorityOption.charAt(0).toUpperCase() + priorityOption.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Checklist Progress Bar */}
      {checklistsCount > 0 && (
        <div className="px-3 pb-3">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-green-500 h-1 rounded-full transition-all"
              style={{ width: `${checklistProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}