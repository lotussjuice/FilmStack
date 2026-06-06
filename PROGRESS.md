# FilmStack - Plan de Implementacion y Progreso

## FASE 1: Refactorizacion Arquitectonica
- [x] MovieDetailModal -> features/backlog/components/movie-detail-modal/ (TS, HTML, CSS)
- [x] EditMovieModal -> features/backlog/components/edit-movie-modal/ (TS, HTML, CSS)
- [x] AddMovieModal -> features/search/components/add-movie-modal/ (TS, HTML, CSS)
- [x] Actualizar imports en backlog.ts
- [x] Actualizar imports en search.ts
- [x] ConfirmModal queda en shared/ (es global)
- [x] Eliminar duplicados en shared/components/ (limpieza completada)

## FASE 2: Sistema de Diseno (CSS + Tipografia)
- [x] index.html: Google Fonts (Lobster, Nunito, Alkatra)
- [x] styles.css: Variables CSS nuevas, tipografia, overrides Bootstrap
- [x] Reemplazar Bootswatch Sandstone por paleta FilmStack
- [x] Reconciliar templates existentes con nuevas clases
- [x] angular.json: budget CSS actualizado a 6kB/10kB

## FASE 3: Esquema PocketBase
- [x] Migracion 1715200050: users.friends + friend_requests_sent/received
- [x] Migracion 1715200060: coleccion watchparties (nueva)
- [x] Migracion 1715200070: coleccion group_reviews (nueva, para resenas grupales)

## FASE 4: Features Core
### Feature A: Social Share (Exportacion de Resenas)
- [x] core/services/export.service.ts (html2canvas)
- [x] features/backlog/components/review-share-card/ (tarjeta oculta estilizada)
- [x] Boton "Exportar Resena" en EditMovieModal
- [x] html2canvas instalado en package.json

### Feature B: Motor de Decision (Ruleta)
- [x] core/services/active-session.service.ts (LocalStorage via effect)
- [x] features/roulette/ (componente con modo dual pending/rewatch)
- [x] features/roulette/components/roulette-result-modal/
- [x] features/roulette/components/active-session-banner/ (integrado en sidebar)
- [x] Animacion CSS @keyframes wheel-spin
- [x] Ruta /roulette en app.routes.ts
- [x] Enlace en sidebar

### Feature C: Modulo Social y Watchparty
- [x] core/services/social.service.ts (CRUD amigos + busqueda exacta)
- [x] core/services/watchparty.service.ts (PB realtime + votacion)
- [x] features/social/ (pestana con tabs Amigos/Watchparty)
- [x] features/social/components/friend-search/ (busqueda exacta)
- [x] features/social/components/friend-list/
- [x] features/social/components/friend-requests/
- [x] features/social/components/watchparty/ (split layout ruleta + chat)
- [x] features/social/components/watchparty/components/chat-panel/ (con propuestas como widgets)
- [x] features/social/components/watchparty/components/group-roulette/ (con Watchparty Directa)
- [x] features/social/components/watchparty/components/sync-modal/ (Aceptar/Negar)
- [x] features/social/components/watchparty/components/group-review-modal/ (calificacion grupal en vivo)
- [x] Votacion democratica 30s timer
- [x] Ruta /social en app.routes.ts
- [x] Enlace Social en sidebar

## Decisiones Tomadas
- Font display: Lobster (confirmado por usuario)
- ConfirmModal: se queda en shared/
- Reviews: campo existente en movies + nueva coleccion group_reviews para grupales
- Watchparty: implementada con chat sincronizado y propuestas democraticas
- Variable CSS usan prefijo --color- (no --)
- html2canvas cargado via import dinamico (lazy)

## Estructura final de directorios (frontend)
```
src/app/
├── core/
│   ├── guards/
│   └── services/
│       ├── active-session.service.ts (NUEVO)
│       ├── auth.service.ts
│       ├── export.service.ts (NUEVO)
│       ├── film-repository.service.ts
│       ├── pocketbase.service.ts
│       ├── social.service.ts (NUEVO)
│       ├── tmdb.service.ts
│       └── watchparty.service.ts (NUEVO)
├── features/
│   ├── admin/users/
│   ├── auth/login/
│   ├── backlog/
│   │   ├── components/
│   │   │   ├── edit-movie-modal/
│   │   │   ├── movie-detail-modal/
│   │   │   └── review-share-card/ (NUEVO)
│   │   └── backlog.{ts,html,css}
│   ├── movie-detail/
│   ├── profile/
│   ├── roulette/ (NUEVO)
│   │   ├── components/
│   │   │   ├── active-session-banner/
│   │   │   └── roulette-result-modal/
│   │   └── roulette.{ts,html,css}
│   ├── search/
│   │   ├── components/add-movie-modal/
│   │   └── search.{ts,html,css}
│   └── social/ (NUEVO)
│       ├── components/
│       │   ├── friend-list/
│       │   ├── friend-requests/
│       │   ├── friend-search/
│       │   └── watchparty/
│       │       └── components/
│       │           ├── chat-panel/
│       │           ├── group-review-modal/
│       │           ├── group-roulette/
│       │           └── sync-modal/
│       └── social.{ts,html,css}
├── models/
│   ├── movie.model.ts
│   └── social.model.ts (NUEVO)
└── shared/
    ├── components/
    │   └── confirm-modal/
    └── pipes/
```

## Estructura final (backend)
```
backend/pb_migrations/
├── 1715200000_collections.js
├── 1715200001_update_users.js
├── 1715200002_movies_schema_fix.js
├── 1715200040_rankings_v5.js
├── 1715200050_users_friends.js (NUEVO)
├── 1715200060_watchparties.js (NUEVO)
└── 1715200070_group_reviews.js (NUEVO)
```
