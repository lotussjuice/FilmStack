import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { PocketbaseService } from './pocketbase.service';
import { TmdbService } from './tmdb.service';
import { AuthService } from './auth.service';
import { Movie, HybridMovie } from '../../models/movie.model';

@Injectable({
  providedIn: 'root'
})
export class FilmRepositoryService {
  private pbService = inject(PocketbaseService);
  private tmdbService = inject(TmdbService);
  private auth = inject(AuthService);

  // Almacena los datos básicos de PocketBase
  private moviesSignal = signal<Movie[]>([]);
  
  // Almacena el mapa de detalles de TMDB (TMDB_ID -> TMDbMovie)
  private tmdbDetailsSignal = signal<Map<number, any>>(new Map());

  // Almacena el mapa de estadísticas de la comunidad (TMDB_ID -> MovieStats)
  private statsSignal = signal<Map<number, any>>(new Map());

  // Señal computada que combina ambas fuentes de datos (PB + TMDB + Stats)
  public hybridMovies = computed<HybridMovie[]>(() => {
    const user = this.auth.user();
    if (!user) return [];

    const movies = this.moviesSignal().filter(m => m.user_id === user.id);
    const detailsMap = this.tmdbDetailsSignal();
    const statsMap = this.statsSignal();

    return movies.map(movie => ({
      ...movie,
      tmdb_data: detailsMap.get(movie.tmdb_id),
      stats: statsMap.get(movie.tmdb_id)
    }));
  });

  constructor() {
    // Reaccionar a cambios en el usuario para recargar el backlog
    effect(() => {
      const user = this.auth.user();
      if (user) {
        this.loadMovies();
      } else {
        this.moviesSignal.set([]);
        this.tmdbDetailsSignal.set(new Map());
      }
    });
  }

  // Carga las películas de PB y luego dispara la obtención de detalles de TMDB y estadísticas
  async loadMovies() {
    try {
      const movies = await this.pbService.getMovies();
      this.moviesSignal.set(movies);
      this.loadTmdbDetails(movies);
      this.loadStats();
    } catch (error) {
      console.error('Error al cargar películas', error);
    }
  }

  // Carga las estadísticas globales de las películas (promedio de ratings, etc.)
  async loadStats() {
    try {
      const statsList = await this.pbService.pb.collection('rankings').getFullList();
      const statsMap = new Map();
      statsList.forEach((s: any) => statsMap.set(s.tmdb_id, s));
      this.statsSignal.set(statsMap);
    } catch (e) {
      console.error('Error al cargar estadísticas', e);
    }
  }

  // Obtiene los detalles de TMDB para las películas que aún no los tienen en caché
  private async loadTmdbDetails(movies: Movie[]) {
    const currentDetails = new Map(this.tmdbDetailsSignal());
    const promises = movies
      .filter(m => !currentDetails.has(m.tmdb_id))
      .map(async m => {
        try {
          const detail = await this.tmdbService.getMovieDetails(m.tmdb_id);
          currentDetails.set(m.tmdb_id, detail);
        } catch (e) {
          console.error(`Error al cargar info de TMDB para ${m.tmdb_id}`, e);
        }
      });

    if (promises.length > 0) {
      await Promise.all(promises);
      this.tmdbDetailsSignal.set(currentDetails);
    }
  }

  // Añade una película al backlog del usuario
  async addMovieToBacklog(tmdbId: number, options: Partial<Omit<Movie, 'id' | 'tmdb_id' | 'user_id'>> = {}) {
    const existing = this.moviesSignal().find(m => m.tmdb_id === tmdbId);
    if (existing) return;

    const currentUser = this.auth.user();
    if (!currentUser) return;

    try {
      const newMovie: Omit<Movie, 'id'> = {
        tmdb_id: tmdbId,
        status: options.status || 'pending',
        rating: options.rating || 0,
        review: options.review || '',
        is_favorite: options.is_favorite || false,
        user_id: currentUser.id
      };
      const created = await this.pbService.addMovie(newMovie);
      this.moviesSignal.update(movies => [...movies, created]);
      this.loadTmdbDetails([created]);
    } catch (error) {
      console.error('Error al añadir película al backlog', error);
    }
  }

  // Actualiza los datos de una película existente
  async updateMovie(id: string, data: Partial<Movie>) {
    try {
      const updated = await this.pbService.updateMovie(id, data);
      this.moviesSignal.update(movies => 
        movies.map(m => m.id === id ? { ...m, ...updated } : m)
      );
    } catch (error) {
      console.error('Error al actualizar película', error);
    }
  }

  async updateMovieStatus(id: string, status: 'pending' | 'watched' | 'dropped') {
    return this.updateMovie(id, { status });
  }

  async updateMovieRating(id: string, rating: number) {
    return this.updateMovie(id, { rating });
  }

  // Elimina una película del backlog
  async removeMovie(id: string) {
    try {
      await this.pbService.deleteMovie(id);
      this.moviesSignal.update(movies => movies.filter(m => m.id !== id));
    } catch (error) {
      console.error('Error al eliminar película', error);
    }
  }
}
