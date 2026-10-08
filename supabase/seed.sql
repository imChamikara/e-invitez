-- Sample data. Sign up once in the app first, then run this in the SQL editor.
-- It attaches a published sample event to the earliest registered user.

do $$
declare
  owner uuid;
  ev uuid;
begin
  select id into owner from public.profiles order by created_at limit 1;
  if owner is null then
    raise notice 'No users yet – sign up in the app, then re-run seed.sql';
    return;
  end if;

  delete from public.events where slug = 'nimal-weds-sachini';

  insert into public.events (owner_id, slug, occasion_type, title, template_key, language_default,
    event_date, venue_name, venue_address, maps_url, story, theme, translations, is_published)
  values (owner, 'nimal-weds-sachini', 'wedding', 'Nimal & Sachini', 'classic-wedding', 'en',
    '2027-02-14 10:30:00+05:30', 'Galadari Hotel', '64 Lotus Road, Colombo 01',
    'https://maps.google.com/?q=Galadari+Hotel+Colombo',
    'We met at university and have been inseparable since. With the blessings of our families, we invite you to celebrate the start of our life together.',
    '{"accent":"#b8892f","fontPair":"serif"}',
    '{"si":{"title":"නිමල් සහ සචිනි","story":"අපගේ දෙමාපියන්ගේ ආශීර්වාදයෙන් අපගේ නව ජීවිතයේ ආරම්භය සමරන්නට ඔබ සැමට සාදරයෙන් ආරාධනා කරමු."},
             "ta":{"title":"நிமல் & சசினி","story":"எங்கள் குடும்பத்தினரின் ஆசியுடன் எங்கள் புதிய வாழ்க்கையின் தொடக்கத்தைக் கொண்டாட உங்களை அன்புடன் அழைக்கிறோம்."}}',
    true)
  returning id into ev;

  insert into public.event_sections (event_id, title, starts_at, description, sort_order) values
    (ev, 'Poruwa Ceremony', '2027-02-14 09:30:00+05:30', 'Traditional Poruwa rituals', 1),
    (ev, 'Registration', '2027-02-14 10:30:00+05:30', '', 2),
    (ev, 'Wedding Lunch', '2027-02-14 12:30:00+05:30', 'Lunch for all guests', 3);

  insert into public.guests (event_id, name, expected_count, token) values
    (ev, 'Kamal Perera', 4, 'demo-kamal'),
    (ev, 'Nadeesha Fernando', 2, 'demo-nadeesha');

  insert into public.wishes (event_id, name, message) values
    (ev, 'Aunty Malani', 'May your life together be full of love and happiness!');
end $$;
