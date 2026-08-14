import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { course_id, student_id } = await req.json();

    if (!course_id || !student_id) {
      return new Response(
        JSON.stringify({ error: 'course_id and student_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch grades for student in course with assignment weights
    const { data: grades, error } = await supabase
      .from('school_desk.gradebook')
      .select(`
        id,
        score,
        assignments (
          id,
          title,
          max_score,
          weight
        )
      `)
      .eq('course_id', course_id)
      .eq('student_id', student_id)
      .is('deleted_at', null)
      .not('score', 'is', null);

    if (error) {
      throw error;
    }

    if (!grades || grades.length === 0) {
      return new Response(
        JSON.stringify({
          weighted_average: null,
          grade_letter: null,
          grade_count: 0,
          message: 'No grades found for this student in this course'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate weighted average
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const grade of grades) {
      const assignment = grade.assignments as any;
      if (assignment && grade.score !== null) {
        const normalizedScore = (grade.score / assignment.max_score) * 100;
        totalWeightedScore += normalizedScore * assignment.weight;
        totalWeight += assignment.weight;
      }
    }

    const weightedAverage = totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) / 100 : null;

    // Convert to letter grade
    const getLetterGrade = (avg: number): string => {
      if (avg >= 93) return 'A';
      if (avg >= 90) return 'A-';
      if (avg >= 87) return 'B+';
      if (avg >= 83) return 'B';
      if (avg >= 80) return 'B-';
      if (avg >= 77) return 'C+';
      if (avg >= 73) return 'C';
      if (avg >= 70) return 'C-';
      if (avg >= 67) return 'D+';
      if (avg >= 60) return 'D';
      return 'F';
    };

    const gradeLetter = weightedAverage !== null ? getLetterGrade(weightedAverage) : null;

    return new Response(
      JSON.stringify({
        weighted_average: weightedAverage,
        grade_letter: gradeLetter,
        grade_count: grades.length,
        course_id,
        student_id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('calculate-final-grade error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
