<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Context

### LINE Login
- **LINE OAuth provider** is configured as a **custom provider** in Supabase → provider name is `custom:line`, NOT `line`
- LINE sub (`U...`) is available via:
  1. `user.user_metadata?.sub` (from regular `supabase.auth.getUser()`)
  2. `authUser.user.identities[i].id` where `provider === 'custom:line'` (from `supabaseAdmin.auth.admin.getUserById()`)
- `supabaseAdmin.auth.admin.listUsers()` does NOT return identities (`identities: null`)
- `supabase.from('auth.identities')` does NOT work — can't query the `auth` schema with JS client

### LIFF
- LIFF ID: `2010312125-kUodo2cu`, Channel ID: `2010312125`
- LIFF handles both returning users and new user registration (creates auth user via `supabase.auth.admin.createUser()`)
- Custom JWT (`liff_session` cookie) used for LIFF session management
- `AUTH_SECRET` stored in `.env.local`, read as `process.env.AUTH_SECRET`

### Auth flow
- All mutation API routes authenticate via both LIFF cookie and Supabase session
- Service role client (`supabaseAdmin`) used to bypass RLS for all API routes
- No RLS — all DB operations go through API routes
- New users can register via LIFF (not just existing users)

### Key fixes history
- LINE Verify API uses `client_id` (not `channel_id`) and `name` field (not `display_name`)
- When LINE OAuth user already has a LIFF profile with the same LINE sub, deletes the newly created auth user and issues LIFF JWT for existing user
- `profiles.id` has FK constraint to `auth.users(id)` — service role used for profile inserts
- `user.app_metadata?.provider_id` is unreliable; use `user_metadata.sub` or `custom:line` identity instead
