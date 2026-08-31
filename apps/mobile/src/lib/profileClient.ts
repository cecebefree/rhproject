// src/lib/profileClient.ts
// Fetch profile data for 3 user types: Student, Adult, Teacher
// Tables: public.profiles, office_desk.students, office_desk.family_accounts,
//         office_desk.invoices, office_desk.payments, office_desk.users

import { supabase } from '../services/supabase';
import type {
  AdultProfile,
  ChildRecord,
  EnrolledClass,
  FamilyAccountDetail,
  InvoiceRecord,
  PaymentRecord,
  RegistrationRecord,
  StudentProfile,
  TeacherProfile,
  UserRole,
} from '../types/profile';

// ═══════════════════════════════════════════════════════════
// CURRENT USER
// ═══════════════════════════════════════════════════════════

export async function getCurrentUser(): Promise<{
  userId: string | null;
  role: string | null;
  error: string | null;
}> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { userId: null, role: null, error: 'Not authenticated' };
  }

  // Try profiles first
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile) {
    return { userId: user.id, role: profile.role, error: null };
  }

  // Fallback: users table (auth trigger writes here)
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return { userId: user.id, role: userRow?.role ?? null, error: null };
}

// ═══════════════════════════════════════════════════════════
// STUDENT PROFILE
// ═══════════════════════════════════════════════════════════

export async function fetchStudentProfile(): Promise<{
  data: StudentProfile | null;
  error: string | null;
}> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { data: null, error: 'Not authenticated' };
  }

  // 1. Fetch profile
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('id, name, role, created_at, curriculum, grade, stage, intake')
    .eq('id', user.id)
    .single();

  if (profErr || !profile) {
    return { data: null, error: profErr?.message ?? 'Profile not found' };
  }

  // 2. Fetch office_desk.students record (curriculum, stage, intake)
  const { data: student } = await supabase
    .from('office_desk.students')
    .select('curriculum, current_stage, intake_group')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const data: StudentProfile = {
    id: profile.id,
    name: profile.name,
    surname: null,
    email: user.email ?? null,
    phone: null,
    role: profile.role as UserRole,
    zone: null,
    nation: null,
    city: null,
    created_at: profile.created_at,
    curriculum: student?.curriculum ?? profile.curriculum ?? null,
    current_stage: student?.current_stage ?? profile.stage ?? null,
    intake_group: student?.intake_group ?? profile.intake ?? null,
  };

  return { data, error: null };
}

// ═══════════════════════════════════════════════════════════
// ENROLLED CLASSES (Student)
// ═══════════════════════════════════════════════════════════

export async function fetchEnrolledClasses(): Promise<{
  data: EnrolledClass[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Not authenticated' };
  }

  // 1. Fetch active enrollments from student_class
  const { data: enrollments, error: enrErr } = await supabase
    .from('student_class')
    .select('id, class_id, enrolled_at, is_active')
    .eq('student_id', user.id)
    .eq('is_active', true)
    .order('enrolled_at', { ascending: false });

  if (enrErr) {
    return { data: [], error: enrErr.message };
  }

  if (!enrollments || enrollments.length === 0) {
    return { data: [], error: null };
  }

  // 2. Fetch course details
  const classIds = enrollments.map((e) => e.class_id);
  const { data: courses, error: courseErr } = await supabase
    .from('courses')
    .select('id, title, description, type, platform, teacher_id, section')
    .in('id', classIds);

  if (courseErr) {
    return { data: [], error: courseErr.message };
  }

  const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));

  // 3. Fetch teacher names
  const teacherIds = [...new Set((courses ?? []).map((c) => c.teacher_id).filter(Boolean))];
  const teacherMap = new Map<string, string>();

  for (const tid of teacherIds) {
    const { data } = await supabase.rpc('get_teacher_name', { p_teacher_id: tid });
    if (data && data.length > 0) {
      teacherMap.set(tid, data[0].name);
    }
  }

  // 4. Fetch next schedule slot
  const scheduleMap = new Map<
    string,
    { label: string | null; start_time: string; end_time: string; days_of_week: number[] } | null
  >();

  const { data: slots } = await supabase
    .from('schedule_slot')
    .select('course_id, label, start_time, end_time, days_of_week')
    .in('course_id', classIds)
    .eq('is_active', true)
    .order('start_time');

  for (const slot of slots ?? []) {
    if (!scheduleMap.has(slot.course_id)) {
      scheduleMap.set(slot.course_id, {
        label: slot.label,
        start_time: slot.start_time,
        end_time: slot.end_time,
        days_of_week: slot.days_of_week,
      });
    }
  }

  // 5. Build enrolled class list
  const classes: EnrolledClass[] = enrollments.map((enr) => {
    const course = courseMap.get(enr.class_id);
    return {
      id: enr.id,
      class_id: enr.class_id,
      title: course?.title ?? 'Unknown Class',
      description: course?.description ?? null,
      type: course?.type ?? '',
      platform: course?.platform ?? '',
      teacher_name: course?.teacher_id ? (teacherMap.get(course.teacher_id) ?? null) : null,
      enrolled_at: enr.enrolled_at,
      is_active: enr.is_active,
      next_class: scheduleMap.get(enr.class_id) ?? null,
      section: course?.section ?? null,
    };
  });

  return { data: classes, error: null };
}

// ═══════════════════════════════════════════════════════════
// REGISTRATION STATUS (Student)
// ═══════════════════════════════════════════════════════════

export async function fetchRegistrationStatus(): Promise<{
  data: RegistrationRecord | null;
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('office_desk.students')
    .select('id, grade, pack_choice, status, enrollment_date, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error: null };
  }

  const { data: prof } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', user.id)
    .single();

  const record: RegistrationRecord | null = data
    ? {
        id: data.id,
        student_name: prof?.name ?? 'Student',
        student_email: prof?.email ?? null,
        course_name: data.pack_choice ?? null,
        status: data.status ?? 'pending',
        created_at: data.created_at,
        updated_at: data.updated_at,
      }
    : null;

  return { data: record, error: null };
}

// ═══════════════════════════════════════════════════════════
// ADULT PROFILE
// ═══════════════════════════════════════════════════════════

export async function fetchAdultProfile(): Promise<{
  data: AdultProfile | null;
  children: ChildRecord[];
  familyAccount: FamilyAccountDetail | null;
  error: string | null;
}> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { data: null, children: [], familyAccount: null, error: 'Not authenticated' };
  }

  // 1. Fetch profile
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('id, name, surname, email, phone, role, zone, nation, city, created_at')
    .eq('id', user.id)
    .single();

  if (profErr || !profile) {
    return {
      data: null,
      children: [],
      familyAccount: null,
      error: profErr?.message ?? 'Profile not found',
    };
  }

  // 2. Fetch office_desk.users → get family_account_id
  const { data: officeUser } = await supabase
    .from('office_desk.users')
    .select('family_account_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  const familyAccountId = officeUser?.family_account_id ?? null;

  // 3. Fetch family account details
  let familyAccount: FamilyAccountDetail | null = null;
  if (familyAccountId) {
    const { data: fa } = await supabase
      .from('office_desk.family_accounts')
      .select(
        'id, status, family_name, primary_contact_email, primary_contact_phone, bank_name, bank_branch, bank_sort_code, created_at'
      )
      .eq('id', familyAccountId)
      .maybeSingle();

    if (fa) {
      familyAccount = {
        id: fa.id,
        status: fa.status,
        family_name: fa.family_name,
        primary_contact_email: fa.primary_contact_email,
        primary_contact_phone: fa.primary_contact_phone,
        bank_name: fa.bank_name,
        bank_branch: fa.bank_branch,
        bank_sort_code: fa.bank_sort_code,
        created_at: fa.created_at,
      };
    }
  }

  // 4. Fetch children (students linked to same family account)
  const children: ChildRecord[] = [];
  if (familyAccountId) {
    const { data: childUsers } = await supabase
      .from('office_desk.users')
      .select('auth_user_id')
      .eq('family_account_id', familyAccountId)
      .neq('auth_user_id', user.id);

    if (childUsers && childUsers.length > 0) {
      const childIds = childUsers.map((c) => c.auth_user_id);

      // Fetch profiles for children
      const { data: childProfiles } = await supabase
        .from('profiles')
        .select('id, name, role')
        .in('id', childIds);

      // Fetch office_desk.students for each child
      for (const cp of childProfiles ?? []) {
        const { data: cs } = await supabase
          .from('office_desk.students')
          .select('curriculum, current_stage, grade, intake_group, status')
          .eq('user_id', cp.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        children.push({
          id: cp.id,
          user_id: cp.id,
          name: cp.name,
          curriculum: cs?.curriculum ?? null,
          current_stage: cs?.current_stage ?? null,
          grade: cs?.grade ?? null,
          intake_group: cs?.intake_group ?? null,
          status: cs?.status ?? null,
        });
      }
    }
  }

  const data: AdultProfile = {
    ...profile,
    family_account_id: familyAccountId,
    family_account_status: familyAccount?.status ?? null,
    family_account_created_at: familyAccount?.created_at ?? null,
  };

  return { data, children, familyAccount, error: null };
}

// ═══════════════════════════════════════════════════════════
// INVOICES (Adult)
// ═══════════════════════════════════════════════════════════

export async function fetchInvoices(): Promise<{
  data: InvoiceRecord[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Not authenticated' };
  }

  // Get family_account_id via office_desk.users
  const { data: officeUser } = await supabase
    .from('office_desk.users')
    .select('family_account_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!officeUser?.family_account_id) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from('office_desk.invoices')
    .select('id, invoice_number, description, amount, currency, status, due_date, created_at')
    .eq('family_account_id', officeUser.family_account_id)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  const invoices: InvoiceRecord[] = (data ?? []).map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    description: inv.description,
    amount: inv.amount,
    currency: inv.currency,
    status: inv.status,
    due_date: inv.due_date,
    created_at: inv.created_at,
  }));

  return { data: invoices, error: null };
}

// ═══════════════════════════════════════════════════════════
// PAYMENTS (Adult / Student)
// ═══════════════════════════════════════════════════════════

export async function fetchPaymentHistory(): Promise<{
  data: PaymentRecord[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('office_desk.payments')
    .select(
      'id, amount, currency, status, payment_method, reference, paid_at, created_at, invoice_id'
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  // Enrich with invoice description/number
  const invoiceIds = [...new Set((data ?? []).map((p) => p.invoice_id).filter(Boolean))];
  const invoiceMap = new Map<
    string,
    { description: string | null; invoice_number: string | null }
  >();

  if (invoiceIds.length > 0) {
    const { data: invoices } = await supabase
      .from('office_desk.invoices')
      .select('id, description, invoice_number')
      .in('id', invoiceIds);

    for (const inv of invoices ?? []) {
      invoiceMap.set(inv.id, {
        description: inv.description,
        invoice_number: inv.invoice_number,
      });
    }
  }

  const payments: PaymentRecord[] = (data ?? []).map((p) => {
    const inv = invoiceMap.get(p.invoice_id);
    return {
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      payment_method: p.payment_method,
      reference: p.reference,
      paid_at: p.paid_at,
      created_at: p.created_at,
      description: inv?.description ?? null,
      invoice_number: inv?.invoice_number ?? null,
    };
  });

  return { data: payments, error: null };
}

// ═══════════════════════════════════════════════════════════
// TEACHER PROFILE
// ═══════════════════════════════════════════════════════════

export async function fetchTeacherProfile(): Promise<{
  data: TeacherProfile | null;
  error: string | null;
}> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { data: null, error: 'Not authenticated' };
  }

  // 1. Fetch profile
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('id, name, surname, email, phone, role, zone, nation, city, created_at')
    .eq('id', user.id)
    .single();

  if (profErr || !profile) {
    return { data: null, error: profErr?.message ?? 'Profile not found' };
  }

  // 2. Fetch courses where this user is teacher
  const { data: courses, error: courseErr } = await supabase
    .from('courses')
    .select('id, title, type, platform, section')
    .eq('teacher_id', user.id);

  if (courseErr) {
    return { data: { ...profile, classes_taught: [] }, error: null };
  }

  // 3. For each course, fetch enrolled students
  const classesTaught = await Promise.all(
    (courses ?? []).map(async (course) => {
      const { data: enrollments } = await supabase
        .from('student_class')
        .select('student_id')
        .eq('class_id', course.id)
        .eq('is_active', true);

      const studentIds = (enrollments ?? []).map((e) => e.student_id);

      let students: {
        id: string;
        name: string | null;
        email: string | null;
        grade: string | null;
      }[] = [];
      if (studentIds.length > 0) {
        const { data: studentProfiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', studentIds);

        // Fetch grades for each student in this course
        students = await Promise.all(
          (studentProfiles ?? []).map(async (sp) => {
            const { data: gradeData } = await supabase
              .from('school_desk.gradebook')
              .select('score')
              .eq('course_id', course.id)
              .eq('student_id', sp.id)
              .order('graded_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              id: sp.id,
              name: sp.name,
              email: sp.email,
              grade: gradeData?.score != null ? String(gradeData.score) : null,
            };
          })
        );
      }

      return {
        course_id: course.id,
        title: course.title,
        type: course.type,
        platform: course.platform,
        section: course.section,
        student_count: students.length,
        students,
      };
    })
  );

  const data: TeacherProfile = {
    ...profile,
    classes_taught: classesTaught,
  };

  return { data, error: null };
}

// ═══════════════════════════════════════════════════════════
// UPDATE PROFILE
// ═══════════════════════════════════════════════════════════

export async function updateStudentProfile(updates: {
  name?: string;
  phone?: string;
}): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  return { error: error?.message ?? null };
}
