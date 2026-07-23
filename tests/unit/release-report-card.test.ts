import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { UUID } from 'crypto'

// Test requirements as per row 28b specification:
// - OPTIONS → 200; GET → 405; no auth → 401; wrong role → 403;
//   tenant mismatch → 403; missing/invalid report_card_id → 400;
//   non-existent card → 404; valid draft→released → 200;
//   valid released→visible → 200; skip attempt draft→visible → 409;
//   reverse attempt → 409; repeat call on same state → 409.

describe('release-report-card EF', () => {
  let supabase: any
  let testStudentId: string
  let testInstructorId: string
  let testAdminId: string
  let testTenantId: string
  let testCourseId: string
  let testReportCardId: string

  beforeAll(async () => {
    supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Create test tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({ name: 'Test Tenant', slug: 'test-tenant', status: 'active' })
      .select()
      .single()

    if (tenantError) throw tenantError
    testTenantId = tenant.id

    // Create test users with different roles
    const students = await supabase
      .from('profiles')
      .insert([
        { id: crypto.randomUUID(), role: 'student', tenant_id: testTenantId, email: 'student@test.com' },
        { id: crypto.randomUUID(), role: 'instructor', tenant_id: testTenantId, email: 'instructor@test.com' },
        { id: crypto.randomUUID(), role: 'admin', tenant_id: testTenantId, email: 'admin@test.com' },
      ])
      .select()

    if (students.error) throw students.error

    testStudentId = students.data[0].id
    testInstructorId = students.data[1].id
    testAdminId = students.data[2].id

    // Create test course for enrollment
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        id: crypto.randomUUID(),
        title: 'Test Course',
        description: 'Test Course Description',
        tenant_id: testTenantId,
        created_by: testInstructorId,
        status: 'published',
      })
      .select()
      .single()

    if (courseError) throw courseError
    testCourseId = course.id

    // Create student_class enrollment
    await supabase
      .from('student_class')
      .insert({
        student_id: testStudentId,
        class_id: testCourseId,
        tenant_id: testTenantId,
      })

    // Create a draft report card for the student
    const { data: reportCard, error: cardError } = await supabase
      .from('report_cards')
      .insert({
        id: crypto.randomUUID(),
        student_id: testStudentId,
        term: 'Fall 2026',
        subject: 'Math',
        grade: null,
        status: 'draft',
        created_by: testInstructorId,
        tenant_id: testTenantId,
      })\n      .select()
      .single()

    if (cardError) throw cardError
    testReportCardId = reportCard.id
  })

  afterAll(async () => {
    // Cleanup - delete in reverse order of creation
    await supabase.from('report_cards').delete().eq('id', testReportCardId)
    await supabase.from('student_class').delete().eq('student_id', testStudentId)
    await supabase.from('courses').delete().eq('id', testCourseId)
    await supabase.from('profiles').delete().in('id', [testStudentId, testInstructorId, testAdminId])
    await supabase.from('tenants').delete().eq('id', testTenantId)
  })

  describe('OPTIONS and GET requests', () => {
    it('OPTIONS should return 200', async () => {
      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/release-report-card`, {
        method: 'OPTIONS',
      })

      expect(response.status).toBe(200)
    })

    it('GET should return 405', async () => {
      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/release-report-card`, {
        method: 'GET',
      })

      expect(response.status).toBe(405)
    })
  })

  describe('Authentication and Authorization', () => {
    it('No auth should return 401', async () => {
      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/release-report-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_card_id: testReportCardId,
          target_status: 'released',
        }),
      })

      expect(response.status).toBe(401)
    })

    it('Wrong role (student) should return 403', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'student@test.com',
        password: 'password',
      })

      if (!session) throw new Error('Failed to create student session')

      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/release-report-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // student doesn't have auth
        },
        body: JSON.stringify({
          report_card_id: testReportCardId,
          target_status: 'released',
        }),
      })

      expect(response.status).toBe(403)
    })
  })

  describe('Input Validation', () => {
    it('Missing report_card_id should return 400', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'instructor@test.com',
        password: 'password',
      })

      if (!session) throw new Error('Failed to create session')

      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/release-report-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // instructor has some auth
        },
        body: JSON.stringify({
          target_status: 'released',
        }),
      })

      expect(response.status).toBe(400)
    })

    it('Invalid UUID report_card_id should return 400', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'instructor@test.com',
        password: 'password',
      })

      if (!session) throw new Error('Failed to create session')

      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/release-report-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // instructor has some auth
        },
        body: JSON.stringify({
          report_card_id: 'invalid-uuid',
          target_status: 'released',
        }),
      })

      expect(response.status).toBe(400)
    })

    it('Invalid target_status should return 400', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'instructor@test.com',
        password: 'password',
      })

      if (!session) throw new Error('Failed to create session')

      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/release-report-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // instructor has some auth
        },
        body: JSON.stringify({
          report_card_id: testReportCardId,
          target_status: 'invalid-status',
        }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Report Card Not Found', () => {
    it('Non-existent report_card_id should return 404', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'instructor@test.com',
        password: 'password',
      })

      if (!session) throw new Error('Failed to create session')

      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/release-report-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // instructor has some auth
        },
        body: JSON.stringify({
          report_card_id: crypto.randomUUID(),
          target_status: 'released',
        }),
      })

      expect(response.status).toBe(404)
    })
  })

  describe('Valid Transitions', () => {
    it('Valid draft→released should return 200 (Office role)', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin@test.com',
        password: 'password',
      })

      if (!session) throw new Error('Failed to create session')

      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/release-report-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // admin has auth
        },
        body: JSON.stringify({
          report_card_id: testReportCardId,
          target_status: 'released',
        }),
      })

      expect(response.status).toBe(200)

      const responseBody = await response.json()
      expect(responseBody.success).toBe(true)
      expect(responseBody.new_status).toBe('released')
    })

    it('Valid released→visible should return 200 (Admin role only)', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin@test.com',
        password: 'password',
      })

      if (!session) throw new Error('Failed to create session')

      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/release-report-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // admin has auth
        },
        body: JSON.stringify({
          report_card_id: testReportCardId,
          target_status: 'visible',
        }),
      })

      expect(response.status).toBe(200)

      const responseBody = await response.json()
      expect(responseBody.success).toBe(true)
      expect(responseBody.new_status).toBe('visible')
    })
  })

  describe('Invalid Transitions', () => {
    it('Skip attempt draft→visible should return 409', async () => {
      // Need a new fresh draft report card for this test
      const { data: newDraftCard, error: draftError } = await supabase
        .from('report_cards')
        .insert({
          id: crypto.randomUUID(),
          student_id: testStudentId,
          term: 'Fall 2026',
          subject: 'Science',
          grade: null,
          status: 'draft',
          created_by: testInstructorId,
          tenant_id: testTenantId,
        })
        .select()
        .single()

      if (draftError) throw draftError

      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin@test.com',
        password: 'password',
      })

      if (!session) throw new Error('Failed to create session')

      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/release-report-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // admin has auth
        },
        body: JSON.stringify({
          report_card_id: newDraftCard.id,
          target_status: 'visible',
        }),
      })

      expect(response.status).toBe(409)
    })

    it('Reverse attempt should return 409', async () => {
      // Release a card first
      const { data: releasedCard, error: releaseError } = await supabase
        .from('report_cards')
        .update({ status: 'released' })
        .eq('id', testReportCardId)
        .select()
        .single()

      if (releaseError) throw releaseError

      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin@test.com',
        password: 'password',
      })

      if (!session) throw new Error('Failed to create session')

      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/release-report-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // admin has auth
        },
        body: JSON.stringify({
          report_card_id: testReportCardId,
          target_status: 'draft',
        }),
      })

      expect(response.status).toBe(409)
    })

    it('Repeat call on same state should return 409', async () => {
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'admin@test.com',
        password: 'password',
      })

      if (!session) throw new Error('Failed to create session')

      // First transition to released
      let response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/release-report-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // admin has auth
        },
        body: JSON.stringify({
          report_card_id: testReportCardId,
          target_status: 'released',
        }),
      })

      expect(response.status).toBe(200)

      // Try to release again (same state)
      response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/release-report-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // admin has auth
        },
        body: JSON.stringify({
          report_card_id: testReportCardId,
          target_status: 'released',
        }),
      })

      expect(response.status).toBe(409)
    })
  })
}