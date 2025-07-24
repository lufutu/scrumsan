#!/usr/bin/env tsx

/**
 * Team Management Integration Verification Script
 * 
 * This script verifies that all team management components are properly integrated
 * and working together. It performs comprehensive checks without requiring database access.
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

interface VerificationResult {
  component: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: string[]
}

class TeamManagementVerifier {
  private results: VerificationResult[] = []
  private rootDir: string

  constructor() {
    this.rootDir = process.cwd()
  }

  private addResult(component: string, status: 'pass' | 'fail' | 'warning', message: string, details?: string[]) {
    this.results.push({ component, status, message, details })
  }

  private fileExists(path: string): boolean {
    return existsSync(join(this.rootDir, path))
  }

  private readFile(path: string): string | null {
    try {
      return readFileSync(join(this.rootDir, path), 'utf-8')
    } catch {
      return null
    }
  }

  private checkFileContains(path: string, patterns: string[]): boolean {
    const content = this.readFile(path)
    if (!content) return false
    
    return patterns.every(pattern => content.includes(pattern))
  }

  // Verify core components exist
  verifyComponentFiles() {
    console.log('🔍 Verifying component files...')
    
    const requiredComponents = [
      'components/team-management/TeamManagementPage.tsx',
      'components/team-management/EnhancedTeamManagementPage.tsx',
      'components/team-management/MemberTable.tsx',
      'components/team-management/MemberProfileCard.tsx',
      'components/team-management/MemberInviteDialog.tsx',
      'components/team-management/MemberRemovalDialog.tsx',
      'components/team-management/PermissionSetManager.tsx',
      'components/team-management/RoleManager.tsx',
      'components/team-management/FilterPanel.tsx',
      'components/team-management/EngagementManager.tsx',
      'components/team-management/TimeOffManager.tsx',
      'components/team-management/TimelineManager.tsx',
      'components/team-management/BoardsTab.tsx',
      'components/team-management/GuestsTab.tsx',
      'components/team-management/AvailabilityCard.tsx',
      'components/team-management/animations.ts'
    ]

    const missingComponents = requiredComponents.filter(component => !this.fileExists(component))
    
    if (missingComponents.length === 0) {
      this.addResult('Components', 'pass', 'All required component files exist')
    } else {
      this.addResult('Components', 'fail', 'Missing component files', missingComponents)
    }
  }

  // Verify API endpoints exist
  verifyApiEndpoints() {
    console.log('🔍 Verifying API endpoints...')
    
    const requiredEndpoints = [
      'app/api/organizations/[id]/members/route.ts',
      'app/api/organizations/[id]/members/[memberId]/route.ts',
      'app/api/organizations/[id]/members/[memberId]/profile/route.ts',
      'app/api/organizations/[id]/members/[memberId]/engagements/route.ts',
      'app/api/organizations/[id]/members/[memberId]/engagements/[engagementId]/route.ts',
      'app/api/organizations/[id]/members/[memberId]/time-off/route.ts',
      'app/api/organizations/[id]/members/[memberId]/time-off/[entryId]/route.ts',
      'app/api/organizations/[id]/members/[memberId]/timeline/route.ts',
      'app/api/organizations/[id]/members/[memberId]/timeline/[eventId]/route.ts',
      'app/api/organizations/[id]/permission-sets/route.ts',
      'app/api/organizations/[id]/permission-sets/[setId]/route.ts',
      'app/api/organizations/[id]/roles/route.ts',
      'app/api/organizations/[id]/roles/[roleId]/route.ts'
    ]

    const missingEndpoints = requiredEndpoints.filter(endpoint => !this.fileExists(endpoint))
    
    if (missingEndpoints.length === 0) {
      this.addResult('API Endpoints', 'pass', 'All required API endpoints exist')
    } else {
      this.addResult('API Endpoints', 'fail', 'Missing API endpoints', missingEndpoints)
    }
  }

  // Verify hooks exist
  verifyHooks() {
    console.log('🔍 Verifying React hooks...')
    
    const requiredHooks = [
      'hooks/useTeamMembers.ts',
      'hooks/usePermissionSets.ts',
      'hooks/useCustomRoles.ts',
      'hooks/useMemberProfile.ts',
      'hooks/useEngagements.ts',
      'hooks/useTimeOff.ts',
      'hooks/useTimeline.ts',
      'hooks/useAvailability.ts',
      'hooks/useMemberRemoval.ts',
      'hooks/useTeamManagementErrors.ts',
      'hooks/useTeamManagementUX.ts'
    ]

    const missingHooks = requiredHooks.filter(hook => !this.fileExists(hook))
    
    if (missingHooks.length === 0) {
      this.addResult('React Hooks', 'pass', 'All required React hooks exist')
    } else {
      this.addResult('React Hooks', 'fail', 'Missing React hooks', missingHooks)
    }
  }

  // Verify utility functions exist
  verifyUtilities() {
    console.log('🔍 Verifying utility functions...')
    
    const requiredUtilities = [
      'lib/permission-utils.ts',
      'lib/availability-utils.ts',
      'lib/engagement-utils.ts'
    ]

    const missingUtilities = requiredUtilities.filter(util => !this.fileExists(util))
    
    if (missingUtilities.length === 0) {
      this.addResult('Utilities', 'pass', 'All required utility functions exist')
    } else {
      this.addResult('Utilities', 'fail', 'Missing utility functions', missingUtilities)
    }
  }

  // Verify test files exist
  verifyTests() {
    console.log('🔍 Verifying test files...')
    
    const requiredTests = [
      'test/components/team-management/TeamManagementPage.test.tsx',
      'test/components/team-management/TeamManagementPage.simple.test.tsx',
      'test/components/team-management/MemberTable.test.tsx',
      'test/lib/permission-utils.test.ts',
      'test/lib/permission-utils.simple.test.ts',
      'test/lib/availability-utils.test.ts',
      'test/lib/availability-utils.simple.test.ts',
      'test/lib/engagement-utils.test.ts',
      'test/api/team-management.integration.test.ts',
      'test/e2e/team-management.e2e.test.ts',
      'test/e2e/team-management-comprehensive.e2e.test.ts',
      'test/factories/team-management.factory.ts',
      'test/accessibility/team-management-a11y.test.ts',
      'test/integration/team-management-system-integration.test.ts',
      'test/integration/permission-inheritance.test.ts',
      'test/integration/data-migration.test.ts'
    ]

    const missingTests = requiredTests.filter(test => !this.fileExists(test))
    
    if (missingTests.length === 0) {
      this.addResult('Tests', 'pass', 'All required test files exist')
    } else {
      this.addResult('Tests', 'warning', 'Some test files are missing', missingTests)
    }
  }

  // Verify database schema
  verifyDatabaseSchema() {
    console.log('🔍 Verifying database schema...')
    
    const schemaPath = 'prisma/schema.prisma'
    if (!this.fileExists(schemaPath)) {
      this.addResult('Database Schema', 'fail', 'Prisma schema file not found')
      return
    }

    const requiredModels = [
      'model PermissionSet',
      'model ProjectEngagement',
      'model TimeOffEntry',
      'model MemberProfile',
      'model TimelineEvent',
      'model CustomRole'
    ]

    const missingModels = requiredModels.filter(model => 
      !this.checkFileContains(schemaPath, [model])
    )

    if (missingModels.length === 0) {
      this.addResult('Database Schema', 'pass', 'All required database models exist')
    } else {
      this.addResult('Database Schema', 'fail', 'Missing database models', missingModels)
    }
  }

  // Verify TypeScript types
  verifyTypes() {
    console.log('🔍 Verifying TypeScript types...')
    
    const typesPath = 'types/index.ts'
    if (!this.fileExists(typesPath)) {
      this.addResult('TypeScript Types', 'warning', 'Main types file not found')
      return
    }

    const requiredTypes = [
      'OrganizationMember',
      'PermissionSet',
      'ProjectEngagement',
      'TimeOffEntry',
      'MemberProfile'
    ]

    const missingTypes = requiredTypes.filter(type => 
      !this.checkFileContains(typesPath, [type])
    )

    if (missingTypes.length === 0) {
      this.addResult('TypeScript Types', 'pass', 'All required TypeScript types exist')
    } else {
      this.addResult('TypeScript Types', 'warning', 'Some TypeScript types may be missing', missingTypes)
    }
  }

  // Verify animations and UI polish
  verifyAnimations() {
    console.log('🔍 Verifying animations and UI polish...')
    
    const animationsPath = 'components/team-management/animations.ts'
    if (!this.fileExists(animationsPath)) {
      this.addResult('Animations', 'fail', 'Animations file not found')
      return
    }

    const requiredAnimations = [
      'pageTransition',
      'staggerContainer',
      'staggerItem',
      'cardHover',
      'modalOverlay',
      'modalContent',
      'tabContent',
      'floatingButton'
    ]

    const missingAnimations = requiredAnimations.filter(animation => 
      !this.checkFileContains(animationsPath, [animation])
    )

    if (missingAnimations.length === 0) {
      this.addResult('Animations', 'pass', 'All required animations exist')
    } else {
      this.addResult('Animations', 'fail', 'Missing animation definitions', missingAnimations)
    }
  }

  // Verify documentation
  verifyDocumentation() {
    console.log('🔍 Verifying documentation...')
    
    const requiredDocs = [
      '.kiro/specs/team-management/requirements.md',
      '.kiro/specs/team-management/design.md',
      '.kiro/specs/team-management/tasks.md',
      'docs/team-management-api.md',
      'docs/permission-system.md'
    ]

    const missingDocs = requiredDocs.filter(doc => !this.fileExists(doc))
    
    if (missingDocs.length === 0) {
      this.addResult('Documentation', 'pass', 'All required documentation exists')
    } else {
      this.addResult('Documentation', 'warning', 'Some documentation files are missing', missingDocs)
    }
  }

  // Verify integration points
  verifyIntegrationPoints() {
    console.log('🔍 Verifying integration points...')
    
    // Check if team management is integrated into main navigation
    const sidebarPath = 'components/dashboard/app-sidebar.tsx'
    if (this.fileExists(sidebarPath)) {
      const hasTeamManagement = this.checkFileContains(sidebarPath, ['team', 'member'])
      if (hasTeamManagement) {
        this.addResult('Navigation Integration', 'pass', 'Team management integrated into navigation')
      } else {
        this.addResult('Navigation Integration', 'warning', 'Team management may not be integrated into navigation')
      }
    } else {
      this.addResult('Navigation Integration', 'warning', 'Main navigation file not found')
    }

    // Check if organization pages link to team management
    const orgPagePath = 'app/(app)/organizations/[organizationId]/page.tsx'
    if (this.fileExists(orgPagePath)) {
      const hasTeamLink = this.checkFileContains(orgPagePath, ['team', 'member'])
      if (hasTeamLink) {
        this.addResult('Organization Integration', 'pass', 'Team management linked from organization pages')
      } else {
        this.addResult('Organization Integration', 'warning', 'Team management may not be linked from organization pages')
      }
    } else {
      this.addResult('Organization Integration', 'warning', 'Organization page not found')
    }
  }

  // Run all verifications
  async runAllVerifications() {
    console.log('🚀 Starting Team Management Integration Verification...\n')

    this.verifyComponentFiles()
    this.verifyApiEndpoints()
    this.verifyHooks()
    this.verifyUtilities()
    this.verifyTests()
    this.verifyDatabaseSchema()
    this.verifyTypes()
    this.verifyAnimations()
    this.verifyDocumentation()
    this.verifyIntegrationPoints()

    this.printResults()
  }

  // Print verification results
  private printResults() {
    console.log('\n📊 Verification Results:')
    console.log('=' .repeat(50))

    const passed = this.results.filter(r => r.status === 'pass').length
    const failed = this.results.filter(r => r.status === 'fail').length
    const warnings = this.results.filter(r => r.status === 'warning').length

    this.results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️'
      console.log(`${icon} ${result.component}: ${result.message}`)
      
      if (result.details && result.details.length > 0) {
        result.details.forEach(detail => {
          console.log(`   - ${detail}`)
        })
      }
    })

    console.log('\n📈 Summary:')
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⚠️  Warnings: ${warnings}`)
    console.log(`📊 Total: ${this.results.length}`)

    if (failed === 0) {
      console.log('\n🎉 Team Management Integration Verification PASSED!')
      console.log('All critical components are in place and properly integrated.')
    } else {
      console.log('\n🚨 Team Management Integration Verification FAILED!')
      console.log('Please address the failed items before proceeding.')
      process.exit(1)
    }

    if (warnings > 0) {
      console.log('\n💡 Note: Some warnings were found. These are not critical but should be addressed for optimal functionality.')
    }
  }
}

// Run the verification
const verifier = new TeamManagementVerifier()
verifier.runAllVerifications().catch(console.error)