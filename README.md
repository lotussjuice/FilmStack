# FilmStack

FilmStack es una plataforma web social para la gestión de catálogos cinematográficos propios (_watchlist_). Permite organizar películas, resolver la indecisión de qué ver, compartir reseñas con amigos y llevar registro de tu opinión sobre cada película.

---

## Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Frontend** | Angular 21 · TypeScript 5.7 · Bootstrap 5 · Signals API |
| **Backend** | PocketBase 0.25.3 (Go) — API REST + base de datos SQLite |
| **Gateway** | Nginx (reverse proxy) |
| **Contenedores** | Docker Compose |
| **Fuente de datos** | TMDB API (The Movie Database) |

---

## Despliegue con Docker

### Prerrequisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo.
- Archivo `.env` en la raíz del proyecto con tu TMDB API Key.

### Obtener TMDB API Key

1. Creá una cuenta en [TMDB](https://www.themoviedb.org/)
2. Andá a [Settings → API](https://www.themoviedb.org/settings/api)
3. Solicitá una API Key (plan gratuito)
4. Copiá el `.env.example` a `.env` y poné tu key:

```bash
cp .env.example .env
# Editá .env y reemplazá tu_api_key_aqui con tu key real
```

### Levantar el proyecto

```bash
docker compose up --build
```

Esto construirá las imágenes y levantará los 3 servicios:

| Servicio | Descripción | Puerto expuesto |
| :--- | :--- | :--- |
| `frontend` | App Angular compilada y servida con Nginx | — (interno) |
| `backend` | PocketBase (API + base de datos SQLite) | — (interno) |
| `gateway` | Nginx reverse proxy que unifica todo | **8090** |

Una vez arriba, accedé a la aplicación en: **http://localhost:8090**

El panel de administración de PocketBase está disponible en: **http://localhost:8090/_/_**

### Prueba rápida

```bash
# Verificar que los contenedores estén corriendo
docker compose ps

# Ver logs del backend
docker compose logs backend

# Ver logs del frontend
docker compose logs frontend
```

### Reconstruir el proyecto

```bash
docker compose up --build
```

Para forzar una reconstrucción completa sin caché:

```bash
docker compose build --no-cache
docker compose up
```

### Detener el proyecto

```bash
docker compose down
```

Para detener y eliminar los volúmenes (⚠️ borra la base de datos local):

```bash
docker compose down -v
```

---

## Arquitectura del Frontend (DDD + Clean Architecture)

El frontend sigue una **Arquitectura Domain-Driven Design (DDD)** con Clean Architecture, dividiendo el código en tres capas principales:

```
src/
└── app/
    ├── core/                              # Capa de infraestructura global
    │   ├── guards/                        # AuthGuard (protección de rutas)
    │   ├── interfaces/                    # Interfaces compartidas (Movie, User, etc.)
    │   └── services/                      # Servicios globales singleton
    │       ├── auth.service.ts            # Autenticación JWT + gestión de sesión
    │       ├── pocketbase.service.ts      # Conexión a PocketBase (singleton)
    │       ├── film-repository.service.ts # Repositorio de películas (híbrido PB+TMDB)
    │       ├── watchparty.service.ts      # Lógica de watchparty
    │       ├── social.service.ts          # Amigos y solicitudes
    │       ├── toast.service.ts           # Notificaciones toast globales
    │       ├── export.service.ts          # Exportación de reseñas a PNG
    │       ├── tmdb.service.ts            # Consultas a API de TMDB
    │       ├── user.service.ts            # Operaciones de perfil de usuario
    │       └── active-session.service.ts  # Sesión activa de reproducción
    │
    ├── features/                          # Módulos por dominio de negocio
    │   ├── auth/
    │   │   └── components/login/          # Formulario de inicio de sesión
    │   ├── backlog/
    │   │   └── components/
    │   │       ├── backlog-view/          # CRUD de backlog personal
    │   │       ├── backlog-card/          # Tarjeta presentacional de película
    │   │       └── movie-detail-modal/    # Modal de detalle
    │   ├── search/
    │   │   └── components/
    │   │       ├── search-view/           # Búsqueda en TMDB
    │   │       └── add-movie-modal/       # Modal de añadir al backlog
    │   ├── roulette/
    │   │   └── components/roulette-view/  # Ruleta de selección aleatoria
    │   ├── social/
    │   │   ├── interfaces/                # Interfaces de dominio social
    │   │   └── components/
    │   │       ├── social-view/           # Gestión de amigos
    │   │       ├── watchparty/
    │   │       │   └── components/
    │   │       │       ├── watchparty-view/        # Sala de watchparty
    │   │       │       ├── chat-panel/             # Chat en tiempo real
    │   │       │       ├── group-roulette/         # Ruleta grupal
    │   │       │       ├── sync-modal/             # Modal de sincronización
    │   │       │       └── group-review-modal/     # Reseña grupal
    │   │       └── watchparty-history/
    │   │           └── components/
    │   │               └── watchparty-history-view/ # Historial de sesiones
    │   ├── profile/
    │   │   └── components/profile-view/   # Edición de perfil
    │   └── admin/
    │       └── users/components/users-view/  # Panel de administración
    │
    └── shared/                            # Componentes reutilizables
        └── components/
            ├── toast-container/           # Contenedor de notificaciones
            ├── confirm-modal/             # Confirmación genérica
            ├── edit-movie-modal/          # Modal de edición de película
            └── review-share-card/         # Tarjeta de reseña para exportar
```

### Principios aplicados

- **Standalone Components**: Todos los componentes son independientes, sin NgModules.
- **Signals API**: Estado reactivo mediante signals y computed, sin Zone.js tradicional.
- **Inyección de Dependencias**: Los componentes nunca inyectan `PocketbaseService` directamente; usan servicios de dominio intermedios.
- **Container/Presentational Pattern**: Separación entre lógica de negocio (servicios) y presentación (componentes).
- **Feature isolation**: Cada feature es autocontenida; los componentes compartidos entre features residen en `shared/components/`.

---

## Seguridad y Autenticación (JWT)

PocketBase maneja la autenticación mediante **JSON Web Tokens (JWT)** internamente en su `authStore`. El flujo completo es:

1. **Login**: El usuario ingresa email/contraseña. `AuthService.login()` llama a `pb.collection('users').authWithPassword()`, que PocketBase resuelve validando credenciales y devolviendo un JWT firmado.

2. **Persistencia**: El token JWT se almacena en el `authStore` de PocketBase (persistido en `localStorage`). En cada recarga de página, `AuthService.initAuth()` verifica `authStore.isValid` (que internamente chequea expiración del JWT) y restaura la sesión automáticamente, o redirige al login si expiró.

3. **AuthGuard**: El guard `auth.guard.ts` usa el computed `isAuthenticated()` del `AuthService`, que combina dos condiciones:
   - `currentUser !== null` → hay un usuario cargado en memoria
   - `pb.authStore.isValid` → el JWT no ha expirado
   
   Si alguna falla, redirige a `/login`. Esto protege todas las rutas del frontend.

4. **Cierre de sesión blindado**: `AuthService.logout()` ejecuta secuencialmente:
   - `activeSession.discard()` → limpia la sesión de ruleta activa
   - `pb.authStore.clear()` → elimina el JWT del almacenamiento
   - `currentUser.set(null)` → limpia el estado en memoria
   - `router.navigate(['/login'])` → redirige forzosamente

5. **Cuentas suspendidas**: En cada login, se verifica el flag `user.deleted`. Si está activo, se fuerza el logout y se lanza error.

6. **Protección de UI**: Los botones de navegación y "Cerrar Sesión" están protegidos por directivas `@if (auth.isAuthenticated())`, asegurando que solo usuarios autenticados vean contenido sensible.

---

## Arquitectura de Docker y Proxy Inverso

El proyecto se despliega con **3 contenedores** coordinados por `docker-compose.yml`:

```
Cliente → Gateway (Nginx, puerto 8090)
              ├── / → Frontend (Nginx, puerto 80 interno) → Angular SPA
              ├── /api/ → Backend (PocketBase, puerto 8090 interno)
              └── /_/ → Backend Admin UI
```

### Cómo se soluciona CORS

Todas las peticiones del frontend viajan al mismo origen (`http://localhost:8090`). El Nginx gateway actúa como **reverse proxy**: las rutas `/api/` y `/_/` se redirigen al backend PocketBase, mientras que `/` sirve la SPA de Angular. Como el navegador ve un único origen, **no se produce ningún error CORS**. No se requiere configuración de CORS en el backend.

### Migraciones automáticas

PocketBase se inicia con el flag `--migrationsDir=/pb_migrations`, lo que ejecuta automáticamente todas las migraciones al arrancar. Las migraciones están versionadas y se montan como volumen Docker:

```yaml
volumes:
  - ./backend/pb_migrations:/pb_migrations
```

---

## Integración Híbrida (TMDB + PocketBase)

FilmStack combina dos fuentes de datos:

1. **PocketBase (SQLite)**: Almacena datos propios de la aplicación — usuarios, backlog de películas, calificaciones, reseñas, watchparties, amigos. Es la fuente de verdad para el estado de la aplicación.

2. **TMDB API**: Proporciona metadatos enriquecidos de películas (título, póster, sinopsis, créditos, géneros). Se consulta mediante el hook `/api/tmdb/*` que actúa como proxy del lado del servidor.

La unificación ocurre en `FilmRepositoryService` mediante un `computed` que combina:
- Datos de PocketBase (status, rating, review, etc.)
- Detalles de TMDB (título, póster, año, etc.)
- Estadísticas de la comunidad (promedio de ratings globales)

El hook de PocketBase (`pb_hooks/tmdb.pb.js`) recibe la API Key desde la variable de entorno `TMDB_API_KEY`, evitando exponerla al frontend.

---

## Formularios y Validaciones

Todos los formularios incluyen validación con feedback visual claro:

| Formulario | Campos validados | Retroalimentación |
| :--- | :--- | :--- |
| **Login** | Email (formato), Contraseña (mín. 6 caracteres) | Clase `is-invalid`, mensaje en rojo por campo, alerta de error general |
| **Perfil** | Nombre (mín. 3 caracteres), Email (formato) | Clase `is-invalid`, mensaje en rojo por campo |
| **Añadir película** | Calificación (requerida si estado "Vista") | Clase `is-invalid`, mensaje de error en rojo |
| **Editar película** | Calificación (requerida si estado "Vista") | Clase `is-invalid`, mensaje de error en rojo |

### Manejo de Errores Global

Todos los bloques `catch` en servicios y componentes notifican al usuario mediante el `ToastService`, que muestra notificaciones no obstructivas con tipos success/error/info/warning. Los errores de conexión, credenciales inválidas y fallos de operaciones críticas se comunican siempre al usuario con mensajes amigables.

---

## Funcionalidades

| Función | Descripción |
| :--- | :--- |
| **Autenticación** | Login con email/contraseña, manejo de sesión con JWT, detección de cuentas suspendidas |
| **Búsqueda TMDB** | Buscar películas, filtrar por género/año/rating, ver detalles |
| **Backlog** | Agregar películas con estado (pendiente/vista/abandonada), calificar con estrellas, escribir reseñas |
| **Ruleta** | Selección aleatoria de película del backlog para decidir qué ver |
| **Social** | Gestión de amigos, solicitudes, perfil público |
| **Watchparty** | Sesiones grupales de visualización con chat en tiempo real y reseñas grupales |
| **Exportar reseña** | Exportar reseña como imagen PNG para compartir |
| **Admin** | Gestión de usuarios, roles, suspensión de cuentas |

---

## Variables de Entorno

| Variable | Obligatorio | Descripción |
| :--- | :---: | :--- |
| `TMDB_API_KEY` | ✅ | API Key de The Movie Database para búsqueda y metadatos |

Ver `.env.example` para la plantilla.

---

## Estructura de Base de Datos (PocketBase)

| Colección | Propósito |
| :--- | :--- |
| `users` | Usuarios, amigos, solicitudes, roles |
| `movies` | Backlog de películas por usuario |
| `rankings` | Calificaciones y reseñas de la comunidad |
| `watchparties` | Sesiones grupales de visualización |
| `group_reviews` | Reseñas grupales de watchparty |

Las migraciones se ejecutan automáticamente al iniciar PocketBase vía `--migrationsDir=/pb_migrations`.

---

## Desarrollo local (sin Docker)

```bash
cd frontend
npm install
npm start
```

El servidor de desarrollo estará disponible en **http://localhost:4200**.

> **Nota:** Necesitás tener el backend (PocketBase) corriendo por separado para que la app funcione correctamente.
