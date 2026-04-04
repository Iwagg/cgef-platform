/*
  # Security and Performance Fixes

  1. Missing Indexes
    - Add index on action_plans.owner_id for FK performance
    - Add index on assessment_responses.answered_by for FK performance  
    - Add index on assessments.created_by for FK performance

  2. RLS Policy Optimization
    - Replace auth.uid() with (select auth.uid()) for all policies
    - This prevents re-evaluation per row and improves query performance

  3. Function Search Path
    - Set explicit search_path on functions to prevent mutable search_path issues

  4. Cleanup Duplicate Policies
    - Remove redundant SELECT policies where multiple exist
*/

-- 1. Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_action_plans_owner ON action_plans(owner_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_answered_by ON assessment_responses(answered_by);
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);

-- 2. Fix function search_path issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'analyst'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Drop and recreate RLS policies with optimized auth function calls

-- Organizations policies
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Admins can manage organizations" ON organizations;

CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can manage organizations"
  ON organizations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'ciso')
    )
  );

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view organization profiles" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can view organization profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- Assessments policies
DROP POLICY IF EXISTS "Users can view organization assessments" ON assessments;
DROP POLICY IF EXISTS "Users can create assessments" ON assessments;
DROP POLICY IF EXISTS "Users can update organization assessments" ON assessments;
DROP POLICY IF EXISTS "Users can delete organization assessments" ON assessments;

CREATE POLICY "Users can view organization assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update organization assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete organization assessments"
  ON assessments FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- Assessment responses policies
DROP POLICY IF EXISTS "Users can view assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Users can create assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Users can update assessment responses" ON assessment_responses;

CREATE POLICY "Users can view assessment responses"
  ON assessment_responses FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create assessment responses"
  ON assessment_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update assessment responses"
  ON assessment_responses FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );

-- Assessment scores policies
DROP POLICY IF EXISTS "Users can view assessment scores" ON assessment_scores;
DROP POLICY IF EXISTS "Users can manage assessment scores" ON assessment_scores;

CREATE POLICY "Users can view assessment scores"
  ON assessment_scores FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert assessment scores"
  ON assessment_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );

-- Action plans policies
DROP POLICY IF EXISTS "Users can view action plans" ON action_plans;
DROP POLICY IF EXISTS "Users can create action plans" ON action_plans;
DROP POLICY IF EXISTS "Users can update action plans" ON action_plans;
DROP POLICY IF EXISTS "Users can delete action plans" ON action_plans;

CREATE POLICY "Users can view action plans"
  ON action_plans FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create action plans"
  ON action_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update action plans"
  ON action_plans FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete action plans"
  ON action_plans FOR DELETE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );
