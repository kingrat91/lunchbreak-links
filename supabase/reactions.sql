-- Lunchbreak Links: emoji reactions on chat messages
-- Run this ONCE in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- It only ADDS the reactions table. It does not touch anything that already exists.
-- (Do not run schema.sql again.)
--
-- What it sets up, in plain words:
--   * Members can see everyone's reactions.
--   * Members can add reactions as themselves, and take back their own.
--   * Deleting a message removes its reactions too.

create table public.reactions (
  message_id bigint not null references public.messages (id) on delete cascade,
  user_id    uuid   not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji      text   not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)   -- one of each emoji per person per message
);

revoke all on public.reactions from anon, authenticated;
grant select, insert (message_id, emoji), delete on public.reactions to authenticated;

alter table public.reactions enable row level security;

create policy reactions_read   on public.reactions for select to authenticated using (public.is_member());
create policy reactions_insert on public.reactions for insert to authenticated
  with check (public.is_member() and user_id = (select auth.uid()));
create policy reactions_delete on public.reactions for delete to authenticated
  using (public.is_member() and user_id = (select auth.uid()));

-- Send new and removed reactions to open pages straight away.
alter publication supabase_realtime add table public.reactions;
