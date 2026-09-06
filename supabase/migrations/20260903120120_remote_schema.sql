SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.fn_is_guardian_of_child (
  p_guardian uuid,
  p_child    uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_child fc
    WHERE fc.guardian_id = p_guardian
      AND fc.child_id = p_child
  );
$function$;

DROP POLICY IF EXISTS "p_adult_child_read" ON "public"."profiles";
CREATE POLICY "p_adult_child_read" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (public.fn_is_guardian_of_child(auth.uid(), id));

DROP POLICY IF EXISTS "sc_adult_read" ON "public"."student_class";
CREATE POLICY "sc_adult_read" ON "public"."student_class"
  FOR SELECT
  TO "authenticated"
  USING (public.fn_is_guardian_of_child(auth.uid(), student_id));

DROP POLICY IF EXISTS "c_adult_enrolled_read" ON "school_desk"."courses";
CREATE POLICY "c_adult_enrolled_read" ON "school_desk"."courses"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM (public.family_child fc
     JOIN public.student_class sc ON (((sc.student_id = fc.child_id) AND sc.is_active)))
  WHERE ((fc.guardian_id = auth.uid()) AND (sc.class_id = courses.id)))));

GRANT EXECUTE ON FUNCTION "public"."fn_is_guardian_of_child"(uuid, uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON TABLE "public"."chapters" FROM "authenticated";
GRANT DELETE, INSERT, UPDATE ON TABLE "public"."chapters" TO "authenticated";

REVOKE ALL ON TABLE "public"."profiles" FROM "authenticated";
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ON TABLE "public"."website_leads" FROM "authenticated";
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."website_leads" TO "authenticated";

REVOKE ALL ON TABLE "school_desk"."courses" FROM "authenticated";
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "school_desk"."courses" TO "authenticated";

REVOKE ALL ON TABLE "school_desk"."enrollments" FROM "authenticated";
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "school_desk"."enrollments" TO "authenticated";
