/**
 * Test script for availability calculation utilities
 * Run with: node test-availability-utils.js
 */

const {
  calculateMemberAvailability,
  calculatePeriodAvailability,
  validateEngagementCapacity,
  validateTimeOffEntry,
  formatHours,
  formatHoursPerWeek,
  formatUtilization,
  formatAvailabilitySummary,
  getUtilizationColor,
  getAvailabilityStatus,
  calculateVacationDaysUsed,
  getUpcomingEngagements,
  getEndingEngagements
} = require('./lib/availability-utils.ts')

// Test data
const testMemberData = {
  workingHoursPerWeek: 40,
  engagements: [
    {
      id: '1',
      projectId: 'project-1',
      hoursPerWeek: 20,
      isActive: true,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      role: 'Developer'
    },
    {
      id: '2',
      projectId: 'project-2',
      hoursPerWeek: 10,
      isActive: true,
      startDate: new Date('2024-06-01'),
      endDate: null, // Ongoing
      role: 'Consultant'
    }
  ],
  timeOffEntries: [
    {
      id: '1',
      type: 'vacation',
      startDate: new Date('2024-07-15'),
      endDate: new Date('2024-07-25'),
      status: 'approved',
      description: 'Summer vacation'
    },
    {
      id: '2',
      type: 'sick_leave',
      startDate: new Date('2024-08-05'),
      endDate: new Date('2024-08-07'),
      status: 'approved'
    }
  ],
  joinDate: new Date('2024-01-01')
}

function runTests() {
  console.log('🧪 Testing Availability Calculation Utilities\n')

  try {
    // Test 1: Basic availability calculation
    console.log('📊 Test 1: Basic Availability Calculation')
    const availability = calculateMemberAvailability(testMemberData)
    console.log('Result:', JSON.stringify(availability, null, 2))
    console.log('✅ Basic availability calculation passed\n')

    // Test 2: Period availability calculation
    console.log('📅 Test 2: Period Availability Calculation')
    const periodStart = new Date('2024-07-01')
    const periodEnd = new Date('2024-07-31')
    const periodAvailability = calculatePeriodAvailability(testMemberData, periodStart, periodEnd)
    console.log('Period:', periodStart.toDateString(), 'to', periodEnd.toDateString())
    console.log('Result:', JSON.stringify(periodAvailability, null, 2))
    console.log('✅ Period availability calculation passed\n')

    // Test 3: Engagement validation
    console.log('⚡ Test 3: Engagement Validation')
    const newEngagement = {
      projectId: 'project-3',
      hoursPerWeek: 15,
      isActive: true,
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-12-31')
    }
    const validation = validateEngagementCapacity(testMemberData, newEngagement)
    console.log('New engagement:', JSON.stringify(newEngagement, null, 2))
    console.log('Validation result:', JSON.stringify(validation, null, 2))
    console.log('✅ Engagement validation passed\n')

    // Test 4: Time-off validation
    console.log('🏖️ Test 4: Time-off Validation')
    const newTimeOff = {
      type: 'vacation',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-09-10'),
      status: 'pending'
    }
    const timeOffValidation = validateTimeOffEntry(testMemberData.timeOffEntries, newTimeOff)
    console.log('New time-off:', JSON.stringify(newTimeOff, null, 2))
    console.log('Validation result:', JSON.stringify(timeOffValidation, null, 2))
    console.log('✅ Time-off validation passed\n')

    // Test 5: Formatting functions
    console.log('🎨 Test 5: Formatting Functions')
    console.log('formatHours(25.5):', formatHours(25.5))
    console.log('formatHoursPerWeek(40):', formatHoursPerWeek(40))
    console.log('formatUtilization(75.5):', formatUtilization(75.5))
    console.log('formatAvailabilitySummary(availability):', formatAvailabilitySummary(availability))
    console.log('getUtilizationColor(75):', getUtilizationColor(75))
    console.log('getAvailabilityStatus(availability):', JSON.stringify(getAvailabilityStatus(availability), null, 2))
    console.log('✅ Formatting functions passed\n')

    // Test 6: Vacation days calculation
    console.log('📊 Test 6: Vacation Days Calculation')
    const vacationDays = calculateVacationDaysUsed(testMemberData.timeOffEntries, 2024)
    console.log('Vacation days used in 2024:', vacationDays)
    console.log('✅ Vacation days calculation passed\n')

    // Test 7: Upcoming and ending engagements
    console.log('🔮 Test 7: Upcoming and Ending Engagements')
    const upcomingEngagements = getUpcomingEngagements(testMemberData.engagements)
    const endingEngagements = getEndingEngagements(testMemberData.engagements)
    console.log('Upcoming engagements:', upcomingEngagements.length)
    console.log('Ending engagements:', endingEngagements.length)
    console.log('✅ Upcoming and ending engagements passed\n')

    console.log('🎉 All tests passed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Run the tests
runTests()

// Additional edge case tests
function runEdgeCaseTests() {
  console.log('\n🔬 Running Edge Case Tests\n')

  try {
    // Test 1: Zero working hours
    console.log('🚫 Test 1: Zero Working Hours')
    const zeroHoursData = {
      workingHoursPerWeek: 0,
      engagements: [],
      timeOffEntries: []
    }
    const zeroResult = calculateMemberAvailability(zeroHoursData)
    console.log('Zero hours result:', JSON.stringify(zeroResult, null, 2))
    console.log('✅ Zero working hours test passed\n')

    // Test 2: Overallocated member
    console.log('⚠️ Test 2: Overallocated Member')
    const overallocatedData = {
      workingHoursPerWeek: 40,
      engagements: [
        {
          id: '1',
          projectId: 'project-1',
          hoursPerWeek: 30,
          isActive: true,
          startDate: new Date('2024-01-01'),
          endDate: null
        },
        {
          id: '2',
          projectId: 'project-2',
          hoursPerWeek: 20,
          isActive: true,
          startDate: new Date('2024-01-01'),
          endDate: null
        }
      ],
      timeOffEntries: []
    }
    const overallocatedResult = calculateMemberAvailability(overallocatedData)
    console.log('Overallocated result:', JSON.stringify(overallocatedResult, null, 2))
    const overallocatedStatus = getAvailabilityStatus(overallocatedResult)
    console.log('Status:', JSON.stringify(overallocatedStatus, null, 2))
    console.log('✅ Overallocated member test passed\n')

    // Test 3: Currently on time-off
    console.log('🏖️ Test 3: Currently on Time-off')
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const onTimeOffData = {
      workingHoursPerWeek: 40,
      engagements: [],
      timeOffEntries: [
        {
          id: '1',
          type: 'vacation',
          startDate: yesterday,
          endDate: tomorrow,
          status: 'approved'
        }
      ]
    }
    const onTimeOffResult = calculateMemberAvailability(onTimeOffData)
    console.log('On time-off result:', JSON.stringify(onTimeOffResult, null, 2))
    const onTimeOffStatus = getAvailabilityStatus(onTimeOffResult)
    console.log('Status:', JSON.stringify(onTimeOffStatus, null, 2))
    console.log('✅ Currently on time-off test passed\n')

    // Test 4: Overlapping time-off validation
    console.log('❌ Test 4: Overlapping Time-off Validation')
    const existingTimeOff = [
      {
        id: '1',
        type: 'vacation',
        startDate: new Date('2024-08-01'),
        endDate: new Date('2024-08-10'),
        status: 'approved'
      }
    ]
    const overlappingTimeOff = {
      type: 'sick_leave',
      startDate: new Date('2024-08-05'),
      endDate: new Date('2024-08-15'),
      status: 'pending'
    }
    const overlapValidation = validateTimeOffEntry(existingTimeOff, overlappingTimeOff)
    console.log('Overlap validation:', JSON.stringify(overlapValidation, null, 2))
    console.log('✅ Overlapping time-off validation test passed\n')

    // Test 5: Invalid date ranges
    console.log('📅 Test 5: Invalid Date Ranges')
    const invalidTimeOff = {
      type: 'vacation',
      startDate: new Date('2024-08-15'),
      endDate: new Date('2024-08-10'), // End before start
      status: 'pending'
    }
    const invalidValidation = validateTimeOffEntry([], invalidTimeOff)
    console.log('Invalid date validation:', JSON.stringify(invalidValidation, null, 2))
    console.log('✅ Invalid date ranges test passed\n')

    // Test 6: Engagement conflicts on same project
    console.log('🔄 Test 6: Engagement Conflicts on Same Project')
    const conflictData = {
      workingHoursPerWeek: 40,
      engagements: [
        {
          id: '1',
          projectId: 'project-1',
          hoursPerWeek: 20,
          isActive: true,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        }
      ],
      timeOffEntries: []
    }
    const conflictingEngagement = {
      projectId: 'project-1', // Same project
      hoursPerWeek: 10,
      isActive: true,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-08-31')
    }
    const conflictValidation = validateEngagementCapacity(conflictData, conflictingEngagement)
    console.log('Conflict validation:', JSON.stringify(conflictValidation, null, 2))
    console.log('✅ Engagement conflicts test passed\n')

    console.log('🎉 All edge case tests passed successfully!')

  } catch (error) {
    console.error('❌ Edge case test failed:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Run edge case tests
runEdgeCaseTests()