export interface LiffProfile {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

export interface LiffState {
  isReady: boolean
  isLoggedIn: boolean
  isInClient: boolean
  profile: LiffProfile | null
  idToken: string | null
  error: Error | null
}

export type LiffAction =
  | { type: 'INIT_START' }
  | { type: 'INIT_SUCCESS'; payload: { isLoggedIn: boolean; isInClient: boolean; profile: LiffProfile | null; idToken: string | null } }
  | { type: 'INIT_ERROR'; payload: Error }
  | { type: 'LOGOUT' }

export const initialLiffState: LiffState = {
  isReady: false,
  isLoggedIn: false,
  isInClient: false,
  profile: null,
  idToken: null,
  error: null,
}
