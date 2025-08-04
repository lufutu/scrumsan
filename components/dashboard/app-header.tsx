'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/animate-ui/radix/sidebar';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  isCurrentPage?: boolean;
}

interface AppHeaderProps {
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function AppHeader({
  title,
  breadcrumbs: customBreadcrumbs,
  actions,
  className,
}: AppHeaderProps) {
  const pathname = usePathname();

  // Generate breadcrumbs from pathname if not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      {
        label: 'Home',
        href: '/',
        icon: <Home className="w-4 h-4" />,
      },
    ];

    let currentPath = '';
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath += `/${segment}`;
      const isLast = i === segments.length - 1;

      // Skip dynamic route parameters (UUIDs and similar)
      if (segment.match(/^[a-f0-9-]{36}$/)) {
        continue;
      }

      let label = segment;
      const href = currentPath;

      // Map route segments to human-readable labels
      switch (segment) {
        case 'organizations':
          label = 'Organizations';
          break;
        case 'projects':
          label = 'Projects';
          break;
        case 'boards':
          label = 'Boards';
          break;
        case 'sprints':
          label = 'Sprints';
          break;
        case 'tasks':
          label = 'Tasks';
          break;
        case 'members':
          label = 'Team Management';
          break;
        case 'settings':
          label = 'Settings';
          break;
        case 'analytics':
          label = 'Analytics';
          break;
        case 'labels':
          label = 'Labels';
          break;
        case 'sprint-backlog':
          label = 'Sprint Backlog';
          break;
        case 'board':
          label = 'Board';
          break;
        case 'backlog':
          label = 'Backlog';
          break;
        default:
          // Capitalize first letter and replace hyphens with spaces
          label = segment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
      }

      breadcrumbs.push({
        label,
        href: isLast ? undefined : href,
        isCurrentPage: isLast,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = customBreadcrumbs || generateBreadcrumbs();
  const pageTitle = title || breadcrumbs[breadcrumbs.length - 1]?.label || 'Page';

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="container flex h-14 max-w-screen-2xl items-center px-2">
        {/* Sidebar Trigger */}
        <SidebarTrigger className="-ml-1" />
        
        <Separator orientation="vertical" className="mx-2 h-6" />
        
        {/* Breadcrumbs */}
        <div className="flex items-center min-w-0">
          <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm text-muted-foreground">
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                )}
                <div className="flex items-center">
                  {item.icon && (
                    <span className="mr-1.5 flex-shrink-0">{item.icon}</span>
                  )}
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="hover:text-foreground transition-colors truncate"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        'truncate',
                        item.isCurrentPage && 'text-foreground font-medium'
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </div>
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Actions */}
        {actions && (
          <>
            <Separator orientation="vertical" className="mx-2 h-6" />
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

// Hook for easy breadcrumb management
export function useBreadcrumbs() {
  const [breadcrumbs, setBreadcrumbs] = React.useState<BreadcrumbItem[]>([]);

  const updateBreadcrumbs = React.useCallback((items: BreadcrumbItem[]) => {
    setBreadcrumbs(items);
  }, []);

  const addBreadcrumb = React.useCallback((item: BreadcrumbItem) => {
    setBreadcrumbs(prev => [...prev, item]);
  }, []);

  const resetBreadcrumbs = React.useCallback(() => {
    setBreadcrumbs([]);
  }, []);

  return {
    breadcrumbs,
    updateBreadcrumbs,
    addBreadcrumb,
    resetBreadcrumbs,
  };
}

export type { BreadcrumbItem };