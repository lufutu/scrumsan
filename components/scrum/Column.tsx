'use client';

import { useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import InlineAddTask from './InlineAddTask';
import { EnhancedInlineForm } from './EnhancedInlineForm';
import { ComprehensiveInlineForm } from './ComprehensiveInlineForm';

interface ColumnProps {
  title: string;
  itemCount: number;
  pointCount: number;
  children: React.ReactNode;
  columnType: 'backlog' | 'sprint' | 'followup';
  onAddItem?: () => void;
  onAddTask?: (title: string) => Promise<void>;
  onAddTaskEnhanced?: (data: {
    title: string;
    taskType: string;
    assigneeId?: string;
    labels?: string[];
    dueDate?: string;
    priority?: string;
  }) => Promise<void>;
  users?: Array<{
    id: string;
    name: string;
    initials: string;
    avatar?: string;
  }>;
  labels?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  useEnhancedForm?: boolean;
}

export function Column({ 
  title, 
  itemCount, 
  pointCount, 
  children, 
  columnType,
  onAddItem,
  onAddTask,
  onAddTaskEnhanced,
  users,
  labels,
  useEnhancedForm = false
}: ColumnProps) {
  const [showEnhancedForm, setShowEnhancedForm] = useState(false);

  const handleAddTaskEnhanced = async (data: any) => {
    if (onAddTaskEnhanced) {
      await onAddTaskEnhanced(data);
      setShowEnhancedForm(false);
    }
  };
  const getColumnStyles = () => {
    switch (columnType) {
      case 'backlog':
        return 'bg-gradient-to-b from-orange-500 to-orange-600';
      case 'sprint':
        return 'bg-gradient-to-b from-red-500 to-red-600';
      case 'followup':
        return 'bg-gradient-to-b from-orange-600 to-red-600';
      default:
        return 'bg-gradient-to-b from-orange-500 to-orange-600';
    }
  };

  const getDropdownItems = () => {
    switch (columnType) {
      case 'sprint':
        return [
          { label: 'Delete', icon: '🗑️' },
          { label: 'Insert predefined Items', icon: '📋' },
          { label: 'Start Sprint', icon: '▶️' },
          { label: 'Export Sprint', icon: '📤' },
          { label: 'Set column limit', value: 'UNLIMITED' },
        ];
      case 'backlog':
        return [
          { label: 'Delete', icon: '🗑️' },
          { label: 'Insert predefined Items', icon: '📋' },
          { label: 'Export Backlog', icon: '📤' },
          { label: 'Set column limit', value: 'UNLIMITED' },
        ];
      default:
        return [
          { label: 'Delete', icon: '🗑️' },
          { label: 'Export Column', icon: '📤' },
          { label: 'Set column limit', value: 'UNLIMITED' },
        ];
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Column Header */}
      <div className={cn(
        "rounded-t-lg px-4 py-3 flex items-center justify-between text-white",
        getColumnStyles()
      )}>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <span className="text-xs bg-white/20 px-2 py-1 rounded">📊</span>
          </div>
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-xs opacity-90">
              {itemCount} Items | {pointCount} Points
            </p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {getDropdownItems().map((item, index) => (
              <DropdownMenuItem key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.value && (
                  <span className="text-xs text-gray-500">{item.value}</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Column Content */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto group relative">
        {/* Top + Button (appears on hover only when items exist) */}
        {itemCount > 0 && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEnhancedForm(true)}
              className="bg-white shadow-md border-gray-300 hover:bg-gray-50 text-gray-600"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}

        {children}
        
        {/* Bottom Add Task (always visible if items exist and form not shown) */}
        {itemCount > 0 && !showEnhancedForm && (
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEnhancedForm(true)}
              className="w-full text-gray-600 border-gray-300 hover:bg-gray-50 justify-start"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add item...
            </Button>
          </div>
        )}
        
        {/* Enhanced Form (for both empty and non-empty states) */}
        {showEnhancedForm && (
          <div className={itemCount === 0 ? "mt-4" : "pt-2"}>
            <ComprehensiveInlineForm
              onAdd={async (data) => {
                if (onAddTaskEnhanced) {
                  await onAddTaskEnhanced(data)
                  setShowEnhancedForm(false)
                }
              }}
              onCancel={() => setShowEnhancedForm(false)}
              placeholder="What needs to be done?"
              users={users}
              labels={labels}
            />
          </div>
        )}
        
        {/* Empty State */}
        {itemCount === 0 && !showEnhancedForm && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mt-12">
            <div className="text-gray-400 mb-2">
              <div className="w-12 h-12 mx-auto mb-2 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Drag Items here or click on + to create a new Item
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEnhancedForm(true)}
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}