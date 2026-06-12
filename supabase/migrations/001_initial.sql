-- 建立自訂型別
CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE session_status AS ENUM ('open', 'closed', 'cancelled');
CREATE TYPE registration_status AS ENUM ('confirmed', 'waitlisted', 'cancelled');

-- profiles 表（球員資料）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  status user_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- sessions 表（打球場次）
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT NOT NULL,
  court_count INT DEFAULT 1,
  max_players INT,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  status session_status DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- registrations 表（報名紀錄）
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status registration_status DEFAULT 'confirmed',
  position INT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- 建立索引
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_registrations_session ON registrations(session_id);
CREATE INDEX idx_registrations_user ON registrations(user_id);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- 安全函數（SECURITY DEFINER 繞過 RLS 遞迴）
CREATE OR REPLACE FUNCTION public.check_is_admin(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = uid),
    FALSE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles RLS
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

-- sessions RLS
CREATE POLICY "Approved users can view sessions" ON sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'approved')
  );

CREATE POLICY "Admins can manage sessions" ON sessions
  FOR ALL USING (public.check_is_admin(auth.uid()));

-- registrations RLS
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
