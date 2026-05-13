# Fix Spec — Quitar banner de Refine

Fecha: 2026-05-13  
Estado: Proposed  
Tipo: UI cleanup

## Problema

La aplicacion muestra un banner superior de Refine con mensaje promocional sobre GitHub.

Esto genera ruido visual, rompe la sensacion de producto propio y ocupa espacio util en la parte alta de la interfaz.

## Contexto

El banner aparece en la zona superior global de la aplicacion y no aporta valor al flujo operativo del usuario final.

En un entorno de producto interno o branded, este tipo de elemento debe eliminarse para mantener una experiencia limpia y consistente con la identidad de BrosValley CRM.

## Comportamiento actual

- se renderiza un banner superior de Refine;
- el banner aparece por encima del contenido principal;
- roba altura visible al viewport;
- introduce branding externo no deseado.

## Comportamiento esperado

- el banner de Refine no debe mostrarse en ninguna pantalla de la aplicacion;
- la eliminacion no debe afectar layout, header ni rutas;
- la parte superior debe quedar limpia y alineada con el branding propio del producto.

## Alcance

- layout global de la aplicacion;
- pantallas publicas y privadas si el banner se renderiza de forma global;
- limpieza de cualquier import o componente asociado si deja de usarse.

## Fuera de alcance

- rediseño del header;
- cambios de marca adicionales;
- cambios de navegacion.

## Criterios de aceptacion

- el banner de Refine deja de renderizarse en toda la app;
- no queda espacio en blanco residual donde estaba el banner;
- el header y el contenido superior se ven correctamente despues del cambio;
- no quedan imports no usados relacionados al banner.

## Impacto tecnico esperado

- remover el componente global que inyecta el banner;
- validar que no se introduzcan warnings por imports sin usar;
- revisar visualmente login, dashboard, proyectos y kanban.

## Riesgos

- si el banner estaba condicionado por entorno o ruta, hay que confirmar que se elimina en todos los casos;
- quitarlo sin revisar layout podria dejar un espaciado superior inesperado.

## Validacion manual sugerida

- abrir login;
- abrir dashboard;
- abrir listado de proyectos;
- abrir kanban;
- confirmar que no aparece el banner y que el top spacing luce correcto.
