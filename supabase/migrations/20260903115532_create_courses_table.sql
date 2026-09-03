CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant_devotional(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  stage TEXT NOT NULL CHECK (stage IN ('junior', 'mid', 'senior')),
  type TEXT NOT NULL CHECK (type IN ('enrichment', 'core', 'club')),
  curriculum TEXT CHECK (curriculum IN ('cambridge', 'ib', 'kabv') OR type = 'enrichment'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, name, stage)
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_tenant_isolation" ON courses
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE TABLE staff_course (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenant_devotional(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, staff_id, course_id)
);

ALTER TABLE staff_course ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_course_tenant_isolation" ON staff_course
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
