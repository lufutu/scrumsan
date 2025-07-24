import { faker } from '@faker-js/faker'

export interface TestUser {
  id: string
  name: string
  email: string
  avatar_url?: string
}

export interface TestOrganization {
  id: string
  name: string
  slug: string
  createdAt: Date
}

export interface TestOrganizationMember {
  id: string
  organizationId: string
  userId: string
  role: 'owner' | 'admin' | 'member' | 'guest'
  permissionSetId?: string
  jobTitle?: string
  workingHoursPerWeek: number
  joinDate?: Date
  createdAt: Date
  user: TestUser
  permissionSet?: TestPermissionSet
  engagements: TestProjectEngagement[]
  timeOffEntries: TestTimeOffEntry[]
  profileData?: TestMemberProfile
}

export interface TestPermissionSet {
  id: string
  organizationId: string
  name: string
  permissions: {
    teamMembers: {
      viewAll: boolean
      manageAll: boolean
    }
    projects: {
      viewAll: boolean
      manageAll: boolean
      viewAssigned: boolean
      manageAssigned: boolean
    }
    invoicing: {
      viewAll: boolean
      manageAll: boolean
      viewAssigned: boolean
      manageAssigned: boolean
    }
    clients: {
      viewAll: boolean
      manageAll: boolean
      viewAssigned: boolean
      manageAssigned: boolean
    }
    worklogs: {
      manageAll: boolean
    }
  }
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
  members: TestOrganizationMember[]
}

export interface TestProject {
  id: string
  name: string
  organizationId: string
}

export interface TestProjectEngagement {
  id: string
  organizationMemberId: string
  projectId: string
  role?: string
  hoursPerWeek: number
  startDate: Date
  endDate?: Date
  isActive: boolean
  createdAt: Date
  project: TestProject
}

export interface TestTimeOffEntry {
  id: string
  organizationMemberId: string
  type: 'vacation' | 'parental_leave' | 'sick_leave' | 'paid_time_off' | 'unpaid_time_off' | 'other'
  startDate: Date
  endDate: Date
  description?: string
  approvedBy?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date
}

export interface TestMemberProfile {
  id: string
  organizationMemberId: string
  secondaryEmail?: string
  address?: string
  phone?: string
  linkedin?: string
  skype?: string
  twitter?: string
  birthday?: Date
  maritalStatus?: string
  family?: string
  other?: string
  visibility: Record<string, 'admin' | 'member'>
  createdAt: Date
  updatedAt: Date
}

export interface TestCustomRole {
  id: string
  organizationId: string
  name: string
  color: string
  createdAt: Date
}

export interface TestTimelineEvent {
  id: string
  organizationMemberId: string
  eventName: string
  eventDate: Date
  description?: string
  createdBy: string
  createdAt: Date
}

// Factory functions
export class TeamManagementFactory {
  static createUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      avatar_url: faker.helpers.maybe(() => faker.image.avatar(), { probability: 0.7 }),
      ...overrides,
    }
  }

  static createOrganization(overrides: Partial<TestOrganization> = {}): TestOrganization {
    const name = faker.company.name()
    return {
      id: faker.string.uuid(),
      name,
      slug: faker.helpers.slugify(name).toLowerCase(),
      createdAt: faker.date.past(),
      ...overrides,
    }
  }

  static createPermissionSet(overrides: Partial<TestPermissionSet> = {}): TestPermissionSet {
    return {
      id: faker.string.uuid(),
      organizationId: faker.string.uuid(),
      name: faker.helpers.arrayElement(['Project Manager', 'Developer', 'Designer', 'QA Tester', 'Client Manager']),
      permissions: {
        teamMembers: {
          viewAll: faker.datatype.boolean(),
          manageAll: faker.datatype.boolean(),
        },
        projects: {
          viewAll: faker.datatype.boolean(),
          manageAll: faker.datatype.boolean(),
          viewAssigned: true, // Usually true
          manageAssigned: faker.datatype.boolean(),
        },
        invoicing: {
          viewAll: faker.datatype.boolean(),
          manageAll: faker.datatype.boolean(),
          viewAssigned: faker.datatype.boolean(),
          manageAssigned: faker.datatype.boolean(),
        },
        clients: {
          viewAll: faker.datatype.boolean(),
          manageAll: faker.datatype.boolean(),
          viewAssigned: faker.datatype.boolean(),
          manageAssigned: faker.datatype.boolean(),
        },
        worklogs: {
          manageAll: faker.datatype.boolean(),
        },
      },
      isDefault: false,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      members: [],
      ...overrides,
    }
  }

  static createProject(overrides: Partial<TestProject> = {}): TestProject {
    return {
      id: faker.string.uuid(),
      name: faker.helpers.arrayElement(['Project Alpha', 'Project Beta', 'Project Gamma', 'Mobile App', 'Website Redesign']),
      organizationId: faker.string.uuid(),
      ...overrides,
    }
  }

  static createProjectEngagement(overrides: Partial<TestProjectEngagement> = {}): TestProjectEngagement {
    const startDate = faker.date.past()
    const endDate = faker.helpers.maybe(() => faker.date.future({ refDate: startDate }), { probability: 0.6 })
    
    return {
      id: faker.string.uuid(),
      organizationMemberId: faker.string.uuid(),
      projectId: faker.string.uuid(),
      role: faker.helpers.arrayElement(['Developer', 'Senior Developer', 'Designer', 'Project Manager', 'QA Tester']),
      hoursPerWeek: faker.number.int({ min: 5, max: 40 }),
      startDate,
      endDate,
      isActive: faker.datatype.boolean({ probability: 0.8 }),
      createdAt: faker.date.past(),
      project: this.createProject(),
      ...overrides,
    }
  }

  static createTimeOffEntry(overrides: Partial<TestTimeOffEntry> = {}): TestTimeOffEntry {
    const startDate = faker.date.future()
    const endDate = faker.date.future({ refDate: startDate })
    
    return {
      id: faker.string.uuid(),
      organizationMemberId: faker.string.uuid(),
      type: faker.helpers.arrayElement(['vacation', 'parental_leave', 'sick_leave', 'paid_time_off', 'unpaid_time_off', 'other']),
      startDate,
      endDate,
      description: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.7 }),
      approvedBy: faker.helpers.maybe(() => faker.string.uuid(), { probability: 0.8 }),
      status: faker.helpers.arrayElement(['pending', 'approved', 'rejected']),
      createdAt: faker.date.past(),
      ...overrides,
    }
  }

  static createMemberProfile(overrides: Partial<TestMemberProfile> = {}): TestMemberProfile {
    return {
      id: faker.string.uuid(),
      organizationMemberId: faker.string.uuid(),
      secondaryEmail: faker.helpers.maybe(() => faker.internet.email(), { probability: 0.3 }),
      address: faker.helpers.maybe(() => faker.location.streetAddress(), { probability: 0.5 }),
      phone: faker.helpers.maybe(() => faker.phone.number(), { probability: 0.6 }),
      linkedin: faker.helpers.maybe(() => `https://linkedin.com/in/${faker.internet.userName()}`, { probability: 0.4 }),
      skype: faker.helpers.maybe(() => faker.internet.userName(), { probability: 0.2 }),
      twitter: faker.helpers.maybe(() => `@${faker.internet.userName()}`, { probability: 0.3 }),
      birthday: faker.helpers.maybe(() => faker.date.birthdate(), { probability: 0.4 }),
      maritalStatus: faker.helpers.maybe(() => faker.helpers.arrayElement(['single', 'married', 'divorced', 'widowed']), { probability: 0.3 }),
      family: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }),
      other: faker.helpers.maybe(() => faker.lorem.paragraph(), { probability: 0.1 }),
      visibility: {
        secondaryEmail: faker.helpers.arrayElement(['admin', 'member']),
        phone: faker.helpers.arrayElement(['admin', 'member']),
        address: 'admin',
        birthday: faker.helpers.arrayElement(['admin', 'member']),
      },
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    }
  }

  static createCustomRole(overrides: Partial<TestCustomRole> = {}): TestCustomRole {
    return {
      id: faker.string.uuid(),
      organizationId: faker.string.uuid(),
      name: faker.helpers.arrayElement(['Senior Developer', 'Lead Designer', 'Product Manager', 'DevOps Engineer', 'Data Analyst']),
      color: faker.internet.color(),
      createdAt: faker.date.past(),
      ...overrides,
    }
  }

  static createTimelineEvent(overrides: Partial<TestTimelineEvent> = {}): TestTimelineEvent {
    return {
      id: faker.string.uuid(),
      organizationMemberId: faker.string.uuid(),
      eventName: faker.helpers.arrayElement(['Promotion', 'Project Completion', 'Training Completed', 'Award Received', 'Team Lead']),
      eventDate: faker.date.past(),
      description: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.6 }),
      createdBy: faker.string.uuid(),
      createdAt: faker.date.past(),
      ...overrides,
    }
  }

  static createOrganizationMember(overrides: Partial<TestOrganizationMember> = {}): TestOrganizationMember {
    const user = this.createUser()
    const role = faker.helpers.arrayElement(['owner', 'admin', 'member', 'guest'] as const)
    const workingHours = role === 'guest' ? 0 : faker.number.int({ min: 20, max: 40 })
    
    return {
      id: faker.string.uuid(),
      organizationId: faker.string.uuid(),
      userId: user.id,
      role,
      permissionSetId: faker.helpers.maybe(() => faker.string.uuid(), { probability: 0.3 }),
      jobTitle: role === 'guest' ? undefined : faker.person.jobTitle(),
      workingHoursPerWeek: workingHours,
      joinDate: faker.date.past(),
      createdAt: faker.date.past(),
      user,
      permissionSet: faker.helpers.maybe(() => this.createPermissionSet(), { probability: 0.3 }),
      engagements: faker.helpers.multiple(() => this.createProjectEngagement(), { count: { min: 0, max: 3 } }),
      timeOffEntries: faker.helpers.multiple(() => this.createTimeOffEntry(), { count: { min: 0, max: 2 } }),
      profileData: faker.helpers.maybe(() => this.createMemberProfile(), { probability: 0.7 }),
      ...overrides,
    }
  }

  // Scenario builders
  static createTeamScenario(memberCount: number = 10): {
    organization: TestOrganization
    members: TestOrganizationMember[]
    permissionSets: TestPermissionSet[]
    projects: TestProject[]
    customRoles: TestCustomRole[]
  } {
    const organization = this.createOrganization()
    const projects = faker.helpers.multiple(() => this.createProject({ organizationId: organization.id }), { count: { min: 3, max: 6 } })
    const permissionSets = faker.helpers.multiple(() => this.createPermissionSet({ organizationId: organization.id }), { count: { min: 2, max: 4 } })
    const customRoles = faker.helpers.multiple(() => this.createCustomRole({ organizationId: organization.id }), { count: { min: 3, max: 8 } })
    
    // Ensure we have at least one owner
    const owner = this.createOrganizationMember({
      organizationId: organization.id,
      role: 'owner',
      workingHoursPerWeek: 40,
      engagements: faker.helpers.multiple(() => this.createProjectEngagement({
        projectId: faker.helpers.arrayElement(projects).id,
      }), { count: { min: 1, max: 2 } }),
    })

    // Create other members
    const otherMembers = faker.helpers.multiple(() => {
      const role = faker.helpers.arrayElement(['admin', 'member', 'guest'] as const)
      const permissionSet = role !== 'guest' ? faker.helpers.maybe(() => faker.helpers.arrayElement(permissionSets)) : undefined
      
      return this.createOrganizationMember({
        organizationId: organization.id,
        role,
        permissionSetId: permissionSet?.id,
        permissionSet,
        engagements: role !== 'guest' ? faker.helpers.multiple(() => this.createProjectEngagement({
          projectId: faker.helpers.arrayElement(projects).id,
        }), { count: { min: 0, max: 2 } }) : [],
      })
    }, { count: memberCount - 1 })

    const members = [owner, ...otherMembers]

    return {
      organization,
      members,
      permissionSets,
      projects,
      customRoles,
    }
  }

  static createOverallocatedMemberScenario(): TestOrganizationMember {
    const projects = faker.helpers.multiple(() => this.createProject(), { count: 3 })
    
    return this.createOrganizationMember({
      workingHoursPerWeek: 40,
      engagements: [
        this.createProjectEngagement({
          projectId: projects[0].id,
          hoursPerWeek: 25,
          isActive: true,
        }),
        this.createProjectEngagement({
          projectId: projects[1].id,
          hoursPerWeek: 20,
          isActive: true,
        }),
        this.createProjectEngagement({
          projectId: projects[2].id,
          hoursPerWeek: 10,
          isActive: true,
        }),
      ],
    })
  }

  static createMemberWithTimeOffScenario(): TestOrganizationMember {
    const now = new Date()
    const currentTimeOff = this.createTimeOffEntry({
      startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // Started 2 days ago
      endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // Ends in 3 days
      status: 'approved',
      type: 'vacation',
    })

    const upcomingTimeOff = this.createTimeOffEntry({
      startDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // Starts in 30 days
      endDate: new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000), // Ends in 40 days
      status: 'approved',
      type: 'vacation',
    })

    return this.createOrganizationMember({
      timeOffEntries: [currentTimeOff, upcomingTimeOff],
    })
  }

  static createComplexPermissionSetScenario(): TestPermissionSet {
    return this.createPermissionSet({
      name: 'Project Manager',
      permissions: {
        teamMembers: {
          viewAll: true,
          manageAll: false, // Can view but not manage all members
        },
        projects: {
          viewAll: true,
          manageAll: true,
          viewAssigned: true,
          manageAssigned: true,
        },
        invoicing: {
          viewAll: false,
          manageAll: false,
          viewAssigned: true,
          manageAssigned: false, // Can view assigned invoices but not manage
        },
        clients: {
          viewAll: true,
          manageAll: false,
          viewAssigned: true,
          manageAssigned: true,
        },
        worklogs: {
          manageAll: false,
        },
      },
    })
  }
}

// Test fixtures for common scenarios
export const testFixtures = {
  smallTeam: () => TeamManagementFactory.createTeamScenario(5),
  mediumTeam: () => TeamManagementFactory.createTeamScenario(15),
  largeTeam: () => TeamManagementFactory.createTeamScenario(50),
  overallocatedMember: () => TeamManagementFactory.createOverallocatedMemberScenario(),
  memberWithTimeOff: () => TeamManagementFactory.createMemberWithTimeOffScenario(),
  complexPermissionSet: () => TeamManagementFactory.createComplexPermissionSetScenario(),
}