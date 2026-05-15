# Auditoría Técnica Detallada: Frontend (Angular 18)

Este documento presenta una auditoría exhaustiva de los patrones, herramientas y características de Angular empleadas en el desarrollo de la interfaz de FilmStack.

## 1. Directivas y Flujo de Control
Se ha migrado totalmente al nuevo **Control Flow** de Angular para una renderización más limpia y performante.

| Directiva | Línea | Propósito | Ejemplo |
| :--- | :--- | :--- | :--- |
| `@if` | app.html L1 | Renderización condicional de usuario autenticado. | `@if (auth.isAuthenticated()) { ... }` |
| `@if / @else` | app.html L1 | Renderización con alternativa si no autentica. | `@if (...) { } @else { redirect login }` |
| `@if` | app.html L39 | Renderización condicional según rol. | `@if (auth.role() !== 'guest') { backlog }` |
| `@if` | app.html L44 | Renderización condicional de panel admin. | `@if (auth.isAdmin()) { admin }` |
| `@for` | backlog.html L14 | Iteración sobre películas con track. | `@for (movie of filteredMovies(); track movie.id)` |
| `@for / @if` | movie-detail-modal.html L38 | Iteración sobre reparto con validación. | `@if (movie().credits?.cast?.length) { @for (person of ...) }` |
| `@switch / @case` | backlog.html L30 | Selección de estado de película. | `@switch (movie.status) { @case ('pending') }` |
| `[class.active]` | backlog.html L6 | Resaltar botón de filtro activo. | `[class.active]="filterStatus() === 'pending'"` |
| `[(ngModel)]` | login.html L12 | Two-way binding en formulario. | `[(ngModel)]="email"` |

## 2. Data Binding y Signals API
FilmStack utiliza la **Signals API** para la gestión reactiva del estado, eliminando la necesidad de detección de cambios pesada.

### A. Property Binding (`[]`)
Vincula valores a atributos HTML y propiedades de componentes:

| Uso | Línea | Ejemplo |
| :--- | :--- | :--- |
| Imagen `src` | backlog.html L18 | `[src]="'https://image.tmdb.org/t/p/w200' + movie.poster_path"` |
| Atributo `title` | backlog.html L30 | `[title]="movie.tmdb_data?.title"` |
| Propiedad `disabled` | login.html L25 | `[disabled]="isLoading()"` |
| Enlace dinámico | app.html L6 | `routerLink="/"` |

### B. Event Binding (`()`)
Maneja interacciones del usuario:

| Evento | Línea | Ejemplo |
| :--- | :--- | :--- |
| Click en botón filtro | backlog.html L6 | `(click)="setFilter('pending')"` |
| Click en tarjeta | backlog.html L15 | `(click)="openEdit(movie)"` |
| Click cerrar modal | movie-detail-modal.html L10 | `(click)="onClose()"` |
| Input en búsqueda | search.html L5 | `(input)="searchQuery.set($event.target.value)"` |

### C. Signal Binding (Reactive)

| Tipo | Línea | Ejemplo |
| :--- | :--- | :--- |
| `input()` | movie-detail-modal.ts L18 | `movie = input.required<TMDbMovie>()` - recibe datos del padre |
| `output()` | add-movie-modal.ts L20 | `save = output<SaveOptions>()` - emite eventos al padre |
| `computed()` | search.ts L43 | `filteredResults = computed(() => this.searchResults().filter(...))` |
| `effect()` | search.ts L68 | `effect(() => { if (this.searchQuery()) { API call } })` |
| Lectura | app.html L1 | `{{ auth.isAuthenticated() }}` - invocación para leer valor |
| Mutación | profile.ts L45 | `this.name.set(newValue)` o `this.users.update(list => [...])` |

## 3. Signals Utilizadas

Se utiliza la **Signals API** de Angular 18 para la gestión reactiva y granular del estado en toda la aplicación, permitiendo reactividad sin necesidad de detección de cambios manual.

### Categorías de Signals

#### **A. Señales de Autenticación** (`auth.service.ts`)
| Signal | Tipo | Propósito |
| :--- | :--- | :--- |
| `currentUser` | `signal<UserModel \| null>` | Almacena el usuario autenticado actual. |
| `role` | `signal<string>` | Define el rol del usuario (`user` o `admin`). |
| `user` | `computed()` | Derivada de `currentUser`: proporciona acceso reactivo al usuario actual. |
| `isAuthenticated` | `computed()` | Derivada que verifica si existe sesión activa y válida. |
| `isAdmin` | `computed()` | Derivada que determina si el usuario tiene permisos de administrador. |

#### **B. Señales de Películas** (`film-repository.service.ts`)
| Signal | Tipo | Propósito |
| :--- | :--- | :--- |
| `moviesSignal` | `signal<HybridMovie[]>` | Almacena la lista de películas del usuario (datos de PocketBase). |
| `tmdbDetailsSignal` | `signal<Map<number, TMDbMovie>>` | Caché de detalles detallados desde TMDB indexados por `tmdb_id`. |
| `statsSignal` | `signal<Map<number, MovieStats>>` | Almacena estadísticas de películas (notas, reseñas, estado). |

#### **C. Señales de Búsqueda** (`search.ts`)
| Signal | Tipo | Propósito |
| :--- | :--- | :--- |
| `searchQuery` | `signal<string>` | Captura el término de búsqueda ingresado por el usuario en tiempo real. |
| `searchResults` | `signal<TMDbMovie[]>` | Almacena los resultados de búsqueda obtenidos desde TMDB. |
| `isSearching` | `signal<boolean>` | Indica el estado de carga durante la búsqueda. |
| `filteredResults` | `computed()` | Derivada que filtra y transforma los resultados según la consulta. |
| **effect()** | N/A | Dispara la búsqueda en TMDB cada vez que `searchQuery` cambia (con debounce). |

#### **D. Señales de Formularios** (`login.ts`, `profile.ts`)
| Signal | Componente | Propósito |
| :--- | :--- | :--- |
| `email` | Login, Profile | Captura el email ingresado en tiempo real. |
| `password` | Login | Captura la contraseña ingresada en tiempo real. |
| `name` | Profile | Almacena el nombre del usuario actual. |
| `errorMessage` | Login | Mensajes de error de validación o autenticación. |
| `message` | Profile | Mensajes de éxito o estado general. |
| `isLoading` | Profile | Indica si está en curso una operación asíncrona. |

#### **E. Señales de UI y Modales**
| Signal | Componente | Propósito |
| :--- | :--- | :--- |
| `isModalOpen` | users.ts | Controla la visibilidad del modal de adición de usuarios. |
| `mainTrailer` | movie-detail-modal.ts | `computed()` que extrae el trailer principal del objeto TMDb. |
| `movieData` | movie-detail.ts | `computed()` que construye datos híbridos (PB + TMDB) para visualización. |

#### **F. Signals en Edit Modal** (`edit-movie-modal.ts`)
| Signal | Propósito |
| :--- | :--- |
| **effect()** | Observa cambios en la película ingresada y actualiza el formulario reactivamente. |

### Patrón General de Uso

La arquitectura de signals en FilmStack sigue estos principios:

1. **Signals de Entrada**: `input()` y `input.required()` en componentes para recibir datos de padres.
2. **Signals de Salida**: `output()` en componentes para emitir eventos hacia componentes padres.
3. **Computed Derivadas**: Para lógica de transformación de datos (filtrado, mezcla de datos, cálculos).
4. **Effects Secundarios**: Para efectos colaterales como llamadas a APIs, sincronización o validación.
5. **Signal Mutables**: Para estado local simple (formularios, flags de UI, caché temporal).

Esta arquitectura reactiva permite que los cambios se propaguen automáticamente sin necesidad de `ChangeDetectionStrategy.OnPush` o detección manual de cambios.

## 4. Hooks (Ciclo de Vida y Reactividad)

| Hook | Línea | Función | Ejemplo |
| :--- | :--- | :--- | :--- |
| `constructor` | pocketbase.service.ts L10 | Inicializa SDK PocketBase. | `constructor() { this.pb = new PocketBase(...) }` |
| `constructor` | auth.service.ts L15 | Inyección de dependencias. | `constructor(private pbService = inject(PocketbaseService))` |
| `ngOnInit` | users.ts L23 | Carga inicial de datos. | `async ngOnInit() { await this.loadUsers() }` |
| `ngOnInit` | users.ts L28 | Fetch desde PocketBase. | `const records = await this.pbService.pb.collection('users').getFullList()` |
| `effect()` | search.ts L68 | Búsqueda asíncrona con debounce. | `effect(() => { if (this.searchQuery()) { setTimeout(() => API()) } })` |
| `effect()` | edit-movie-modal.ts L26 | Observa cambios en entrada. | `effect(() => { const movie = this.movieData(); this.form.patchValue(movie) })` |
| `computed()` | auth.service.ts L23 | Derivada de usuario actual. | `user = computed(() => this.currentUser())` |
| `computed()` | film-repository.service.ts L19 | Combinación PB + TMDB. | `computed(() => movies.map(m => ({ ...m, tmdb_data: this.tmdb.get(m.id) })))` |

## 5. Pipes (Transformadores de Datos)

| Pipe | Línea de Uso | Tipo | Función | Ejemplo |
| :--- | :--- | :--- | :--- | :--- |
| `runtime` | movie-detail-modal.html L23 | Personalizado | Transforma minutos a `1h 45m`. | `{{ movie().runtime \| runtime }}` |
| `safe` | movie-detail-modal.html L50 | Personalizado | Sanitiza URLs YouTube iframe. | `[innerHTML]="mainTrailer() \| safe"` |
| `date` | movie-detail-modal.html L19 | Nativo | Extrae año de fecha. | `{{ movie().release_date \| date:'y' }}` |
| `number` | movie-detail-modal.html L16 | Nativo | Limita decimales rating TMDB. | `{{ movie().vote_average \| number:'1.1-1' }}` |
| `number` | movie-detail-modal.html L19 | Nativo | Limita decimales rating FilmStack. | `{{ stats()!.avg_rating \| number:'1.1-1' }}` |

## 6. Arquitectura de Modales
Se ha implementado una arquitectura de modales modulares y reactivos situados en `shared/components/`.

| Componente | Función | Interacción |
| :--- | :--- | :--- |
| `ConfirmModal` | Confirmación de acciones críticas (eliminar película, suspender usuario). | Recibe `title` / `message` y emite `confirmed`. |
| `MovieDetailModal` | Ficha técnica completa (Sinopsis, Cast, Trailer, Notas). | Recibe `TMDbMovie` y `MovieStats`. |
| `AddMovieModal` | Formulario para añadir una nueva obra al backlog personal. | Recibe `TMDbMovie` y emite `save(options)`. |
| `EditMovieModal` | Edición de estado, nota y reseña de una obra ya guardada. | Recibe `HybridMovie` y emite `save(data)`. |

## 7. Enrutamiento y Seguridad
*   **Definición de Rutas (`app.routes.ts`)**: Mapeo de URLs a componentes (`search`, `backlog`, `admin/users`, `profile`).
*   **Auth Guard (`auth.guard.ts`)**: Implementación de `CanActivateFn` que utiliza el `AuthService` para proteger todas las rutas privadas, redirigiendo a `/login` si no hay sesión activa.
*   **Parámetros Dinámicos**: Uso de `:movieId` para navegación detallada (aunque actualmente se priorizan los modales para una experiencia más fluida).

---
**Tecnologías**: Angular 18 | **Estilos**: Vanilla CSS + Bootstrap 5 | **Reactividad**: Full Signals
