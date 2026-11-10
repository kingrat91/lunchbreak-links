-- Lunchbreak Links: database setup
-- Run this ONCE in the Supabase dashboard: SQL Editor > New query > paste > Run.
--
-- What it sets up, in plain words:
--   * Only invited email addresses can create an account.
--   * Only active members can read anything.
--   * Members can add links, and edit or delete their own.
--   * Only admins can manage categories, invitations and members.
--   * Nobody who is signed out can read or change anything.

-- ---------------------------------------------------------------- tables

create table public.invites (
  email      text primary key check (email = lower(email)),
  is_admin   boolean not null default false,
  invited_by uuid,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_emoji text not null default '' check (char_length(avatar_emoji) <= 8),
  avatar_color text not null default '#8b7cf6' check (avatar_color ~* '^#[0-9a-f]{6}$'),
  is_admin     boolean not null default false,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 30),
  color      text not null default '#8b7cf6' check (color ~* '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default clock_timestamp()
);
create unique index categories_name_key on public.categories (lower(name));

create table public.links (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  url         text not null check (url ~* '^https?://' and char_length(url) <= 2000),
  category_id uuid not null references public.categories (id) on delete restrict,
  added_by    uuid not null default auth.uid() references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index links_category_idx on public.links (category_id);

-- ------------------------------------------------------- helper functions

create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active and is_admin);
$$;

-- Invite-only: when someone signs in for the first time, their account is
-- only created if their email is on the invite list. Otherwise it is refused.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  inv public.invites%rowtype;
begin
  select * into inv from public.invites where email = lower(new.email);
  if not found then
    raise exception 'This email address has not been invited.';
  end if;
  insert into public.profiles (id, display_name, is_admin)
  values (new.id, left(split_part(new.email, '@', 1), 40), inv.is_admin);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin: list members together with their email addresses.
-- (Emails are not stored in profiles, so ordinary members never see them.)
create function public.admin_members()
returns table (id uuid, email text, display_name text, avatar_emoji text, avatar_color text,
               is_admin boolean, active boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.display_name, p.avatar_emoji, p.avatar_color,
           p.is_admin, p.active, p.created_at
    from public.profiles p join auth.users u on u.id = p.id
    order by p.created_at;
end;
$$;

-- Admin: add an email to the invite list (and restore a removed member).
create function public.invite_member(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v text := lower(trim(p_email));
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if v !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That does not look like an email address.';
  end if;
  insert into public.invites (email, invited_by) values (v, auth.uid())
  on conflict (email) do nothing;
  update public.profiles p set active = true
  from auth.users u where u.id = p.id and lower(u.email) = v;
end;
$$;

-- Admin: remove a member. They lose access at once; their links stay.
create function public.remove_member(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if p_id = auth.uid() then
    raise exception 'You cannot remove yourself.';
  end if;
  delete from public.invites i using auth.users u
  where u.id = p_id and i.email = lower(u.email);
  update public.profiles set active = false, is_admin = false where id = p_id;
end;
$$;

-- ------------------------------------------------------------ permissions
-- Start from nothing, then allow only what the site needs.

revoke all on public.invites, public.profiles, public.categories, public.links from anon, authenticated;
revoke all on function public.is_member(), public.is_admin(), public.handle_new_user(),
  public.admin_members(), public.invite_member(text), public.remove_member(uuid)
  from public, anon, authenticated;

grant execute on function public.is_member(), public.is_admin(), public.admin_members(),
  public.invite_member(text), public.remove_member(uuid) to authenticated;

grant select on public.profiles, public.categories, public.links to authenticated;
grant update (display_name, avatar_emoji, avatar_color) on public.profiles to authenticated;
grant insert (name, url, category_id), update (name, url, category_id), delete on public.links to authenticated;
grant insert (name, color), update (name, color), delete on public.categories to authenticated;
grant select, delete on public.invites to authenticated;

alter table public.invites    enable row level security;
alter table public.profiles   enable row level security;
alter table public.categories enable row level security;
alter table public.links      enable row level security;

-- profiles: members see each other; you can always see your own row.
create policy profiles_read on public.profiles for select to authenticated
  using (public.is_member() or id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()) and public.is_member())
  with check (id = (select auth.uid()));

-- categories: members read, admins manage.
create policy categories_read   on public.categories for select to authenticated using (public.is_member());
create policy categories_insert on public.categories for insert to authenticated with check (public.is_admin());
create policy categories_update on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy categories_delete on public.categories for delete to authenticated using (public.is_admin());

-- links: members read and add; the author or an admin can edit or delete.
create policy links_read   on public.links for select to authenticated using (public.is_member());
create policy links_insert on public.links for insert to authenticated
  with check (public.is_member() and added_by = (select auth.uid()));
create policy links_update on public.links for update to authenticated
  using (public.is_member() and (added_by = (select auth.uid()) or public.is_admin()))
  with check (public.is_member());
create policy links_delete on public.links for delete to authenticated
  using (public.is_member() and (added_by = (select auth.uid()) or public.is_admin()));

-- invites: admins only.
create policy invites_read   on public.invites for select to authenticated using (public.is_admin());
create policy invites_delete on public.invites for delete to authenticated using (public.is_admin());

-- ------------------------------------------------------ starting categories

insert into public.categories (name, color) values
  ('Game', '#8b7cf6'),
  ('Work', '#f5a524'),
  ('Knowledge Sharing', '#34c77b');

-- ------------------------------------------------------------ first admin
-- After running everything above, run this ONE line separately, with your own
-- email address, to make yourself the admin. Do not save your address in this
-- file, because the file is public on GitHub.
--
--   insert into public.invites (email, is_admin) values ('you@example.com', true);
