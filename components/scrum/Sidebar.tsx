'use client';

import { 
  ChevronLeft, 
  Plus, 
  BarChart3, 
  Clock, 
  FileText, 
  Users, 
  Trash2, 
  Settings,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ 
  isCollapsed = false, 
  onToggleCollapse 
}: SidebarProps) {
  const sidebarItems = [
    { icon: BarChart3, label: 'Dashboard', active: false },
    { icon: Clock, label: 'Timetracking', active: false },
    { icon: FileText, label: 'Reports', active: false },
    { icon: Users, label: 'Team', active: false },
    { icon: Trash2, label: 'Trash', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ];

  return (
    <div className={cn(
      "bg-gray-800 text-white h-full flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Collapse Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!isCollapsed && (
          <span className="text-sm font-medium text-gray-300">COLLAPSE SIDEBAR</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="text-gray-400 hover:text-white hover:bg-gray-700"
        >
          <ChevronLeft className={cn(
            "w-4 h-4 transition-transform",
            isCollapsed && "rotate-180"
          )} />
        </Button>
      </div>

      {/* Add New Button */}
      <div className="p-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700"
        >
          <Plus className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Add New</span>}
        </Button>
      </div>

      {/* Organizations Section */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-2">
          {!isCollapsed && (
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              ORGANIZATIONS
            </span>
          )}
          {!isCollapsed && (
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ChevronDown className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center space-x-3 px-2 py-2 rounded bg-gray-700">
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-xs font-bold">
              M
            </div>
            {!isCollapsed && (
              <span className="text-sm text-white">My Organization</span>
            )}
          </div>
        </div>
      </div>

      {/* Project Section */}
      <div className="px-4 mt-6">
        <div className="flex items-center space-x-3 px-2 py-2 rounded bg-emerald-600">
          <div className="w-6 h-6 bg-pink-600 rounded flex items-center justify-center text-xs font-bold text-white">
            SPDR
          </div>
          {!isCollapsed && (
            <span className="text-sm text-white font-medium">Scrum PTA</span>
          )}
        </div>
      </div>

      {/* Add New Project Button */}
      <div className="px-4 mt-2">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700"
        >
          <Plus className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Add New</span>}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 mt-6">
        <div className="space-y-1">
          {sidebarItems.map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              className={cn(
                "w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700",
                item.active && "bg-gray-700 text-white"
              )}
            >
              <item.icon className="w-4 h-4" />
              {!isCollapsed && <span className="ml-2">{item.label}</span>}
            </Button>
          ))}
        </div>
      </nav>

      {/* Bottom Section - Trash */}
      <div className="p-4 border-t border-gray-700">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"
        >
          <Trash2 className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Trash</span>}
        </Button>
      </div>
    </div>
  );
}