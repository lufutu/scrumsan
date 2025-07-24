'use client';

import { useState } from 'react';
import { Check, Search, UserPlus, X } from 'lucide-react';
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/animate-ui/radix/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useUsers } from '@/hooks/useUsers';
import { useSupabase } from '@/providers/supabase-provider';
import { toast } from 'sonner';

interface TaskAssigneeSelectorProps {
  taskId: string;
  boardId?: string;
  organizationId?: string;
  currentAssignees?: Array<{
    id: string;
    name: string;
    avatar?: string;
    initials: string;
  }>;
  onAssigneesChange?: (assignees: Array<{
    id: string;
    name: string;
    avatar?: string;
    initials: string;
  }>) => void;
  children: React.ReactNode;
}

export function TaskAssigneeSelector({
  taskId,
  boardId,
  organizationId,
  currentAssignees = [],
  onAssigneesChange,
  children
}: TaskAssigneeSelectorProps) {
  const { user } = useSupabase();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch organization members
  const { users: organizationMembers, isLoading: loadingMembers } = useUsers({
    organizationId
  });

  const filteredMembers = organizationMembers?.filter(member =>
    member.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleToggleAssignee = async (userId: string) => {
    if (!taskId) return;

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

      const response = await fetch(`/api/tasks/${taskId}`, {
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
      
      // Convert to the expected format
      const newAssignees = updatedTask.taskAssignees?.map((ta: any) => ({
        id: ta.user.id,
        name: ta.user.fullName || ta.user.email || 'Unknown User',
        avatar: ta.user.avatarUrl,
        initials: ta.user.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'
      })) || [];

      onAssigneesChange?.(newAssignees);

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
    if (!taskId || currentAssignees.length === 0) return;

    try {
      setIsUpdating(true);

      const response = await fetch(`/api/tasks/${taskId}`, {
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

      onAssigneesChange?.([]);
      toast.success('All assignees removed');

    } catch (error) {
      console.error('Error clearing assignees:', error);
      toast.error('Failed to clear assignees');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Popover modal={true} open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
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
                    No members found matching "{searchTerm}"
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}