"use client"

import { useCallback } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import type { Database } from "@/types/database"

type OrganizationRole = Database["public"]["Tables"]["organization_members"]["Row"]["role"]
type ProjectRole = Database["public"]["Tables"]["project_members"]["Row"]["role"]

export function usePermissions() {
  const { user } = useSupabase()

  const userId = user?.id

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    return !!userId
  }, [userId])

  // Check if user is a member of an organization
  const isOrganizationMember = useCallback(
    async (organizationId: string, supabase: any) => {
      if (!userId) return false

      const { data, error } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .single()

      return !!data && !error
    },
    [userId],
  )

  // Check if user has a specific role in an organization
  const hasOrganizationRole = useCallback(
    async (organizationId: string, roles: OrganizationRole | OrganizationRole[], supabase: any) => {
      if (!userId) return false

      const { data, error } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .single()

      if (error || !data) return false

      const allowedRoles = Array.isArray(roles) ? roles : [roles]
      return allowedRoles.includes(data.role)
    },
    [userId],
  )

  // Check if user is a member of a project
  const isProjectMember = useCallback(
    async (projectId: string, supabase: any) => {
      if (!userId) return false

      const { data, error } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .single()

      return !!data && !error
    },
    [userId],
  )

  // Check if user has a specific role in a project
  const hasProjectRole = useCallback(
    async (projectId: string, roles: ProjectRole | ProjectRole[], supabase: any) => {
      if (!userId) return false

      const { data, error } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .single()

      if (error || !data) return false

      const allowedRoles = Array.isArray(roles) ? roles : [roles]
      return allowedRoles.includes(data.role)
    },
    [userId],
  )

  // Check if user can manage a project (product owner or scrum master)
  const canManageProject = useCallback(
    async (projectId: string, supabase: any) => {
      return hasProjectRole(projectId, ["product_owner", "scrum_master"], supabase)
    },
    [hasProjectRole],
  )

  // Check if user can manage an organization (owner or admin)
  const canManageOrganization = useCallback(
    async (organizationId: string, supabase: any) => {
      return hasOrganizationRole(organizationId, ["owner", "admin"], supabase)
    },
    [hasOrganizationRole],
  )

  return {
    isAuthenticated,
    isOrganizationMember,
    hasOrganizationRole,
    isProjectMember,
    hasProjectRole,
    canManageProject,
    canManageOrganization,
  }
}
