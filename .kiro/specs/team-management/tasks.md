# Implementation Plan

- [x] 1. Database Schema Setup and Migrations

  - Create Prisma schema extensions for team management models
  - Add PermissionSet, ProjectEngagement, TimeOffEntry, MemberProfile, TimelineEvent, and CustomRole models
  - Update OrganizationMember model with additional fields (permissionSetId, jobTitle, workingHoursPerWeek, joinDate)
  - Generate and run database migrations
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1_

- [x] 2. Core API Endpoints for Organization Members

  - Implement GET /api/organizations/[id]/members endpoint with filtering support
  - Implement POST /api/organizations/[id]/members endpoint for adding members and invitations
  - Implement GET /api/organizations/[id]/members/[memberId] endpoint for member details
  - Implement PUT /api/organizations/[id]/members/[memberId] endpoint for updating member information
  - Implement DELETE /api/organizations/[id]/members/[memberId] endpoint for removing members
  - Add proper permission checks and validation using Zod schemas
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 9.1, 9.2, 9.3_

- [x] 3. Permission Sets Management API

  - Implement GET /api/organizations/[id]/permission-sets endpoint to list permission sets
  - Implement POST /api/organizations/[id]/permission-sets endpoint to create custom permission sets
  - Implement PUT /api/organizations/[id]/permission-sets/[setId] endpoint to update permission sets
  - Implement DELETE /api/organizations/[id]/permission-sets/[setId] endpoint with member reassignment logic
  - Add validation for permission dependencies and constraints
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4. Member Profile Management API

  - Implement GET /api/organizations/[id]/members/[memberId]/profile endpoint
  - Implement PUT /api/organizations/[id]/members/[memberId]/profile endpoint with visibility controls
  - Add validation for profile data and privacy settings
  - Implement proper access control based on visibility settings
  - _Requirements: 7.1, 7.2_

- [x] 5. Project Engagement Management API

  - Implement GET /api/organizations/[id]/members/[memberId]/engagements endpoint
  - Implement POST /api/organizations/[id]/members/[memberId]/engagements endpoint for adding engagements
  - Implement PUT /api/organizations/[id]/members/[memberId]/engagements/[engagementId] endpoint
  - Implement DELETE /api/organizations/[id]/members/[memberId]/engagements/[engagementId] endpoint
  - Add availability calculation logic and validation
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Time-off Management API

  - Implement GET /api/organizations/[id]/members/[memberId]/time-off endpoint
  - Implement POST /api/organizations/[id]/members/[memberId]/time-off endpoint for adding time-off entries
  - Implement PUT /api/organizations/[id]/members/[memberId]/time-off/[entryId] endpoint
  - Implement DELETE /api/organizations/[id]/members/[memberId]/time-off/[entryId] endpoint
  - Add validation for time-off types and date ranges
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Timeline Events Management API

  - Implement GET /api/organizations/[id]/members/[memberId]/timeline endpoint
  - Implement POST /api/organizations/[id]/members/[memberId]/timeline endpoint for adding timeline events
  - Implement PUT /api/organizations/[id]/members/[memberId]/timeline/[eventId] endpoint
  - Implement DELETE /api/organizations/[id]/members/[memberId]/timeline/[eventId] endpoint
  - _Requirements: 7.3_

- [x] 8. Custom Roles Management API

  - Implement GET /api/organizations/[id]/roles endpoint to list custom roles
  - Implement POST /api/organizations/[id]/roles endpoint to create custom roles with color coding
  - Implement PUT /api/organizations/[id]/roles/[roleId] endpoint to update custom roles
  - Implement DELETE /api/organizations/[id]/roles/[roleId] endpoint to remove custom roles
  - Add validation for role names and color values
  - _Requirements: 3.3, 3.4_

- [x] 9. Core React Hooks for Data Management

  - Create useTeamMembers hook for fetching and managing organization members
  - Create usePermissionSets hook for managing permission sets
  - Create useMemberProfile hook for member profile operations
  - Create useEngagements hook for project engagement management
  - Create useTimeOff hook for time-off management
  - Create useCustomRoles hook for custom roles management
  - Implement proper error handling and loading states in all hooks
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1_

- [x] 10. Main Team Management Page Component

  - Create TeamManagementPage component with three tabs (Members, Guests, Permission Sets)
  - Implement proper navigation and state management between tabs
  - Add breadcrumb navigation and page header
  - Implement permission-based UI rendering
  - Add loading and error states for the main page
  - _Requirements: 1.1, 1.3_

- [x] 11. Members Table Component with Filtering

  - Create MemberTable component displaying name, roles, engagements, and time-off activities
  - Implement FilterPanel component with role, project, hours, and availability filters
  - Add search functionality for member names and emails
  - Implement sorting capabilities for table columns
  - Add pagination for large member lists
  - Implement saved filter functionality
  - _Requirements: 1.1, 8.1, 8.2, 8.3, 8.4_

- [x] 12. Member Profile Card Component

  - Create MemberProfileCard component as a modal dialog
  - Implement Profile tab with editable contact and personal information
  - Add visibility controls for profile information fields
  - Implement proper form validation and error handling
  - Add permission checks for editing capabilities
  - _Requirements: 7.1, 7.2_

- [x] 13. Engagements Management Component

  - Create EngagementManager component for the Engagements tab
  - Implement engagement creation form with project selection, hours, role, and dates
  - Add engagement editing and deletion functionality
  - Display current and past engagements with availability calculations
  - Show total hours and availability summary
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 14. Time-off Management Component

  - Create TimeOffManager component for the Time off tab
  - Implement time-off entry form with type selection and date picker
  - Add time-off editing and deletion functionality
  - Display time-off calendar view and list view
  - Implement vacation day tracking and calculations
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 15. Timeline Management Component

  - Create TimelineManager component for the Timeline tab
  - Implement timeline event creation form with name and date
  - Add timeline event editing and deletion functionality
  - Display events in chronological order with proper formatting
  - _Requirements: 7.3_

- [x] 16. Boards Tab Component

  - Create BoardsTab component showing active board memberships
  - Implement functionality to add members to boards directly
  - Display board information with proper permission checks
  - Add filtering for board types and statuses
  - _Requirements: 7.4_

- [x] 17. Member Invitation Dialog Component

  - Create MemberInviteDialog component for adding new members
  - Implement email validation and user existence checking
  - Add role and permission set selection
  - Handle both existing user addition and email invitation flows
  - Implement proper error handling and success feedback
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 18. Permission Sets Management Component

  - Create PermissionSetManager component for the Permission Sets tab
  - Implement permission set creation form with granular permission controls
  - Add permission set editing and deletion with member reassignment
  - Display permission dependencies and validation
  - Show which members are assigned to each permission set
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 19. Custom Roles Management Component

  - Create RoleManager component for managing custom job roles
  - Implement role creation form with name and color picker
  - Add role editing and deletion functionality
  - Display roles with color coding and usage statistics
  - Integrate role selection in member profile and engagement forms
  - _Requirements: 3.3, 3.4_

- [x] 20. Guests Tab Component

  - Create GuestsTab component for displaying guest users
  - Implement filtering and search for guest members
  - Show guest access levels and board memberships
  - Add functionality to promote guests to full members
  - _Requirements: 1.3_

- [x] 21. Member Removal and Leave Functionality

  - Implement member removal dialog with board selection options
  - Add confirmation dialogs for destructive actions
  - Implement voluntary leave functionality with proper UI placement
  - Handle ownership transfer scenarios for organization owners
  - Add proper cleanup of related data (engagements, time-off, etc.)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4_

- [x] 22. Availability Calculation Utilities

  - Create utility functions for calculating member availability
  - Implement engagement hours summation and validation
  - Add time-off integration for availability calculations
  - Create helper functions for hours formatting and display
  - Add validation for engagement hour limits and conflicts
  - _Requirements: 4.3, 4.4, 8.2_

- [x] 23. Permission Enforcement and Security

  - Implement client-side permission checking utilities
  - Add server-side permission validation middleware
  - Create permission-based component rendering helpers
  - Implement audit logging for sensitive operations
  - Add input sanitization and validation throughout the system
  - _Requirements: 3.1, 3.2, 6.5_

- [x] 24. Navigation Integration and Routing

  - Add team management navigation to the main app sidebar
  - Implement proper routing for team management pages
  - Add deep linking support for member profiles and tabs
  - Integrate with existing breadcrumb navigation system
  - Add proper page titles and meta information
  - _Requirements: 1.1_

- [x] 25. Testing Implementation

  - Write unit tests for all utility functions and calculations
  - Create integration tests for API endpoints with different permission levels
  - Implement component tests for all major UI components
  - Add E2E tests for complete team management workflows
  - Create test data factories and fixtures for consistent testing
  - _Requirements: All requirements for comprehensive coverage_

- [x] 26. Error Handling and User Experience

  - Implement comprehensive error boundaries for all components
  - Add proper loading states and skeleton screens
  - Create user-friendly error messages and recovery options
  - Implement optimistic updates for better perceived performance
  - Add confirmation dialogs for all destructive actions
  - _Requirements: All requirements for proper error handling_

- [x] 27. Responsive Design and Accessibility

  - Ensure all components are fully responsive across device sizes
  - Implement proper ARIA labels and keyboard navigation
  - Add screen reader support for all interactive elements
  - Ensure color contrast compliance for all UI elements
  - Test and optimize for mobile touch interactions
  - _Requirements: All requirements for accessibility compliance_

- [x] 28. Performance Optimization and Caching

  - Implement React Query caching for all data fetching
  - Add proper cache invalidation strategies
  - Optimize database queries with proper indexing
  - Implement pagination and virtual scrolling for large lists
  - Add debouncing for search and filter inputs
  - _Requirements: 8.1, 8.3 for filtering performance_

- [x] 29. Documentation and Type Safety

  - Add comprehensive JSDoc comments to all functions and components
  - Ensure complete TypeScript coverage with strict typing
  - Create API documentation for all endpoints
  - Add inline help text and tooltips for complex features
  - Document permission system and configuration options
  - _Requirements: All requirements for maintainability_

- [x] 30. Integration Testing and Final Polish
  - Test integration with existing organization and project systems
  - Verify permission inheritance and dependency enforcement
  - Test data migration scenarios and edge cases
  - Perform comprehensive user acceptance testing
  - Add final UI polish and animation improvements
  - _Requirements: All requirements for complete system integration_
