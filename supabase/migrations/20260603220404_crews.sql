-- ============================================================================
-- Crews feature: schema + RLS
-- ============================================================================

-- --------------------------------------------------------------------------
-- crews: a named group of skaters
-- --------------------------------------------------------------------------
create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 50),
  description text check (char_length(description) <= 500),
  avatar_url text,
  created_by uuid references auth.users(id) on delete set null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists crews_created_by_idx on public.crews(created_by);
create index if not exists crews_is_public_idx on public.crews(is_public);

-- --------------------------------------------------------------------------
-- crew_members: membership + role
-- --------------------------------------------------------------------------
create table if not exists public.crew_members (
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create index if not exists crew_members_user_idx on public.crew_members(user_id);

-- --------------------------------------------------------------------------
-- crew_invites: pending invitations
-- --------------------------------------------------------------------------
create table if not exists public.crew_invites (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  inviter_id uuid references auth.users(id) on delete set null,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (crew_id, invitee_id, status) deferrable initially deferred
);

create index if not exists crew_invites_invitee_idx on public.crew_invites(invitee_id, status);
create index if not exists crew_invites_crew_idx on public.crew_invites(crew_id, status);

-- --------------------------------------------------------------------------
-- crew_spots: spots shared with crew (reference, not copy)
-- --------------------------------------------------------------------------
create table if not exists public.crew_spots (
  crew_id uuid not null references public.crews(id) on delete cascade,
  spot_id uuid not null references public.spots(id) on delete cascade,
  added_by uuid references auth.users(id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (crew_id, spot_id)
);

create index if not exists crew_spots_spot_idx on public.crew_spots(spot_id);

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.crew_invites enable row level security;
alter table public.crew_spots enable row level security;

-- helper: is user a member of crew
create or replace function public.is_crew_member(p_crew_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.crew_members
    where crew_id = p_crew_id and user_id = p_user_id
  );
$$;

-- helper: is user owner/admin of crew
create or replace function public.is_crew_admin(p_crew_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.crew_members
    where crew_id = p_crew_id
      and user_id = p_user_id
      and role in ('owner','admin')
  );
$$;

-- --------------------------------------------------------------------------
-- crews policies
-- --------------------------------------------------------------------------
drop policy if exists "crews_select_public_or_member" on public.crews;
create policy "crews_select_public_or_member" on public.crews
  for select
  using (
    is_public = true
    or public.is_crew_member(id, auth.uid())
  );

drop policy if exists "crews_insert_self" on public.crews;
create policy "crews_insert_self" on public.crews
  for insert
  with check (auth.uid() = created_by);

drop policy if exists "crews_update_admin" on public.crews;
create policy "crews_update_admin" on public.crews
  for update
  using (public.is_crew_admin(id, auth.uid()))
  with check (public.is_crew_admin(id, auth.uid()));

drop policy if exists "crews_delete_owner" on public.crews;
create policy "crews_delete_owner" on public.crews
  for delete
  using (
    exists (
      select 1 from public.crew_members
      where crew_id = id and user_id = auth.uid() and role = 'owner'
    )
  );

-- --------------------------------------------------------------------------
-- crew_members policies
-- --------------------------------------------------------------------------
drop policy if exists "crew_members_select_visible" on public.crew_members;
create policy "crew_members_select_visible" on public.crew_members
  for select
  using (
    public.is_crew_member(crew_id, auth.uid())
    or exists (
      select 1 from public.crews c
      where c.id = crew_id and c.is_public = true
    )
  );

-- creator inserts self as owner on creation
drop policy if exists "crew_members_insert_self" on public.crew_members;
create policy "crew_members_insert_self" on public.crew_members
  for insert
  with check (user_id = auth.uid());

-- admins can insert other members (e.g. accept invite handled via function)
drop policy if exists "crew_members_insert_admin" on public.crew_members;
create policy "crew_members_insert_admin" on public.crew_members
  for insert
  with check (public.is_crew_admin(crew_id, auth.uid()));

drop policy if exists "crew_members_delete_self_or_admin" on public.crew_members;
create policy "crew_members_delete_self_or_admin" on public.crew_members
  for delete
  using (
    user_id = auth.uid()
    or public.is_crew_admin(crew_id, auth.uid())
  );

drop policy if exists "crew_members_update_admin" on public.crew_members;
create policy "crew_members_update_admin" on public.crew_members
  for update
  using (public.is_crew_admin(crew_id, auth.uid()))
  with check (public.is_crew_admin(crew_id, auth.uid()));

-- --------------------------------------------------------------------------
-- crew_invites policies
-- --------------------------------------------------------------------------
drop policy if exists "crew_invites_select_party" on public.crew_invites;
create policy "crew_invites_select_party" on public.crew_invites
  for select
  using (
    invitee_id = auth.uid()
    or inviter_id = auth.uid()
    or public.is_crew_admin(crew_id, auth.uid())
  );

drop policy if exists "crew_invites_insert_member" on public.crew_invites;
create policy "crew_invites_insert_member" on public.crew_invites
  for insert
  with check (
    inviter_id = auth.uid()
    and public.is_crew_member(crew_id, auth.uid())
  );

drop policy if exists "crew_invites_update_invitee_or_admin" on public.crew_invites;
create policy "crew_invites_update_invitee_or_admin" on public.crew_invites
  for update
  using (
    invitee_id = auth.uid()
    or public.is_crew_admin(crew_id, auth.uid())
  )
  with check (
    invitee_id = auth.uid()
    or public.is_crew_admin(crew_id, auth.uid())
  );

drop policy if exists "crew_invites_delete_party" on public.crew_invites;
create policy "crew_invites_delete_party" on public.crew_invites
  for delete
  using (
    invitee_id = auth.uid()
    or inviter_id = auth.uid()
    or public.is_crew_admin(crew_id, auth.uid())
  );

-- --------------------------------------------------------------------------
-- crew_spots policies
-- --------------------------------------------------------------------------
drop policy if exists "crew_spots_select_visible" on public.crew_spots;
create policy "crew_spots_select_visible" on public.crew_spots
  for select
  using (
    public.is_crew_member(crew_id, auth.uid())
    or exists (
      select 1 from public.crews c
      where c.id = crew_id and c.is_public = true
    )
  );

drop policy if exists "crew_spots_insert_member" on public.crew_spots;
create policy "crew_spots_insert_member" on public.crew_spots
  for insert
  with check (
    public.is_crew_member(crew_id, auth.uid())
    and added_by = auth.uid()
  );

drop policy if exists "crew_spots_delete_admin_or_adder" on public.crew_spots;
create policy "crew_spots_delete_admin_or_adder" on public.crew_spots
  for delete
  using (
    added_by = auth.uid()
    or public.is_crew_admin(crew_id, auth.uid())
  );
