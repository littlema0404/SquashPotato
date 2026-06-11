export type UserStatus = 'pending' | 'approved' | 'rejected';
export type SessionStatus = 'open' | 'closed' | 'cancelled';
export type RegistrationStatus = 'confirmed' | 'waitlisted' | 'cancelled';

export interface Profile {
  id: string;
  line_user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  status: UserStatus;
  created_at: string;
}

export interface Session {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  court_count: number;
  max_players: number;
  description: string | null;
  created_by: string;
  status: SessionStatus;
  created_at: string;
}

export interface Registration {
  id: string;
  session_id: string;
  user_id: string;
  status: RegistrationStatus;
  position: number | null;
  registered_at: string;
}

export interface SessionWithRegistrations extends Session {
  registrations: Registration[];
  profiles: Profile;
}
