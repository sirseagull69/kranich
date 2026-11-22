-- Kranich · Zentrale
--
-- Hier melden die Agenten, hier liest die Kranich-App.
--
-- Wer darf was:
--   * Der Besitzer (angemeldet) darf seine eigenen Geraete, Funde, Ereignisse
--     und Auftraege lesen, Geraete umbenennen und entfernen und Auftraege von
--     der festen Liste anlegen.
--   * Ein Agent hat kein Benutzerkonto. Er weist sich mit seinem Geraete-
--     Schluessel aus und kommt nur ueber die vier agent_-Funktionen herein.
--     Direkt auf die Tabellen kommt er nicht.
--   * Geraete-Schluessel und Kopplungscodes liegen nur als Pruefsumme vor, in
--     einem Bereich, der von aussen gar nicht erreichbar ist.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table public.geraete (
  id uuid primary key default gen_random_uuid(),
  besitzer uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  system text not null check (system in ('windows', 'macos', 'android', 'ios')),
  erstellt timestamptz not null default now(),
  zuletzt_gesehen timestamptz,
  version text,
  ampel text not null default 'unbekannt' check (ampel in ('ok', 'warnung', 'kritisch', 'unbekannt')),
  ampel_gruende jsonb not null default '[]'::jsonb,
  status jsonb,
  offene_funde integer not null default 0 check (offene_funde >= 0),
  scan_laeuft boolean not null default false
);
create index geraete_besitzer on public.geraete (besitzer);

create table public.funde (
  id bigint generated always as identity primary key,
  geraet_id uuid not null references public.geraete (id) on delete cascade,
  schluessel text not null,
  name text not null,
  schwere text,
  zustand text,
  offen boolean not null default true,
  pfade jsonb not null default '[]'::jsonb,
  erkannt timestamptz,
  gemeldet timestamptz not null default now(),
  unique (geraet_id, schluessel)
);

create table public.ereignisse (
  id bigint generated always as identity primary key,
  geraet_id uuid not null references public.geraete (id) on delete cascade,
  art text not null check (art in ('fund', 'autostart', 'scan', 'gekoppelt')),
  inhalt text not null,
  zeit timestamptz not null default now()
);
create index ereignisse_geraet_zeit on public.ereignisse (geraet_id, zeit desc);

create table public.auftraege (
  id uuid primary key default gen_random_uuid(),
  geraet_id uuid not null references public.geraete (id) on delete cascade,
  -- Die feste Liste. Es gibt bewusst keinen Auftrag mit freiem Befehl oder Pfad.
  art text not null check (art in ('melden', 'schnellscan', 'vollscan', 'erkennungsliste')),
  zustand text not null default 'offen' check (zustand in ('offen', 'laeuft', 'erledigt', 'abgelehnt', 'fehlgeschlagen')),
  ergebnis jsonb,
  erstellt timestamptz not null default now(),
  erledigt_am timestamptz
);
create index auftraege_geraet_zustand on public.auftraege (geraet_id, zustand);

create table private.geraete_schluessel (
  geraet_id uuid primary key references public.geraete (id) on delete cascade,
  pruefsumme text not null unique
);

create table private.kopplungen (
  pruefsumme text primary key,
  besitzer uuid not null references auth.users (id) on delete cascade,
  name text not null,
  system text not null,
  gueltig_bis timestamptz not null
);
create index kopplungen_besitzer on private.kopplungen (besitzer);

-- Fehlversuche beim Koppeln, als Bremse gegen Durchprobieren von Codes.
create table private.kopplung_fehlversuche (
  zeit timestamptz not null default now()
);
create index kopplung_fehlversuche_zeit on private.kopplung_fehlversuche (zeit);

-- ---------------------------------------------------------------------------
-- Rechte auf den Tabellen
-- ---------------------------------------------------------------------------

alter table public.geraete enable row level security;
alter table public.funde enable row level security;
alter table public.ereignisse enable row level security;
alter table public.auftraege enable row level security;
alter table private.geraete_schluessel enable row level security;
alter table private.kopplungen enable row level security;
alter table private.kopplung_fehlversuche enable row level security;

revoke all on public.geraete, public.funde, public.ereignisse, public.auftraege from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;

grant select, delete on public.geraete to authenticated;
grant update (name) on public.geraete to authenticated;
grant select on public.funde, public.ereignisse to authenticated;
grant select on public.auftraege to authenticated;
grant insert (geraet_id, art) on public.auftraege to authenticated;

create policy "eigene geraete lesen" on public.geraete
  for select to authenticated using (besitzer = (select auth.uid()));
create policy "eigene geraete umbenennen" on public.geraete
  for update to authenticated using (besitzer = (select auth.uid())) with check (besitzer = (select auth.uid()));
create policy "eigene geraete entfernen" on public.geraete
  for delete to authenticated using (besitzer = (select auth.uid()));

create policy "funde eigener geraete lesen" on public.funde
  for select to authenticated using (
    exists (select 1 from public.geraete g where g.id = geraet_id and g.besitzer = (select auth.uid())));

create policy "ereignisse eigener geraete lesen" on public.ereignisse
  for select to authenticated using (
    exists (select 1 from public.geraete g where g.id = geraet_id and g.besitzer = (select auth.uid())));

create policy "auftraege eigener geraete lesen" on public.auftraege
  for select to authenticated using (
    exists (select 1 from public.geraete g where g.id = geraet_id and g.besitzer = (select auth.uid())));
create policy "auftraege fuer eigene geraete anlegen" on public.auftraege
  for insert to authenticated with check (
    exists (select 1 from public.geraete g where g.id = geraet_id and g.besitzer = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen (nicht von aussen aufrufbar)
-- ---------------------------------------------------------------------------

create function private.pruefsumme(p_text text) returns text
language sql immutable set search_path = ''
as $$ select encode(extensions.digest(p_text, 'sha256'), 'hex') $$;

-- Findet das Geraet zu einem Schluessel. Unbekannter Schluessel: Fehler.
create function private.geraet_zu_schluessel(p_schluessel text) returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_schluessel is null or char_length(p_schluessel) < 40 then
    raise exception 'Unbekannter Geräte-Schlüssel' using errcode = '28000';
  end if;
  select geraet_id into v_id from private.geraete_schluessel
    where pruefsumme = private.pruefsumme(p_schluessel);
  if v_id is null then
    raise exception 'Unbekannter Geräte-Schlüssel' using errcode = '28000';
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Koppeln
-- ---------------------------------------------------------------------------

-- Der Besitzer laesst sich in der App einen Code geben (gilt 10 Minuten).
create function public.kopplung_erstellen(p_name text, p_system text) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_besitzer uuid := (select auth.uid());
  v_code text;
begin
  if v_besitzer is null then
    raise exception 'Nicht angemeldet' using errcode = '28000';
  end if;
  if p_system is null or p_system not in ('windows', 'macos', 'android', 'ios') then
    raise exception 'Unbekanntes System';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 60 then
    raise exception 'Der Name muss 1 bis 60 Zeichen haben';
  end if;

  delete from private.kopplungen where gueltig_bis < now();
  if (select count(*) from private.kopplungen where besitzer = v_besitzer) >= 5 then
    raise exception 'Es sind schon 5 Kopplungscodes offen. Bitte kurz warten.';
  end if;
  if (select count(*) from public.geraete where besitzer = v_besitzer) >= 25 then
    raise exception 'Mehr als 25 Geräte gehen nicht';
  end if;

  -- 8 Ziffern aus sicherem Zufall
  v_code := lpad((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 100000000)::text, 8, '0');
  insert into private.kopplungen (pruefsumme, besitzer, name, system, gueltig_bis)
    values (private.pruefsumme(v_code), v_besitzer, btrim(p_name), p_system, now() + interval '10 minutes');
  return v_code;
end $$;

-- Das neue Geraet loest den Code ein und bekommt einmalig seinen Schluessel.
create function public.agent_kopple(p_code text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_code text := regexp_replace(coalesce(p_code, ''), '\D', '', 'g');
  v_kopplung private.kopplungen%rowtype;
  v_geraet uuid;
  v_schluessel text;
begin
  delete from private.kopplung_fehlversuche where zeit < now() - interval '10 minutes';
  -- Bremse: nach 20 falschen Codes in 10 Minuten ist Koppeln fuer alle kurz zu.
  if (select count(*) from private.kopplung_fehlversuche) >= 20 then
    raise exception 'Zu viele falsche Codes. Bitte in ein paar Minuten noch einmal versuchen.' using errcode = '54000';
  end if;

  delete from private.kopplungen
    where pruefsumme = private.pruefsumme(v_code) and gueltig_bis >= now()
    returning * into v_kopplung;
  if v_kopplung.pruefsumme is null then
    insert into private.kopplung_fehlversuche default values;
    return jsonb_build_object('ok', false, 'grund', 'Der Code stimmt nicht oder ist abgelaufen');
  end if;

  v_schluessel := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.geraete (besitzer, name, system)
    values (v_kopplung.besitzer, v_kopplung.name, v_kopplung.system)
    returning id into v_geraet;
  insert into private.geraete_schluessel (geraet_id, pruefsumme)
    values (v_geraet, private.pruefsumme(v_schluessel));
  insert into public.ereignisse (geraet_id, art, inhalt)
    values (v_geraet, 'gekoppelt', 'Gerät gekoppelt');

  return jsonb_build_object('ok', true, 'geraet_id', v_geraet, 'schluessel', v_schluessel,
                            'name', v_kopplung.name, 'system', v_kopplung.system);
end $$;

-- ---------------------------------------------------------------------------
-- Agent: melden, Auftraege holen, bestaetigen
-- ---------------------------------------------------------------------------

create function public.agent_melde(p_schluessel text, p_meldung jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_geraet uuid := private.geraet_zu_schluessel(p_schluessel);
  v_stufe text := p_meldung #>> '{ampel,stufe}';
  v_fund jsonb;
  v_eintrag jsonb;
  v_neu boolean;
begin
  if p_meldung is null or jsonb_typeof(p_meldung) <> 'object' then
    raise exception 'Die Meldung ist leer';
  end if;
  if pg_column_size(p_meldung) > 300000 then
    raise exception 'Die Meldung ist zu groß';
  end if;

  update public.geraete set
    zuletzt_gesehen = now(),
    version = left(p_meldung ->> 'version', 20),
    ampel = case when v_stufe in ('ok', 'warnung', 'kritisch') then v_stufe else 'unbekannt' end,
    ampel_gruende = case when jsonb_typeof(p_meldung #> '{ampel,gruende}') = 'array'
                         then p_meldung #> '{ampel,gruende}' else '[]'::jsonb end,
    status = case when jsonb_typeof(p_meldung -> 'status') = 'object' then p_meldung -> 'status' else null end,
    offene_funde = greatest(0, least(100000, coalesce((p_meldung ->> 'offeneFunde')::integer, 0))),
    scan_laeuft = coalesce((p_meldung ->> 'scanLaeuft')::boolean, false)
  where id = v_geraet;

  if jsonb_typeof(p_meldung -> 'neueFunde') = 'array' then
    for v_fund in select value from jsonb_array_elements(p_meldung -> 'neueFunde') limit 200 loop
      insert into public.funde (geraet_id, schluessel, name, schwere, zustand, offen, pfade, erkannt)
      values (
        v_geraet,
        left(coalesce(nullif(v_fund ->> 'id', ''), (v_fund ->> 'threatId') || '|' || (v_fund ->> 'zeit'), 'ohne-kennung'), 200),
        left(coalesce(v_fund ->> 'name', 'Unbekannte Bedrohung'), 200),
        left(v_fund ->> 'schwere', 20),
        left(v_fund ->> 'zustand', 40),
        coalesce((v_fund ->> 'offen')::boolean, true),
        case when jsonb_typeof(v_fund -> 'pfade') = 'array' then v_fund -> 'pfade' else '[]'::jsonb end,
        nullif(v_fund ->> 'zeit', '')::timestamptz
      )
      on conflict (geraet_id, schluessel) do update
        set zustand = excluded.zustand, offen = excluded.offen
      returning (xmax = 0) into v_neu;
      if v_neu then
        insert into public.ereignisse (geraet_id, art, inhalt)
          values (v_geraet, 'fund', left(coalesce(v_fund ->> 'name', 'Unbekannte Bedrohung'), 200));
      end if;
    end loop;
  end if;

  if jsonb_typeof(p_meldung #> '{autostart,neu}') = 'array' then
    for v_eintrag in select value from jsonb_array_elements(p_meldung #> '{autostart,neu}') limit 50 loop
      insert into public.ereignisse (geraet_id, art, inhalt)
        values (v_geraet, 'autostart', left('Neuer Autostart-Eintrag: ' || coalesce(v_eintrag ->> 'name', '?'), 200));
    end loop;
  end if;

  -- Aufraeumen: Ereignisse und erledigte Auftraege nach 90 Tagen weg.
  delete from public.ereignisse where geraet_id = v_geraet and zeit < now() - interval '90 days';
  delete from public.auftraege where geraet_id = v_geraet and erledigt_am < now() - interval '90 days';

  return jsonb_build_object('ok', true);
end $$;

create function public.agent_auftraege(p_schluessel text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_geraet uuid := private.geraet_zu_schluessel(p_schluessel);
  v_liste jsonb;
begin
  -- Auftraege, die seit einem Tag niemand abgeholt hat, verfallen.
  update public.auftraege set zustand = 'fehlgeschlagen', erledigt_am = now(),
         ergebnis = jsonb_build_object('grund', 'Nicht rechtzeitig abgeholt')
    where geraet_id = v_geraet and zustand = 'offen' and erstellt < now() - interval '1 day';

  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'art', a.art) order by a.erstellt), '[]'::jsonb)
    into v_liste
    from public.auftraege a
    where a.geraet_id = v_geraet and a.zustand in ('offen', 'laeuft');

  update public.auftraege set zustand = 'laeuft'
    where geraet_id = v_geraet and zustand = 'offen';
  return v_liste;
end $$;

create function public.agent_bestaetige(p_schluessel text, p_auftrag uuid, p_ergebnis jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_geraet uuid := private.geraet_zu_schluessel(p_schluessel);
  v_zustand text := p_ergebnis ->> 'zustand';
  v_treffer integer;
begin
  if v_zustand is null or v_zustand not in ('erledigt', 'abgelehnt', 'fehlgeschlagen') then
    raise exception 'Unbekannter Zustand';
  end if;
  if pg_column_size(p_ergebnis) > 20000 then
    raise exception 'Das Ergebnis ist zu groß';
  end if;
  update public.auftraege
    set zustand = v_zustand, ergebnis = p_ergebnis, erledigt_am = now()
    where id = p_auftrag and geraet_id = v_geraet and zustand in ('offen', 'laeuft');
  get diagnostics v_treffer = row_count;
  return jsonb_build_object('ok', v_treffer = 1);
end $$;

-- ---------------------------------------------------------------------------
-- Wer welche Funktion aufrufen darf
-- ---------------------------------------------------------------------------

revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.kopplung_erstellen(text, text) from public, anon, authenticated;
revoke all on function public.agent_kopple(text) from public, anon, authenticated;
revoke all on function public.agent_melde(text, jsonb) from public, anon, authenticated;
revoke all on function public.agent_auftraege(text) from public, anon, authenticated;
revoke all on function public.agent_bestaetige(text, uuid, jsonb) from public, anon, authenticated;

grant execute on function public.kopplung_erstellen(text, text) to authenticated;
grant execute on function public.agent_kopple(text) to anon, authenticated;
grant execute on function public.agent_melde(text, jsonb) to anon, authenticated;
grant execute on function public.agent_auftraege(text) to anon, authenticated;
grant execute on function public.agent_bestaetige(text, uuid, jsonb) to anon, authenticated;

alter default privileges in schema private revoke all on tables from anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;
