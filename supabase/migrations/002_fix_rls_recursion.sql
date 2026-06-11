-- 修正 RLS 無限遞迴問題
-- 先刪除所有舊的 policies

-- profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view approved users" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- sessions policies
DROP POLICY IF EXISTS "Approved users can view sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can manage sessions" ON sessions;

-- registrations policies
DROP POLICY IF EXISTS "Approved users can view registrations" ON registrations;
DROP POLICY IF EXISTS "Approved users can insert registrations" ON registrations;
DROP POLICY IF EXISTS "Users can cancel own registration" ON registrations;
DROP POLICY IF EXISTS "Admins can manage registrations" ON registrations;

-- 建立安全函數（SECURITY DEFINER 繞過 RLS）
CREATE OR REPLACE FUNCTION public.check_is_admin(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = uid),
    FALSE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 重建 profiles policies（避免遞迴）
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view approved users" ON profiles
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can view all profiles via admin" ON profiles
  FOR SELECT USING (public.check_is_admin(auth.uid()));

CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (public.check_is_admin(auth.uid()));

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 重建 sessions policies
CREATE POLICY "Approved users can view sessions" ON sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'approved')
  );

CREATE POLICY "Admins can manage sessions" ON sessions
  FOR ALL USING (public.check_is_admin(auth.uid()));

-- 重建 registrations policies
CREATE POLICY "Approved users can view registrations" ON registrations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'approved')
  );

CREATE POLICY "Approved users can insert registrations" ON registrations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'approved')
    AND auth.uid() = user_id
  );

CREATE POLICY "Users can cancel own registration" ON registrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage registrations" ON registrations
  FOR ALL USING (public.check_is_admin(auth.uid()));
