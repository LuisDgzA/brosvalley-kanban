# Plan de desarrollo — brosvalley-crm

Stack: **Refine + Supabase + Ant Design**
Objetivo: Login, dashboard de proyectos, kanban en tiempo real con tu propia BD.

---

## Fase 0 — Backend propio con Supabase

### Tarea 0.1 — Crear proyecto en Supabase _(manual, ~5 min)_

1. Ve a [supabase.com](https://supabase.com), crea cuenta y proyecto nuevo
2. Espera que inicialice la BD (~2 min)
3. Ve a **Settings → API** y guarda:
   - `Project URL` → será tu `VITE_SUPABASE_URL`
   - `anon public key` → será tu `VITE_SUPABASE_ANON_KEY`
4. En **Authentication → Settings**, habilita "Email/Password" sign-in

---

### Tarea 0.2 — Crear el schema en Supabase

```
Necesito crear el schema de BD para un CRM con Kanban en Supabase.
Ve a Supabase Dashboard → SQL Editor y ejecuta el siguiente SQL:

-- Tabla de perfiles (extiende auth.users de Supabase)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  email text,
  avatar_url text,
  job_title text,
  created_at timestamptz default now()
);

-- Proyectos
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  due_date date,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Miembros de proyecto
create table public.project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  unique(project_id, user_id)
);

-- Tareas
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status text default 'TODO' check (status in ('TODO','IN_PROGRESS','IN_REVIEW','DONE')),
  project_id uuid references public.projects(id) on delete cascade,
  assigned_to uuid references public.profiles(id),
  due_date date,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger para auto-crear perfil al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Habilitar RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;

-- Políticas básicas (todos los usuarios autenticados pueden leer/escribir)
create policy "authenticated full access" on public.profiles for all using (auth.role() = 'authenticated');
create policy "authenticated full access" on public.projects for all using (auth.role() = 'authenticated');
create policy "authenticated full access" on public.project_members for all using (auth.role() = 'authenticated');
create policy "authenticated full access" on public.tasks for all using (auth.role() = 'authenticated');

Dame este SQL listo para correr, y dime si algo necesita ajuste.
```

---

### Tarea 0.3 — Migrar frontend de GraphQL a Supabase

```
El proyecto brosvalley-crm usa actualmente @refinedev/nestjs-query con GraphQL
apuntando a api.crm.refine.dev (demo). Necesito migrarlo a Supabase.

1. Instala: @refinedev/supabase @supabase/supabase-js
2. Desinstala o deja de usar: @refinedev/nestjs-query (no borrar aún, solo reemplazar)
3. Crea src/providers/supabase.ts con:
   import { createClient } from "@supabase/supabase-js";
   export const supabaseClient = createClient(
     import.meta.env.VITE_SUPABASE_URL,
     import.meta.env.VITE_SUPABASE_ANON_KEY
   );
4. Reemplaza src/providers/data/index.tsx para exportar el dataProvider y
   liveProvider de @refinedev/supabase usando supabaseClient
5. Reemplaza src/providers/auth.ts para usar el authProvider de @refinedev/supabase
   — esto te da login, register, logout, check, getIdentity gratis con Supabase Auth
6. Actualiza src/providers/constants.ts para eliminar las URLs de GraphQL
7. Crea .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
   y .env.example documentado
8. Actualiza src/App.tsx para pasar los nuevos dataProvider y liveProvider
```

---

## Fase 1 — Auth & Layout

### Tarea 1 — Login y Register con Supabase Auth

```
El proyecto usa @refinedev/supabase con authProvider de Supabase
(ya configurado en src/providers/auth.ts).

1. En src/pages/login/index.tsx: formulario con email + password usando
   AuthPage de @refinedev/antd, o formulario manual con Ant Design Form.
   Debe conectarse al authProvider (login con email/password de Supabase).

2. En src/pages/register/index.tsx: formulario con name, email y password.
   El campo "name" debe pasarse en options: { data: { name } } para que
   el trigger de Supabase lo guarde en profiles automáticamente.

3. Protege las rutas privadas en src/App.tsx con <Authenticated> de Refine:
   /, /projects, /kanban deben redirigir a /login si no hay sesión.

4. En src/components/layout/CurrentUser.tsx muestra el nombre y avatar
   del usuario logueado usando useGetIdentity de Refine.

5. Agrega forgot-password en src/pages/forgotPassword/index.tsx usando
   supabaseClient.auth.resetPasswordForEmail().
```

---

## Fase 2 — Dashboard de Proyectos

### Tarea 2 — CRUD de proyectos

```
El backend es Supabase. El dataProvider es @refinedev/supabase.
Los nombres de recursos siguen el nombre de las tablas en Supabase:
"projects", "profiles", "project_members", "tasks".

En src/pages/projects/ crea:
1. list.tsx — tabla Ant Design con useTable de @refinedev/antd, recurso "projects".
   Columnas: nombre, descripción, fecha límite, miembros (avatares), acciones.
2. create.tsx y edit.tsx — formulario con useForm de @refinedev/antd:
   - nombre (input, requerido)
   - descripción (textarea)
   - fecha límite (DatePicker)
   - miembros (Select múltiple que cargue perfiles con useList({ resource: "profiles" }))
   Al guardar project_members, inserta/elimina registros en la tabla project_members.
3. show.tsx — detalle del proyecto con sus tareas listadas.

Registra las rutas en src/App.tsx con resource "projects" apuntando a estos componentes.
```

### Tarea 3 — Dashboard home con métricas

```
En src/pages/home/index.tsx crea un dashboard con Ant Design usando
useList de Refine con el dataProvider de Supabase:
- Card: total proyectos activos (resource: "projects")
- Cards de conteo de tareas por status: TODO / IN_PROGRESS / IN_REVIEW / DONE
  (resource: "tasks", filters por status)
- Tabla: mis tareas asignadas al usuario logueado
  (resource: "tasks", filter: assigned_to = currentUser.id)
- Tabla: proyectos recientes ordenados por created_at desc
Usa useGetIdentity para obtener el id del usuario logueado.
```

---

## Fase 3 — Kanban

### Tarea 4 — Tablero Kanban con drag & drop

```
El backend es Supabase. El recurso es "tasks".
Instala @dnd-kit/core y @dnd-kit/sortable si no están.

En src/pages/kanban/ crea el tablero:
1. Columnas fijas: TODO, IN_PROGRESS, IN_REVIEW, DONE
2. Carga tareas con useList({ resource: "tasks" }) — incluye join a profiles
   (assigned_to) y projects via meta: { select: "*, profiles(*), projects(name)" }
   (Supabase soporta joins en el select string)
3. Cada tarjeta muestra: título, avatar del asignado, nombre del proyecto, due_date
4. Drag & drop entre columnas usa @dnd-kit. Al soltar, ejecuta useUpdate
   para actualizar el campo status de la tarea
5. Botón "+" en cada columna abre un modal para crear tarea en ese status
```

### Tarea 5 — Modal detalle de tarea

```
En src/pages/kanban/, al hacer click en una tarjeta abre un Drawer de Ant Design.
Usa useForm({ resource: "tasks", action: "edit", id: taskId }) de @refinedev/antd.

Campos editables:
- Título (Input)
- Descripción (Input.TextArea)
- Asignado a (Select cargado con useList({ resource: "profiles" }))
- Proyecto (Select cargado con useList({ resource: "projects" }))
- Fecha límite (DatePicker)
- Status (Select con las 4 opciones)

Auto-save al cerrar el Drawer (llama form.submit() en onClose).
```

---

## Fase 4 — Tiempo Real

### Tarea 6 — Real-time con Supabase Realtime

```
El liveProvider de @refinedev/supabase ya está configurado en
src/providers/data/index.tsx. Supabase Realtime funciona via canales Postgres.

1. En Supabase Dashboard → Database → Replication, habilita "Realtime"
   para las tablas: tasks, projects, project_members (toggle en la UI).

2. En el componente del kanban (src/pages/kanban/), pasa liveMode="auto"
   al useList de tareas para que se actualice automáticamente cuando
   otro usuario mueva una tarjeta o cree una tarea.

3. En src/pages/projects/list.tsx también agrega liveMode="auto" para
   que la lista de proyectos se actualice en vivo.

4. Verifica que en src/App.tsx el liveProvider esté pasado a <Refine>.

Con esto, si el colaborador mueve una tarea en su Kanban,
tú lo ves reflejado sin recargar.
```

---

## Fase 5 — Pulido final

### Tarea 7 — Navegación y layout final

```
En src/App.tsx registra todos los resources de Refine con sus íconos y rutas:
- projects: /projects (list, create, edit, show) — ícono ProjectOutlined
- kanban: /kanban — ícono AppstoreOutlined
- home: / — ícono DashboardOutlined

En src/components/layout/index.tsx usa ThemedLayoutV2 de @refinedev/antd
con Sider que muestre los links de navegación. El item activo debe
resaltarse automáticamente (Refine lo maneja solo).

Asegúrate de que:
- El Header muestre nombre + avatar del usuario logueado + botón logout
- El Sider se colapse en mobile (responsive)
- Las páginas de auth (login, register, forgot-password) usen AuthPage
  sin el Layout principal
```

---

## Orden de ejecución

| # | Tarea | Tipo |
|---|-------|------|
| 0.1 | Crear proyecto Supabase | Manual (~5 min) |
| 0.2 | Correr SQL del schema | Prompt |
| 0.3 | Migrar frontend a Supabase | Prompt |
| 1 | Login/Register con Supabase Auth | Prompt |
| 7 | Navegación y layout | Prompt |
| 2 | CRUD Proyectos | Prompt |
| 3 | Dashboard métricas | Prompt |
| 4 | Kanban + drag & drop | Prompt |
| 5 | Modal detalle tarea | Prompt |
| 6 | Activar Realtime en Supabase | Prompt |
