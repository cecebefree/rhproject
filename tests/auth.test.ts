// ══════════════════════════════════════════════════════════════════════════════
// Auth RLS Validation Tests — Office Desk Admin Enrollment System
// ══════════════════════════════════════════════════════════════════════════════
//
// Test Suites:
//   1. Auth User Creation (4 tests) — trigger assigns role from email domain
//   2. JWT Claims (3 tests) — custom_access_token_hook emits correct claims
//   3. RLS: students table (9 tests) — 4 roles × SELECT/INSERT enforcement
//   4. RLS: payments table (8 tests) — 4 roles × SELECT/INSERT enforcement
//   5. RLS: audit_log table (4 tests) — admin-only access enforcement
//   6. Audit Trail (4 tests) — trigger logs user_id + operation
//
// Test Users (created in migration 002):
//   admin:   aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa  → office_desk_admin
//   school:  bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb  → school_desk_admin
//   student: cccccccc-cccc-cccc-cccc-cccccccccccc  → student (Alice)
//   parent:  dddddddd-dddd-dddd-dddd-dddddddddddd  → parent  (Bob)
//
// Framework: Vitest + @supabase/supabase-js
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ────────────────────────────────────────────────────────────────────────────
// CONFIG
// ────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!

// Test user credentials (matches 002_auth_setup.sql seed)
const TEST_USERS = {
  admin: {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'admin+admin@redhouse.local',
    password: 'TestAdmin123!',
    expectedRole: 'office_desk_admin',
  },
  school: {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'school+school@redhouse.local',
    password: 'TestSchool123!',
    expectedRole: 'school_desk_admin',
  },
  student: {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    email: 'alice+student@redhouse.local',
    password: 'TestStudent123!',
    expectedRole: 'student',
    studentId: '11111111-1111-1111-1111-111111111111',
  },
  parent: {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    email: 'bob+parent@redhouse.local',
    password: 'TestParent123!',
    expectedRole: 'parent',
    parentId: '22222222-2222-2222-2222-222222222222',
  },
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

/** Create a Supabase client authenticated as a specific test user */
async function signInAs(role: keyof typeof TEST_USERS): Promise<SupabaseClient> {
  const user = TEST_USERS[role]
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const { data, error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  })

  if (error) throw new Error(`signInAs(${role}): ${error.message}`)
  if (!data.session) throw new Error(`signInAs(${role}): no session returned`)

  return client
}

/** Query a table as a specific role and return { data, error } */
async function queryAs(
  role: keyof typeof TEST_USERS,
  table: string,
  options?: {
    select?: string
    filter?: Record<string, unknown>
    insert?: Record<string, unknown>
    limit?: number
  }
) {
  const client = await signInAs(role)
  let query = client.from(table).select(options?.select ?? '*')

  if (options?.filter) {
    for (const [key, value] of Object.entries(options.filter)) {
      query = query.eq(key, value)
    }
  }

  if (options?.insert) {
    query = client.from(table).insert(options.insert).select()
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  return query
}

/** Assert row count for a given role+table combination */
async function expectRowCount(
  role: keyof typeof TEST_USERS,
  table: string,
  expected: number,
  filter?: Record<string, unknown>
) {
  const { data, error } = await queryAs(role, table, { filter })
  if (error) throw new Error(`expectRowCount(${role}, ${table}): ${error.message}`)
  expect(data!.length).toBe(expected)
  return data
}

// ────────────────────────────────────────────────────────────────────────────
// CLEANUP TRACKING
// ────────────────────────────────────────────────────────────────────────────
const createdUserIds: string[] = []
const createdPaymentIds: string[] = []

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 1: Auth User Creation
// ══════════════════════════════════════════════════════════════════════════════
// Validates that the on_auth_user_created trigger assigns roles correctly
// based on email domain pattern matching.

describe('Auth User Creation', () => {
  let serviceClient: SupabaseClient

  beforeAll(async () => {
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  })

  afterAll(async () => {
    // Cleanup: delete test auth users (cascades to public.users)
    for (const userId of createdUserIds) {
      await serviceClient.auth.admin.deleteUser(userId)
    }
  })

  it('1.1: +admin@ email → office_desk_admin role in users table', async () => {
    // Create a new user with +admin@ email
    const testEmail = `testadmin+admin_${Date.now()}@redhouse.local`
    const { data: userData, error: createError } = await serviceClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPass123!',
      email_confirm: true,
    })
    expect(createError).toBeNull()
    createdUserIds.push(userData.user.id)

    // Wait for trigger to fire
    await new Promise(r => setTimeout(r, 500))

    // Verify role in public.users
    const { data: usersRow, error: queryError } = await serviceClient
      .from('users')
      .select('role, email')
      .eq('id', userData.user.id)
      .single()

    expect(queryError).toBeNull()
    expect(usersRow). assertNotNull()
    expect(usersRow.role).toBe('office_desk_admin')
    expect(usersRow.email).toBe(testEmail)

    console.log(`  ✓ 1.1: ${testEmail} → role=${usersRow.role}`)
  })

  it('1.2: +school@ email → school_desk_admin role in users table', async () => {
    const testEmail = `testschool+school_${Date.now()}@redhouse.local`
    const { data: userData, error: createError } = await serviceClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPass123!',
      email_confirm: true,
    })
    expect(createError).toBeNull()
    createdUserIds.push(userData.user.id)

    await new Promise(r => setTimeout(r, 500))

    const { data: usersRow, error: queryError } = await serviceClient
      .from('users')
      .select('role, email')
      .eq('id', userData.user.id)
      .single()

    expect(queryError).toBeNull()
    expect(usersRow.role).toBe('school_desk_admin')
    expect(usersRow.email).toBe(testEmail)

    console.log(`  ✓ 1.2: ${testEmail} → role=${usersRow.role}`)
  })

  it('1.3: +student@ email → student role in users table', async () => {
    const testEmail = `teststudent+student_${Date.now()}@redhouse.local`
    const { data: userData, error: createError } = await serviceClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPass123!',
      email_confirm: true,
    })
    expect(createError).toBeNull()
    createdUserIds.push(userData.user.id)

    await new Promise(r => setTimeout(r, 500))

    const { data: usersRow, error: queryError } = await serviceClient
      .from('users')
      .select('role, email')
      .eq('id', userData.user.id)
      .single()

    expect(queryError).toBeNull()
    expect(usersRow.role).toBe('student')
    expect(usersRow.email).toBe(testEmail)

    console.log(`  ✓ 1.3: ${testEmail} → role=${usersRow.role}`)
  })

  it('1.4: +parent@ email → parent role in users table', async () => {
    const testEmail = `testparent+parent_${Date.now()}@redhouse.local`
    const { data: userData, error: createError } = await serviceClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPass123!',
      email_confirm: true,
    })
    expect(createError).toBeNull()
    createdUserIds.push(userData.user.id)

    await new Promise(r => setTimeout(r, 500))

    const { data: usersRow, error: queryError } = await serviceClient
      .from('users')
      .select('role, email')
      .eq('id', userData.user.id)
      .single()

    expect(queryError).toBeNull()
    expect(usersRow.role).toBe('parent')
    expect(usersRow.email).toBe(testEmail)

    console.log(`  ✓ 1.4: ${testEmail} → role=${usersRow.role}`)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 2: JWT Claims
// ══════════════════════════════════════════════════════════════════════════════
// Validates that custom_access_token_hook embeds role, student_id, parent_id
// into app_metadata claims on the JWT.

describe('JWT Claims', () => {
  it('2.1: office_desk_admin JWT contains role = office_desk_admin', async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await client.auth.signInWithPassword({
      email: TEST_USERS.admin.email,
      password: TEST_USERS.admin.password,
    })
    expect(error).toBeNull()

    const jwt = data.session.access_token
    const payload = JSON.parse(atob(jwt.split('.')[1]))

    expect(payload.app_metadata.role).toBe('office_desk_admin')
    expect(payload.app_metadata.tenant_id).toBeTruthy()

    console.log(`  ✓ 2.1: JWT role=${payload.app_metadata.role}, tenant_id=${payload.app_metadata.tenant_id}`)
  })

  it('2.2: student JWT contains role = student + student_id', async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await client.auth.signInWithPassword({
      email: TEST_USERS.student.email,
      password: TEST_USERS.student.password,
    })
    expect(error).toBeNull()

    const jwt = data.session.access_token
    const payload = JSON.parse(atob(jwt.split('.')[1]))

    expect(payload.app_metadata.role).toBe('student')
    expect(payload.app_metadata.student_id).toBe(TEST_USERS.student.studentId)

    console.log(`  ✓ 2.2: JWT role=${payload.app_metadata.role}, student_id=${payload.app_metadata.student_id}`)
  })

  it('2.3: parent JWT contains role = parent + parent_id', async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await client.auth.signInWithPassword({
      email: TEST_USERS.parent.email,
      password: TEST_USERS.parent.password,
    })
    expect(error).toBeNull()

    const jwt = data.session.access_token
    const payload = JSON.parse(atob(jwt.split('.')[1]))

    expect(payload.app_metadata.role).toBe('parent')
    expect(payload.app_metadata.parent_id).toBe(TEST_USERS.parent.parentId)

    console.log(`  ✓ 2.3: JWT role=${payload.app_metadata.role}, parent_id=${payload.app_metadata.parent_id}`)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 3: RLS Policy Enforcement — students table
// ══════════════════════════════════════════════════════════════════════════════
// Validates that 4 roles can/cannot SELECT/INSERT on public.students.

describe('RLS: students table', () => {
  let serviceClient: SupabaseClient
  const testStudentId = '11111111-1111-1111-1111-111111111111'
  let otherStudentId: string

  beforeAll(async () => {
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Create a second student for cross-user access tests
    const { data: otherStudent } = await serviceClient
      .from('students')
      .insert({
        first_name: 'Charlie',
        last_name: 'Other',
        grade: '11',
        academic_group_id: '00000000-0000-0000-0000-000000000001',
        enrollment_status: 'active',
      })
      .select()
      .single()
    otherStudentId = otherStudent.id
  })

  afterAll(async () => {
    // Cleanup second student
    if (otherStudentId) {
      await serviceClient.from('students').delete().eq('id', otherStudentId)
    }
  })

  it('3.1: office_desk_admin can SELECT all students', async () => {
    const { data, error } = await queryAs('admin', 'students')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(2) // Alice + Charlie + possibly others

    console.log(`  ✓ 3.1: office_desk_admin SELECT students → ${data!.length} rows`)
  })

  it('3.2: school_desk_admin can SELECT all students', async () => {
    const { data, error } = await queryAs('school', 'students')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(2)

    console.log(`  ✓ 3.2: school_desk_admin SELECT students → ${data!.length} rows`)
  })

  it('3.3: student (Alice) can SELECT only own row', async () => {
    const { data, error } = await queryAs('student', 'students')
    expect(error).toBeNull()
    // RLS should filter to only Alice's row(s)
    expect(data!.length).toBeGreaterThanOrEqual(1)

    // All returned rows should be Alice
    for (const row of data!) {
      expect(row.id).toBe(testStudentId)
    }

    console.log(`  ✓ 3.3: student SELECT students → ${data!.length} rows (all own)`)
  })

  it('3.4: student (Alice) CANNOT SELECT other students', async () => {
    const { data, error } = await queryAs('student', 'students')
    expect(error).toBeNull()

    // Should NOT contain Charlie
    const otherStudentRows = data!.filter((r: any) => r.id === otherStudentId)
    expect(otherStudentRows.length).toBe(0)

    console.log(`  ✓ 3.4: student SELECT students → 0 other students (correctly blocked)`)
  })

  it('3.5: parent (Bob) can SELECT own child (Alice)', async () => {
    const { data, error } = await queryAs('parent', 'students')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(1)

    // Should include Alice
    const aliceRow = data!.find((r: any) => r.id === testStudentId)
    expect(aliceRow).toBeTruthy()

    console.log(`  ✓ 3.5: parent SELECT students → ${data!.length} rows (includes Alice)`)
  })

  it('3.6: parent (Bob) CANNOT SELECT unrelated students', async () => {
    const { data, error } = await queryAs('parent', 'students')
    expect(error).toBeNull()

    // Should NOT contain Charlie (unrelated student)
    const otherStudentRows = data!.filter((r: any) => r.id === otherStudentId)
    expect(otherStudentRows.length).toBe(0)

    console.log(`  ✓ 3.6: parent SELECT students → 0 unrelated students (correctly blocked)`)
  })

  it('3.7: office_desk_admin can INSERT student', async () => {
    const { data, error } = await queryAs('admin', 'students', {
      insert: {
        first_name: 'TestInsert',
        last_name: 'AdminStudent',
        grade: '9',
        academic_group_id: '00000000-0000-0000-0000-000000000001',
        enrollment_status: 'pending',
      },
    })
    expect(error).toBeNull()
    expect(data!.length).toBe(1)

    // Cleanup
    await serviceClient.from('students').delete().eq('id', data![0].id)

    console.log(`  ✓ 3.7: office_desk_admin INSERT student → success`)
  })

  it('3.8: school_desk_admin CANNOT INSERT student (read-only)', async () => {
    const { data, error } = await queryAs('school', 'students', {
      insert: {
        first_name: 'TestInsert',
        last_name: 'SchoolStudent',
        grade: '9',
        academic_group_id: '00000000-0000-0000-0000-000000000001',
        enrollment_status: 'pending',
      },
    })
    // RLS should block the insert — error expected
    expect(error).toBeTruthy()

    console.log(`  ✓ 3.8: school_desk_admin INSERT student → blocked (error: ${error!.message.substring(0, 50)}...)`)
  })

  it('3.9: student CANNOT INSERT student (no permission)', async () => {
    const { data, error } = await queryAs('student', 'students', {
      insert: {
        first_name: 'TestInsert',
        last_name: 'SelfStudent',
        grade: '10',
        academic_group_id: '00000000-0000-0000-0000-000000000001',
        enrollment_status: 'pending',
      },
    })
    expect(error).toBeTruthy()

    console.log(`  ✓ 3.9: student INSERT student → blocked (error: ${error!.message.substring(0, 50)}...)`)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 4: RLS Policy Enforcement — payments table
// ══════════════════════════════════════════════════════════════════════════════
// Validates that 4 roles can/cannot SELECT/INSERT on public.payments.

describe('RLS: payments table', () => {
  let serviceClient: SupabaseClient
  const testStudentId = '11111111-1111-1111-1111-111111111111'
  let testPaymentId: string
  let otherPaymentId: string
  let otherStudentId: string

  beforeAll(async () => {
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Create a second student for cross-user tests
    const { data: otherStudent } = await serviceClient
      .from('students')
      .insert({
        first_name: 'Charlie',
        last_name: 'Other',
        grade: '11',
        academic_group_id: '00000000-0000-0000-0000-000000000001',
        enrollment_status: 'active',
      })
      .select()
      .single()
    otherStudentId = otherStudent.id

    // Create test payment for Alice
    const { data: payment } = await serviceClient
      .from('payments')
      .insert({
        student_id: testStudentId,
        amount: 1500.00,
        status: 'pending',
        payment_type: 'tuition',
      })
      .select()
      .single()
    testPaymentId = payment.id

    // Create test payment for Charlie (unrelated)
    const { data: otherPayment } = await serviceClient
      .from('payments')
      .insert({
        student_id: otherStudentId,
        amount: 2000.00,
        status: 'completed',
        payment_type: 'deposit',
      })
      .select()
      .single()
    otherPaymentId = otherPayment.id
  })

  afterAll(async () => {
    // Cleanup
    if (testPaymentId) await serviceClient.from('payments').delete().eq('id', testPaymentId)
    if (otherPaymentId) await serviceClient.from('payments').delete().eq('id', otherPaymentId)
    if (otherStudentId) await serviceClient.from('students').delete().eq('id', otherStudentId)
  })

  it('4.1: office_desk_admin can SELECT all payments', async () => {
    const { data, error } = await queryAs('admin', 'payments')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(2)

    console.log(`  ✓ 4.1: office_desk_admin SELECT payments → ${data!.length} rows`)
  })

  it('4.2: school_desk_admin can SELECT all payments', async () => {
    const { data, error } = await queryAs('school', 'payments')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(2)

    console.log(`  ✓ 4.2: school_desk_admin SELECT payments → ${data!.length} rows`)
  })

  it('4.3: student (Alice) can SELECT only own payments', async () => {
    const { data, error } = await queryAs('student', 'payments')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(1)

    for (const row of data!) {
      expect(row.student_id).toBe(testStudentId)
    }

    console.log(`  ✓ 4.3: student SELECT payments → ${data!.length} rows (all own)`)
  })

  it('4.4: student (Alice) CANNOT SELECT other students payments', async () => {
    const { data, error } = await queryAs('student', 'payments')
    expect(error).toBeNull()

    const otherPayments = data!.filter((r: any) => r.student_id === otherStudentId)
    expect(otherPayments.length).toBe(0)

    console.log(`  ✓ 4.4: student SELECT payments → 0 other students payments (blocked)`)
  })

  it('4.5: parent (Bob) can SELECT own child payments', async () => {
    const { data, error } = await queryAs('parent', 'payments')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(1)

    const alicePayments = data!.filter((r: any) => r.student_id === testStudentId)
    expect(alicePayments.length).toBeGreaterThanOrEqual(1)

    console.log(`  ✓ 4.5: parent SELECT payments → ${data!.length} rows (includes Alice)`)
  })

  it('4.6: parent (Bob) CANNOT SELECT unrelated payments', async () => {
    const { data, error } = await queryAs('parent', 'payments')
    expect(error).toBeNull()

    const otherPayments = data!.filter((r: any) => r.student_id === otherStudentId)
    expect(otherPayments.length).toBe(0)

    console.log(`  ✓ 4.6: parent SELECT payments → 0 unrelated payments (blocked)`)
  })

  it('4.7: office_desk_admin can INSERT payment', async () => {
    const { data, error } = await queryAs('admin', 'payments', {
      insert: {
        student_id: testStudentId,
        amount: 500.00,
        status: 'pending',
        payment_type: 'fee',
      },
    })
    expect(error).toBeNull()
    expect(data!.length).toBe(1)

    // Cleanup
    await serviceClient.from('payments').delete().eq('id', data![0].id)

    console.log(`  ✓ 4.7: office_desk_admin INSERT payment → success`)
  })

  it('4.8: school_desk_admin CANNOT INSERT payment', async () => {
    const { data, error } = await queryAs('school', 'payments', {
      insert: {
        student_id: testStudentId,
        amount: 500.00,
        status: 'pending',
        payment_type: 'fee',
      },
    })
    expect(error).toBeTruthy()

    console.log(`  ✓ 4.8: school_desk_admin INSERT payment → blocked`)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 5: RLS Policy Enforcement — audit_log table
// ══════════════════════════════════════════════════════════════════════════════
// Validates that only admin roles can read audit_log; students/parents blocked.

describe('RLS: audit_log table', () => {
  it('5.1: office_desk_admin can SELECT all audit_log rows', async () => {
    const { data, error } = await queryAs('admin', 'audit_log')
    expect(error).toBeNull()
    // audit_log may have rows from 001 triggers or may be empty
    expect(Array.isArray(data)).toBe(true)

    console.log(`  ✓ 5.1: office_desk_admin SELECT audit_log → ${data!.length} rows`)
  })

  it('5.2: school_desk_admin can SELECT all audit_log rows', async () => {
    const { data, error } = await queryAs('school', 'audit_log')
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)

    console.log(`  ✓ 5.2: school_desk_admin SELECT audit_log → ${data!.length} rows`)
  })

  it('5.3: student CANNOT SELECT audit_log', async () => {
    const { data, error } = await queryAs('student', 'audit_log')
    // RLS should block — either error or empty result
    if (error) {
      console.log(`  ✓ 5.3: student SELECT audit_log → blocked (error)`)
    } else {
      expect(data!.length).toBe(0)
      console.log(`  ✓ 5.3: student SELECT audit_log → 0 rows (RLS filtered)`)
    }
  })

  it('5.4: parent CANNOT SELECT audit_log', async () => {
    const { data, error } = await queryAs('parent', 'audit_log')
    if (error) {
      console.log(`  ✓ 5.4: parent SELECT audit_log → blocked (error)`)
    } else {
      expect(data!.length).toBe(0)
      console.log(`  ✓ 5.4: parent SELECT audit_log → 0 rows (RLS filtered)`)
    }
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 6: Audit Trail Verification
// ══════════════════════════════════════════════════════════════════════════════
// Validates that INSERT/UPDATE on payments triggers audit_log entries
// with correct user_id, operation, old_values, new_values.

describe('Audit Trail Verification', () => {
  let serviceClient: SupabaseClient
  const testStudentId = '11111111-1111-1111-1111-111111111111'
  let paymentId: string

  beforeAll(async () => {
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  })

  afterAll(async () => {
    if (paymentId) {
      await serviceClient.from('payments').delete().eq('id', paymentId)
    }
  })

  it('6.1: INSERT payment → audit_log row with operation=INSERT', async () => {
    // Record audit_log count before
    const { count: beforeCount } = await serviceClient
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('table_name', 'payments')

    // Insert a payment as admin
    const { data: payment, error: insertError } = await serviceClient
      .from('payments')
      .insert({
        student_id: testStudentId,
        amount: 999.99,
        status: 'pending',
        payment_type: 'tuition',
      })
      .select()
      .single()

    expect(insertError).toBeNull()
    paymentId = payment.id

    // Wait for trigger
    await new Promise(r => setTimeout(r, 500))

    // Check audit_log for INSERT entry
    const { data: auditRows, error: auditError } = await serviceClient
      .from('audit_log')
      .select('*')
      .eq('table_name', 'payments')
      .eq('operation', 'INSERT')
      .eq('new_values->>'->'id', paymentId)
      .order('created_at', { ascending: false })
      .limit(1)

    expect(auditError).toBeNull()
    expect(auditRows!.length).toBe(1)

    const auditRow = auditRows![0]
    expect(auditRow.operation).toBe('INSERT')
    expect(auditRow.new_values).toBeTruthy()
    expect(auditRow.old_values).toBeNull() // INSERT has no old_values
    expect(auditRow.user_id).toBeTruthy()

    console.log(`  ✓ 6.1: INSERT payment → audit_log id=${auditRow.id}, user_id=${auditRow.user_id}`)
  })

  it('6.2: UPDATE payment status → audit_log row with operation=UPDATE + old/new values', async () => {
    // Update the payment status
    const { error: updateError } = await serviceClient
      .from('payments')
      .update({ status: 'completed' })
      .eq('id', paymentId)

    expect(updateError).toBeNull()

    await new Promise(r => setTimeout(r, 500))

    // Check audit_log for UPDATE entry
    const { data: auditRows, error: auditError } = await serviceClient
      .from('audit_log')
      .select('*')
      .eq('table_name', 'payments')
      .eq('operation', 'UPDATE')
      .order('created_at', { ascending: false })
      .limit(1)

    expect(auditError).toBeNull()
    expect(auditRows!.length).toBe(1)

    const auditRow = auditRows![0]
    expect(auditRow.operation).toBe('UPDATE')
    expect(auditRow.old_values).toBeTruthy()
    expect(auditRow.new_values).toBeTruthy()
    expect(auditRow.old_values.status).toBe('pending')
    expect(auditRow.new_values.status).toBe('completed')
    expect(auditRow.user_id).toBeTruthy()

    console.log(`  ✓ 6.2: UPDATE payment → audit_log old=${auditRow.old_values.status}, new=${auditRow.new_values.status}`)
  })

  it('6.3: office_desk_admin can view audit trail', async () => {
    const { data, error } = await queryAs('admin', 'audit_log', {
      filter: { table_name: 'payments' },
      limit: 5,
    })
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(1)

    console.log(`  ✓ 6.3: office_desk_admin SELECT audit_log(payments) → ${data!.length} rows`)
  })

  it('6.4: audit_log entries include user_id, timestamp, operation', async () => {
    const { data, error } = await serviceClient
      .from('audit_log')
      .select('*')
      .eq('table_name', 'payments')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    expect(error).toBeNull()
    expect(data.user_id).toBeTruthy()
    expect(data.created_at).toBeTruthy()
    expect(data.operation).toMatch(/^(INSERT|UPDATE|DELETE)$/)
    expect(data.table_name).toBe('payments')

    console.log(`  ✓ 6.4: audit_log entry has user_id=${data.user_id}, op=${data.operation}, ts=${data.created_at}`)
  })
})
