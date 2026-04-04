/*
  # Cleanup Unused Indexes and Merge Duplicate Policies

  1. Remove Unused Indexes
    - Drop indexes that have never been used to reduce storage overhead
    - Note: These can be recreated if query patterns change

  2. Merge Multiple Permissive Policies
    - Combine duplicate SELECT policies for organizations table
    - Combine duplicate SELECT policies for profiles table
    - Using single policies with OR conditions for better performance
*/

-- 1. Drop unused indexes
DROP INDEX IF EXISTS idx_profiles_organization;
DROP INDEX IF EXISTS idx_assessments_organization;
DROP INDEX IF EXISTS idx_assessments_status;
DROP INDEX IF EXISTS idx_responses_assessment;
DROP INDEX IF EXISTS idx_responses_pillar;
DROP INDEX IF EXISTS idx_action_plans_assessment;
DROP INDEX IF EXISTS idx_action_plans_status;
DROP INDEX IF EXISTS idx_action_plans_owner;
DROP INDEX IF EXISTS idx_assessment_responses_answered_by;
DROP INDEX IF EXISTS idx_assessments_created_by;

-- 2. Fix multiple permissive policies for organizations

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Admins can manage organizations" ON organizations;

-- Create single SELECT policy
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- Create separate INSERT/UPDATE/DELETE policies for admins only
CREATE POLICY "Admins can insert organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'ciso')
    )
  );

CREATE POLICY "Admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'ciso')
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'ciso')
    )
  );

CREATE POLICY "Admins can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'ciso')
    )
  );

-- 3. Fix multiple permissive policies for profiles

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view organization profiles" ON profiles;

-- Create single merged SELECT policy
CREATE POLICY "Users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = (select auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  );
