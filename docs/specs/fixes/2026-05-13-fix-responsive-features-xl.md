# Fix Spec — Responsividad completa en features hasta `xl`

Fecha: 2026-05-13  
Estado: Proposed  
Tipo: Responsive hardening

## Problema

La aplicacion no garantiza una experiencia consistente y usable en todos los features cuando el viewport cambia entre breakpoints.

Hoy existen pantallas y componentes que pueden desbordarse, cortarse, apilarse mal o perder legibilidad en anchos pequenos e intermedios. El problema no se limita a una sola vista: afecta layout, navegacion, tablas, formularios, tarjetas, modales y vistas operativas.

## Contexto

BrosValley CRM ya tiene una base funcional real y varias vistas con distinta complejidad visual:

- autenticacion;
- layout autenticado;
- dashboard o home;
- proyectos: listado, creacion, edicion y detalle;
- kanban de tareas.

Este fix debe consolidar un comportamiento responsivo uniforme usando el sistema de breakpoints de Ant Design hasta `xl`, de forma que cada feature sea usable y visualmente estable en:

- `xs`;
- `sm`;
- `md`;
- `lg`;
- `xl`.

## Objetivo

Garantizar que todos los features actuales sean completamente responsivos y funcionales en los breakpoints de Ant Design hasta `xl`, sin recortes, solapamientos, scroll horizontal accidental ni perdida de acciones clave.

## Comportamiento actual

- el layout global no asegura una jerarquia estable en todos los anchos;
- algunos headers, titulos y bloques de contenido se recortan o se enciman;
- hay vistas con riesgo de overflow horizontal;
- tablas, cards, formularios y acciones no siguen una estrategia responsiva unificada;
- modales, drawers o paneles secundarios pueden quedar demasiado grandes o poco usables en pantallas chicas;
- ciertas zonas dependen mas de estilos fijos que de reglas adaptativas.

## Comportamiento esperado

- cada feature debe mantener usabilidad completa desde `xs` hasta `xl`;
- no debe existir texto principal cortado o desplazado fuera de su contenedor visible;
- no debe existir scroll horizontal del viewport salvo en contenedores intencionales y controlados;
- acciones primarias y secundarias deben seguir visibles o reubicarse de forma natural segun el ancho;
- tablas densas deben degradar elegantemente a scroll interno, cards apiladas o composiciones equivalentes;
- formularios deben reorganizar campos, labels, botones y bloques auxiliares sin romper lectura ni flujo;
- modales y drawers deben adaptarse al viewport y conservar accesibilidad operativa;
- el layout autenticado debe mantener navegacion, topbar y contenido principal sin colisiones visuales.

## Alcance

- `src/components/layout/*`
- `src/components/ui/AuthShell.tsx`
- `src/styles/app.css`
- `src/theme.ts`
- `src/pages/home/index.tsx`
- `src/pages/projects/list.tsx`
- `src/pages/projects/create.tsx`
- `src/pages/projects/edit.tsx`
- `src/pages/projects/show.tsx`
- `src/pages/projects/ProjectForm.tsx`
- `src/pages/kanban/index.tsx`
- `src/pages/login/index.tsx`
- `src/pages/register/index.tsx`
- `src/pages/forgotPassword/index.tsx`
- `src/pages/updatePassword/index.tsx`

## Fuera de alcance

- agregar features nuevas;
- rediseñar branding o identidad visual completa;
- cambiar reglas de negocio;
- rehacer navegacion o arquitectura de rutas;
- optimizaciones de performance no relacionadas con responsividad;
- soporte especifico para `xxl` como criterio de cierre de este fix.

## Breakpoints de referencia

Este fix debe basarse en los breakpoints semanticos de Ant Design:

- `xs`: movil pequeno;
- `sm`: movil amplio;
- `md`: tablet o viewport intermedio;
- `lg`: laptop compacta;
- `xl`: escritorio estandar.

La implementacion debe usar de preferencia primitives del sistema ya disponible:

- `Grid`;
- `Row` y `Col`;
- `Flex` o `Space` cuando aplique;
- `useBreakpoint`;
- props responsivas de Ant Design;
- media queries solo cuando el sistema existente no cubra el caso.

## Cobertura funcional requerida

### 1. Layout autenticado

- sidebar usable en anchos chicos e intermedios;
- topbar sin textos recortados ni bloques superpuestos;
- area de contenido con paddings adaptativos;
- comportamiento consistente entre menu, titulo, usuario actual y contenido principal.

### 2. Pantallas de autenticacion

- login;
- registro;
- forgot password;
- update password.

Cada pantalla debe:

- mantener legibilidad y jerarquia clara en `xs` y `sm`;
- evitar columnas demasiado anchas o demasiado comprimidas;
- apilar panel informativo y formulario cuando corresponda;
- mantener botones, links y campos sin overflow.

### 3. Home o dashboard

- hero principal;
- metricas;
- listas;
- bloques resumen;
- acciones secundarias.

Cada bloque debe:

- pasar de composiciones multicolumna a stacking vertical cuando sea necesario;
- preservar espaciado, contraste y orden de lectura;
- evitar cards truncadas o metricas fuera de viewport.

### 4. Proyectos

#### Listado

- filtros;
- acciones de cabecera;
- tabla o lista;
- botones por fila.

Debe contemplar:

- estrategia responsiva para columnas;
- fallback de scroll interno o simplificacion visual controlada;
- acciones accesibles sin romper filas.

#### Crear y editar

- formulario principal;
- selects;
- date pickers;
- secciones auxiliares;
- footer de acciones.

Debe contemplar:

- reorganizacion de columnas a una sola columna en breakpoints chicos;
- labels y ayuda legibles;
- acciones finales visibles y alcanzables.

#### Detalle

- metadatos del proyecto;
- miembros;
- tareas relacionadas;
- acciones de navegacion.

Debe contemplar:

- stacking progresivo;
- tablas o listas con comportamiento estable;
- cabecera de detalle sin saturacion horizontal.

### 5. Kanban

- filtros de proyecto;
- resumen de contexto;
- columnas;
- tarjetas;
- preview lateral o panel secundario;
- modal de alta;
- modal o drawer de detalle.

Debe contemplar:

- estrategia clara para `xs` y `sm` donde cuatro columnas completas ya no caben simultaneamente;
- scroll horizontal controlado solo dentro del contenedor del tablero si se decide conservar columnas;
- alternativa valida de compactacion o apilado si mejora operacion;
- formularios y previews adaptados a viewport reducido;
- drag and drop usable sin ocultar contenido critico.

## Reglas de implementacion esperadas

- evitar anchos fijos innecesarios;
- reemplazar alturas rigidas que corten contenido;
- usar `max-width`, `min-width`, wrapping y stacking de forma intencional;
- convertir paddings y gaps a escalas responsivas;
- usar tipografia y jerarquia visual que sigan siendo legibles en `xs` y `sm`;
- revisar contenedores con `overflow`, especialmente en tablas, kanban y headers;
- priorizar accesibilidad operativa sobre simetria visual.

## Criterios de aceptacion

- todas las rutas actuales son utilizables en `xs`, `sm`, `md`, `lg` y `xl`;
- no hay solapamientos entre header, sider, cards, formularios y acciones;
- no hay texto principal cortado en topbar, paneles, cards, botones ni modales;
- no hay scroll horizontal de pagina completo en las vistas autenticadas ni publicas;
- si una tabla o tablero requiere overflow, este queda encapsulado en su contenedor y sigue siendo usable;
- crear, editar y navegar proyectos sigue siendo posible en todos los breakpoints objetivo;
- crear, mover, abrir y editar tareas en kanban sigue siendo posible en todos los breakpoints objetivo;
- las pantallas de autenticacion conservan un flujo limpio y legible en movil;
- los cambios no introducen warnings de tipos ni errores evidentes de layout.

## Impacto tecnico esperado

- refactor de estilos globales y espaciados base;
- adopcion o ampliacion de utilidades responsivas en layout y paginas;
- posible sustitucion de props o estilos fijos por configuraciones responsivas de Ant Design;
- ajustes en tablas, modales, drawers y composiciones multicolumna;
- validacion visual sistematica por ruta y breakpoint.

## Riesgos

- intentar resolver todo solo con CSS global puede dejar inconsistencias por feature;
- tablas y kanban pueden requerir decisiones de UX, no solo cambios cosmeticos;
- algunos componentes de Refine y Ant Design traen estilos por defecto que pueden pelear con overrides existentes;
- una solucion demasiado puntual por pantalla puede generar deuda de mantenimiento.

## Estrategia sugerida de ejecucion

- cerrar primero layout global y auth shell;
- despues home;
- despues proyectos;
- al final kanban por ser la vista con mayor complejidad interactiva;
- validar cada modulo en `xs`, `sm`, `md`, `lg` y `xl` antes de avanzar al siguiente.

## Validacion manual sugerida

- probar `/login`, `/register`, `/forgot-password` y `/update-password` en `xs`, `md` y `xl`;
- probar `/` con metricas, listas y bloques completos en `xs`, `sm`, `lg` y `xl`;
- probar `/projects` revisando header actions, tabla, botones por fila y estados vacios;
- probar `/projects/create` y `/projects/edit/:id` revisando todos los campos y acciones finales;
- probar `/projects/show/:id` revisando metadata, miembros y tareas relacionadas;
- probar `/kanban` con datos suficientes para validar columnas, drag and drop, preview y modales;
- confirmar que no exista scroll horizontal global en ninguna pantalla;
- confirmar que el usuario puede completar los flujos principales sin zoom forzado ni elementos inaccesibles.
