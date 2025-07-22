'use client';

import { 
  Check, 
  ExternalLink, 
  MessageCircle, 
  Paperclip, 
  CheckSquare, 
  MoreHorizontal,
  Star,
  Users,
  Link,
  Share,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getItemTypeColor } from '@/lib/constants';

interface TaskCardProps {
  id: string;
  itemCode?: string; // e.g., "SPDR-1"
  title: string;
  description?: string;
  taskType: 'story' | 'bug' | 'task' | 'epic' | 'improvement';
  storyPoints?: number;
  effortUnits?: number;
  estimationType?: 'story_points' | 'effort_units';
  assignee?: {
    name: string;
    avatar?: string;
    initials: string;
  };
  reviewer?: {
    name: string;
    avatar?: string;
    initials: string;
  };
  labels?: Array<{
    name: string;
    color: string;
  }>;
  isPriority?: boolean;
  hasComments?: boolean;
  hasFiles?: boolean;
  hasChecklists?: boolean;
  commentsCount?: number;
  filesCount?: number;
  checklistsCount?: number;
  completedChecklists?: number;
  subitemsCount?: number;
  parentItem?: {
    title: string;
    type: string;
  };
  url?: string;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClone?: () => void;
  onMirror?: () => void;
  onMove?: () => void;
  onShare?: () => void;
}

export function TaskCard({
  id,
  itemCode,
  title,
  description,
  taskType,
  storyPoints,
  effortUnits,
  estimationType = 'story_points',
  assignee,
  reviewer,
  labels = [],
  isPriority = false,
  hasComments = false,
  hasFiles = false,
  hasChecklists = false,
  commentsCount = 0,
  filesCount = 0,
  checklistsCount = 0,
  completedChecklists = 0,
  subitemsCount = 0,
  parentItem,
  url,
  onClick,
  onEdit,
  onDelete,
  onClone,
  onMirror,
  onMove,
  onShare
}: TaskCardProps) {

  const getTaskTypeIcon = () => {
    switch (taskType) {
      case 'story':
        return '●';
      case 'bug':
        return '🐛';
      case 'task':
        return '●';
      case 'epic':
        return '⚡';
      case 'improvement':
        return '⬆️';
      default:
        return '●';
    }
  };

  const estimationValue = estimationType === 'story_points' ? storyPoints : effortUnits;

  return (
    <div 
      className="group bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer relative"
      onClick={onClick}
    >
      {/* Task Type Header */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium",
              getItemTypeColor(taskType).color,
              getItemTypeColor(taskType).bgColor
            )}>
              {getTaskTypeIcon()}
            </div>
            <span className="text-xs text-gray-500 uppercase font-medium">
              {taskType}
            </span>
          </div>
          
          {/* Priority Star and Status */}
          <div className="flex items-center gap-2">
            {isPriority && (
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
            )}
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3">

        {/* Item Code and Title */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400 font-mono">{itemCode || `#${id.slice(0, 8)}`}</span>
            <div className="flex items-center gap-1">
              {url && (
                <Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600">
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Item
                  </DropdownMenuItem>
                  {onClone && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClone(); }}>
                      <Link className="w-4 h-4 mr-2" />
                      Clone Item
                    </DropdownMenuItem>
                  )}
                  {onMirror && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMirror(); }}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Mirror Item
                    </DropdownMenuItem>
                  )}
                  {onMove && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(); }}>
                      <MoreHorizontal className="w-4 h-4 mr-2" />
                      Move to Board
                    </DropdownMenuItem>
                  )}
                  {onShare && (
                    <DropdownMenuSeparator />
                  )}
                  {onShare && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(); }}>
                      <Share className="w-4 h-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="text-red-600"
                      >
                        <MoreHorizontal className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <h4 className="text-sm font-medium text-gray-900 leading-snug">
            {title}
          </h4>
        </div>

        {/* Labels */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {labels.map((label, index) => (
              <div
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: `${label.color}20`,
                  color: label.color,
                  border: `1px solid ${label.color}40`
                }}
              >
                {label.name}
              </div>
            ))}
          </div>
        )}

        {/* Parent/Subitem Indicator */}
        {parentItem && (
          <div className="mb-3 text-xs text-gray-500">
            <span>↳ Subitem of {parentItem.title}</span>
          </div>
        )}

        {/* Performers and Activity Row */}
        <div className="flex items-center justify-between">
          {/* Assignee and Reviewer */}
          <div className="flex items-center -space-x-2">
            {assignee && (
              <div 
                className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white"
                title={`Assignee: ${assignee.name}`}
              >
                {assignee.initials}
              </div>
            )}
            {reviewer && (
              <div 
                className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white"
                title={`Reviewer: ${reviewer.name}`}
              >
                {reviewer.initials}
              </div>
            )}
          </div>

          {/* Activity Icons and Estimation */}
          <div className="flex items-center gap-3">
            {/* Activity Icons */}
            <div className="flex items-center gap-2">
              {hasComments && (
                <div className="flex items-center gap-1 text-gray-500">
                  <MessageCircle className="w-3 h-3" />
                  <span className="text-xs">{commentsCount}</span>
                </div>
              )}
              {hasFiles && (
                <div className="flex items-center gap-1 text-gray-500">
                  <Paperclip className="w-3 h-3" />
                  <span className="text-xs">{filesCount}</span>
                </div>
              )}
              {hasChecklists && (
                <div className="flex items-center gap-1 text-gray-500">
                  <CheckSquare className="w-3 h-3" />
                  <span className="text-xs">{completedChecklists}/{checklistsCount}</span>
                </div>
              )}
              {subitemsCount > 0 && (
                <div className="flex items-center gap-1 text-gray-500">
                  <Users className="w-3 h-3" />
                  <span className="text-xs">{subitemsCount}</span>
                </div>
              )}
            </div>

            {/* Estimation */}
            {estimationValue && (
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {estimationValue} {estimationType === 'story_points' ? 'SP' : 'EU'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}