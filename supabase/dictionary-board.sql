-- Lunchbreak Links: the Dictionary and the shared Board
-- Run this ONCE in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- It only ADDS two tables. It does not touch anything that already exists.
-- (Do not run schema.sql or reactions.sql again.)
--
-- What it sets up, in plain words:
--   * Dictionary: members can see every word and add their own. You can edit or delete
--     the words you added; the admin can edit or delete any.
--   * Board: members can see the drawing, add to it, and clear it. New strokes and a
--     cleared board reach everyone who has the board open straight away.

-- ------------------------------------------------------------- dictionary
create table public.words (
  id         bigint generated always as identity primary key,
  word       text not null check (char_length(word) between 1 and 60),
  meaning    text not null default '' check (char_length(meaning) <= 500),
  said_by    text not null default '' check (char_length(said_by) <= 40),
  added_by   uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

revoke all on public.words from anon, authenticated;
grant select, insert (word, meaning, said_by), update (word, meaning, said_by), delete on public.words to authenticated;

alter table public.words enable row level security;

create policy words_read   on public.words for select to authenticated using (public.is_member());
create policy words_insert on public.words for insert to authenticated
  with check (public.is_member() and added_by = (select auth.uid()));
create policy words_update on public.words for update to authenticated
  using (public.is_member() and (added_by = (select auth.uid()) or public.is_admin()))
  with check (public.is_member());
create policy words_delete on public.words for delete to authenticated
  using (public.is_member() and (added_by = (select auth.uid()) or public.is_admin()));

-- ------------------------------------------------------------------ board
-- One row per piece of a drawn line. "points" is a list of numbers: x, y, x, y, ...
-- on a board that is always 1600 wide and 1000 high. The colour "erase" is the eraser.
create table public.board_strokes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references public.profiles (id),
  color      text not null check (color = 'erase' or color ~* '^#[0-9a-f]{6}$'),
  size       smallint not null check (size between 1 and 80),
  points     jsonb not null check (jsonb_typeof(points) = 'array' and jsonb_array_length(points) between 2 and 600),
  created_at timestamptz not null default now()
);

revoke all on public.board_strokes from anon, authenticated;
grant select, insert (color, size, points), delete on public.board_strokes to authenticated;

alter table public.board_strokes enable row level security;

create policy board_read   on public.board_strokes for select to authenticated using (public.is_member());
create policy board_insert on public.board_strokes for insert to authenticated
  with check (public.is_member() and user_id = (select auth.uid()));
create policy board_clear  on public.board_strokes for delete to authenticated using (public.is_member());

-- Send new strokes, and a cleared board, to open pages straight away.
alter publication supabase_realtime add table public.board_strokes;
