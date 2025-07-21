'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Link2, 
  Trash2, 
  Search,
  ChevronRight,
  AlertCircle,
  Ban,
  Loader2,
  CheckCircle,
  Circle,
  Bug,
  Lightbulb,
  BookOpen,
  Zap,
  FileText,
  LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getItemTypeColor } from '@/lib/constants';

interface TaskRelations {
  parent: Task | null;
  subitems: Task[];
  blocking: Task[];
  blockedBy: Task[];
  related: any[];
}

interface Task {
  id: string;
  title: string;
  taskType: string;
  status: string;
  itemCode: string | null;
  assignee?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

interface RelationsTabProps {
  taskId: string;
  task: any;
  onUpdate?: () => void;
}

const taskTypeIcons: Record<string, LucideIcon> = {
  story: BookOpen,
  improvement: Zap,
  bug: Bug,
  task: CheckCircle,
  note: FileText,
  idea: Lightbulb,
};

function getTaskIcon(taskType: string) {
  const Icon = taskTypeIcons[taskType] || Circle;
  return Icon;
}

export function RelationsTab({ taskId, task, onUpdate }: RelationsTabProps) {
  const [relations, setRelations] = useState<TaskRelations>({
    parent: null,
    subitems: [],
    blocking: [],
    blockedBy: [],
    related: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingSubitem, setIsAddingSubitem] = useState(false);
  const [isAddingBlockingItem, setIsAddingBlockingItem] = useState(false);
  const [isSettingParent, setIsSettingParent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newSubitemTitle, setNewSubitemTitle] = useState('');
  const [newSubitemType, setNewSubitemType] = useState('task');

  useEffect(() => {
    if (taskId) {
      fetchRelations();
    }
  }, [taskId]);

  const fetchRelations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/relations`);
      if (response.ok) {
        const data = await response.json();
        setRelations(data);
      }
    } catch (error) {
      console.error('Error fetching relations:', error);
      toast.error('Failed to load relations');
    } finally {
      setIsLoading(false);
    }
  };

  const searchTasks = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/tasks/search?q=${encodeURIComponent(query)}&excludeId=${taskId}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching tasks:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const createSubitem = async () => {
    if (!newSubitemTitle.trim()) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSubitemTitle.trim(),
          taskType: newSubitemType
        })
      });

      if (response.ok) {
        toast.success('Subitem created');
        fetchRelations();
        setNewSubitemTitle('');
        setIsAddingSubitem(false);
        onUpdate?.();
      } else {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to create subitem');
      }
    } catch (error) {
      console.error('Error creating subitem:', error);
      toast.error('Failed to create subitem');
    }
  };

  const setParent = async (parentId: string | null) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/relations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId })
      });

      if (response.ok) {
        toast.success(parentId ? 'Parent set successfully' : 'Parent removed');
        fetchRelations();
        setIsSettingParent(false);
        setSearchQuery('');
        setSearchResults([]);
        onUpdate?.();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update parent');
      }
    } catch (error) {
      console.error('Error setting parent:', error);
      toast.error('Failed to update parent');
    }
  };

  const addBlockingRelation = async (targetTaskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/relations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTaskId,
          relationType: 'blocks'
        })
      });

      if (response.ok) {
        toast.success('Blocking item added');
        fetchRelations();
        setIsAddingBlockingItem(false);
        setSearchQuery('');
        setSearchResults([]);
        onUpdate?.();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add blocking relation');
      }
    } catch (error) {
      console.error('Error adding blocking relation:', error);
      toast.error('Failed to add blocking item');
    }
  };

  const removeRelation = async (targetTaskId: string, relationType: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/relations?targetTaskId=${targetTaskId}&relationType=${relationType}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Relation removed');
        fetchRelations();
        onUpdate?.();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove relation');
      }
    } catch (error) {
      console.error('Error removing relation:', error);
      toast.error('Failed to remove relation');
    }
  };

  const TaskCard = ({ task, onRemove, showRemove = false }: { task: Task; onRemove?: () => void; showRemove?: boolean }) => {
    const Icon = getTaskIcon(task.taskType);
    const typeColor = getItemTypeColor(task.taskType);
    
    return (
      <Card className="group border-slate-200 hover:shadow-sm transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className={cn("w-4 h-4 flex-shrink-0", typeColor.iconColor)} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {task.itemCode && (
                    <Badge variant="outline" className="text-xs">
                      {task.itemCode}
                    </Badge>
                  )}
                  <span className="text-sm font-medium truncate">{task.title}</span>
                </div>
                {task.assignee && (
                  <p className="text-xs text-slate-500 truncate">
                    {task.assignee.fullName}
                  </p>
                )}
              </div>
            </div>
            {showRemove && onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Parent Item */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Parent Item</h4>
        {relations.parent ? (
          <div className="space-y-2">
            <TaskCard 
              task={relations.parent} 
              onRemove={() => setParent(null)}
              showRemove
            />
          </div>
        ) : (
          <div>
            {isSettingParent ? (
              <Popover open={isSettingParent} onOpenChange={setIsSettingParent}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-slate-600"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search for parent item...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search tasks..." 
                      value={searchQuery}
                      onValueChange={(value) => {
                        setSearchQuery(value);
                        searchTasks(value);
                      }}
                    />
                    <CommandList>
                      {isSearching ? (
                        <CommandEmpty>Searching...</CommandEmpty>
                      ) : searchResults.length === 0 ? (
                        <CommandEmpty>No tasks found.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {searchResults.map((result) => (
                            <CommandItem
                              key={result.id}
                              onSelect={() => setParent(result.id)}
                            >
                              <div className="flex items-center gap-2">
                                {getTaskIcon(result.taskType)({ className: "w-4 h-4" })}
                                {result.itemCode && (
                                  <Badge variant="outline" className="text-xs">
                                    {result.itemCode}
                                  </Badge>
                                )}
                                <span className="truncate">{result.title}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsSettingParent(true)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add parent
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Subitems */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Subitems</h4>
        <div className="space-y-2">
          {relations.subitems.map((subitem) => (
            <TaskCard key={subitem.id} task={subitem} />
          ))}
          
          {isAddingSubitem ? (
            <Card className="border-dashed border-2 border-slate-300">
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Select value={newSubitemType} onValueChange={setNewSubitemType}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="story">Story</SelectItem>
                        <SelectItem value="bug">Bug</SelectItem>
                        <SelectItem value="improvement">Improvement</SelectItem>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="idea">Idea</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Subitem title..."
                      value={newSubitemTitle}
                      onChange={(e) => setNewSubitemTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          createSubitem();
                        }
                      }}
                      className="flex-1"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAddingSubitem(false);
                        setNewSubitemTitle('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={createSubitem}
                      disabled={!newSubitemTitle.trim()}
                    >
                      Create
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Search className="w-4 h-4 mr-2" />
                    Add existing
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search tasks to add as subitem..." 
                      onValueChange={(value) => {
                        searchTasks(value);
                      }}
                    />
                    <CommandList>
                      {isSearching ? (
                        <CommandEmpty>Searching...</CommandEmpty>
                      ) : searchResults.length === 0 ? (
                        <CommandEmpty>No tasks found.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {searchResults.map((result) => (
                            <CommandItem
                              key={result.id}
                              onSelect={async () => {
                                // Set the parent of the selected task to the current task
                                try {
                                  const response = await fetch(`/api/tasks/${result.id}/relations`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ parentId: taskId })
                                  });

                                  if (response.ok) {
                                    toast.success('Subitem added');
                                    fetchRelations();
                                    onUpdate?.();
                                  } else {
                                    const errorData = await response.json();
                                    throw new Error(errorData.error || 'Failed to add subitem');
                                  }
                                } catch (error) {
                                  console.error('Error adding subitem:', error);
                                  toast.error('Failed to add subitem');
                                }
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {getTaskIcon(result.taskType)({ className: "w-4 h-4" })}
                                {result.itemCode && (
                                  <Badge variant="outline" className="text-xs">
                                    {result.itemCode}
                                  </Badge>
                                )}
                                <span className="truncate">{result.title}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingSubitem(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create new
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Blocking Items */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Ban className="w-4 h-4 text-red-600" />
          <h4 className="text-sm font-semibold text-slate-700">Blocking Items</h4>
        </div>
        <div className="space-y-2">
          {relations.blocking.map((item) => (
            <TaskCard 
              key={item.id} 
              task={item} 
              onRemove={() => removeRelation(item.id, 'blocks')}
              showRemove
            />
          ))}
          
          <Popover open={isAddingBlockingItem} onOpenChange={setIsAddingBlockingItem}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add blocking item
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search tasks to block..." 
                  onValueChange={(value) => {
                    searchTasks(value);
                  }}
                />
                <CommandList>
                  {isSearching ? (
                    <CommandEmpty>Searching...</CommandEmpty>
                  ) : searchResults.length === 0 ? (
                    <CommandEmpty>No tasks found.</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {searchResults.map((result) => (
                        <CommandItem
                          key={result.id}
                          onSelect={() => addBlockingRelation(result.id)}
                        >
                          <div className="flex items-center gap-2">
                            {getTaskIcon(result.taskType)({ className: "w-4 h-4" })}
                            {result.itemCode && (
                              <Badge variant="outline" className="text-xs">
                                {result.itemCode}
                              </Badge>
                            )}
                            <span className="truncate">{result.title}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Blocked By */}
      {relations.blockedBy.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <h4 className="text-sm font-semibold text-slate-700">Blocked By</h4>
          </div>
          <div className="space-y-2">
            {relations.blockedBy.map((item) => (
              <TaskCard key={item.id} task={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}