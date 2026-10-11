-- Google Popup Builder Café — Cloud SQL (PostgreSQL 18) schema + seed
create extension if not exists pgcrypto;

drop table if exists order_items cascade;
drop table if exists orders cascade;
drop table if exists reviews cascade;
drop table if exists events cascade;
drop table if exists subscribers cascade;
drop table if exists menu_items cascade;
drop table if exists users cascade;

create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  name text not null,
  role text not null default 'visitor' check (role in ('visitor','owner','host')),
  created_at timestamptz default now()
);

create table menu_items (
  id text primary key,
  name text not null,
  category text not null,
  price int not null,
  tags text[] default '{}',
  description text default '',
  emoji text default '☕',
  prep_mins int default 4,
  popular boolean default false,
  stock_qty int default 50,
  active boolean default true
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  user_id uuid references users(id) on delete set null,
  status text not null default 'new' check (status in ('new','preparing','ready','done','cancelled')),
  channel text not null default 'manual' check (channel in ('ai','manual')),
  total int not null default 0,
  eta_mins int default 5,
  created_at timestamptz default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  menu_item_id text references menu_items(id),
  name text not null,
  qty int not null default 1,
  price int not null
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  rating int not null check (rating between 1 and 5),
  text text not null,
  sentiment text default 'neutral',
  created_at timestamptz default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  host_name text not null,
  host_email text not null,
  title text not null,
  event_date date,
  floor int default 3,
  guests int default 20,
  notes text default '',
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now()
);

create table subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

-- ── Seed: users (owner + demo host) ─────────────────────────────
insert into users (email, password_hash, name, role) values
  ('owner@googlepopup.cafe', crypt('owner123', gen_salt('bf')), 'Café Owner', 'owner'),
  ('host@demo.com',          crypt('host123',  gen_salt('bf')), 'Event Host', 'host')
on conflict (email) do nothing;

-- ── Seed: menu ──────────────────────────────────────────────────
insert into menu_items (id,name,category,price,tags,description,emoji,prep_mins,popular,stock_qty) values
 ('m1','Signature Flat White','Espresso',220,'{hot,dairy,balanced}','Double ristretto, silky micro-foam. Our house pour.','☕',4,true,40),
 ('m2','Caramel Cloud Latte','Espresso',260,'{hot,sweet,dairy}','Slow-cooked caramel, airy steamed milk, sea salt.','🍮',5,true,30),
 ('m3','Cortado','Espresso',190,'{hot,strong,dairy}','Equal parts espresso and warm milk. Bold, not bitter.','☕',3,false,50),
 ('m4','Pour-Over Single Origin','Brewed',240,'{hot,black,vegan,fruity}','Ethiopia Yirgacheffe — jasmine, stone fruit, tea-like.','🫖',6,true,25),
 ('m5','Cold Brew Reserve','Cold',250,'{iced,black,strong,vegan}','18-hour steep. Smooth, chocolatey, low-acid.','🧊',2,true,35),
 ('m6','Iced Hazelnut Shaken','Cold',270,'{iced,sweet,dairy}','Shaken espresso, toasted hazelnut, oat or dairy milk.','🥤',3,false,28),
 ('m7','Matcha Latte','Tea',280,'{hot,iced,sweet,vegan,dairy-free}','Ceremonial-grade matcha, oat milk, light honey.','🍵',4,false,20),
 ('m8','Masala Chai','Tea',160,'{hot,spiced,dairy}','Hand-ground spices, Assam black tea, slow-simmered.','🫖',5,true,45),
 ('m9','Almond Croissant','Bites',180,'{sweet,bake}','Butter-laminated, almond frangipane, toasted flakes.','🥐',1,false,15),
 ('m10','Dark Choc Cookie','Bites',120,'{sweet,vegan,bake}','70% cocoa, sea salt, gooey centre. Vegan.','🍪',1,false,22),
 ('m11','Affogato','Cold',230,'{sweet,dairy,dessert}','Vanilla bean gelato drowned in a hot espresso shot.','🍨',2,false,18),
 ('m12','Spanish Latte','Espresso',250,'{hot,sweet,dairy}','Condensed milk, espresso, a whisper of cinnamon.','☕',4,false,26)
on conflict (id) do nothing;

-- ── Seed: reviews ───────────────────────────────────────────────
insert into reviews (customer_name,rating,text,sentiment) values
 ('Ananya',5,'Ordered by just telling the AI my mood. Cold brew rec was perfect.','positive'),
 ('Rahul',5,'Wait-time was spot on. Grabbed my flat white with zero queue.','positive'),
 ('Priya',4,'The vegan cookie suggestion was unreal. Felt personal.','positive'),
 ('Karthik',5,'Asked for strong, not bitter — got a cortado. Nailed it.','positive'),
 ('Meera',3,'Loved the matcha but the third floor was a bit noisy.','neutral')
on conflict do nothing;

-- ── Seed: one sample event request + one live order ─────────────
insert into events (host_name,host_email,title,event_date,floor,guests,notes,status) values
 ('Hack2Skill','events@hack2skill.com','Builder Pop-Up Meetup',current_date + 7,3,60,'Need projector + 60 cold brews','pending')
on conflict do nothing;
