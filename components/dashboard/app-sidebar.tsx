"use client"

import * as React from "react"
import {
    Home,
    Kanban,
    LayoutDashboard,
    Plus,
    Settings,
    Search,
    HelpCircle,
    Building2,
    ChevronRight,
} from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"

import { NavMain } from "@/components/dashboard/nav-main"
import { NavSecondary } from "@/components/dashboard/nav-secondary"
import { NavUser } from "@/components/dashboard/nav-user"
import { ExpandableNav } from "@/components/dashboard/expandable-nav"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/animate-ui/radix/sidebar"
import { OrgSwitcher } from "@/components/dashboard/org-switcher"
import { CreateOrganizationDialog } from "@/components/organizations/create-organization-dialog"
import { useOrganization } from "@/providers/organization-provider"
import { useSupabase } from "@/providers/supabase-provider"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { organizations, activeOrg, isLoading } = useOrganization()
    const { user } = useSupabase()
    const pathname = usePathname()
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)

    const navMain = [
        {
            title: "Dashboard",
            url: "/",
            icon: Home,
            isActive: pathname === "/"
        },
        {
            title: "Boards",
            url: "/boards",
            icon: Kanban,
            isActive: pathname.startsWith("/boards")
        },
        {
            title: "Organizations",
            url: "/organizations",
            icon: Building2,
            isActive: pathname.startsWith("/organizations")
        }
    ]

    const navSecondary = [
        {
            title: "Search",
            url: "/search",
            icon: Search,
        },
        {
            title: "Settings",
            url: "/settings", 
            icon: Settings,
        },
        {
            title: "Help & Support",
            url: "/help",
            icon: HelpCircle,
        }
    ]

    const userData = {
        name: user?.user_metadata?.full_name || user?.email || "User",
        email: user?.email || "",
        avatar: user?.user_metadata?.avatar_url || "",
    }

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5"
                        >
                            <Link href="/">
                                <LayoutDashboard className="h-5 w-5" />
                                <span className="text-base font-semibold">ScrumSan</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            
            <SidebarHeader>
                {!isLoading && organizations && organizations.length > 0 && (
                    <OrgSwitcher />
                )}
                {!isLoading && organizations && organizations.length === 0 && (
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => setIsCreateDialogOpen(true)}
                                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                            >
                                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                    <Plus className="size-4" />
                                </div>
                                <span className="text-sm font-medium">Create Organization</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                )}
            </SidebarHeader>
            
            <SidebarContent>
                <NavMain items={navMain} />
                
                {/* Expandable workspace navigation */}
                {!isLoading && organizations && organizations.length > 0 && (
                    <ExpandableNav />
                )}
                
                <NavSecondary items={navSecondary} className="mt-auto" />
            </SidebarContent>
            
            <SidebarFooter>
                <NavUser user={userData} />
            </SidebarFooter>
            <SidebarRail />

            <CreateOrganizationDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
            />
        </Sidebar>
    )
}
