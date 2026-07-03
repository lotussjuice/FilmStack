import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { PocketbaseService } from '../../../core/services/pocketbase.service';
import { TmdbService } from '../../../core/services/tmdb.service';
import { AuthService } from '../../auth/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Movie, HybridMovie } from '../../../core/interfaces/movie.interface';

@Injectable({
  providedIn: 'root'
})
export class FilmRepositoryService {
  private pbService = inject(PocketbaseService);
  private tmdbService = inject(TmdbService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  private moviesSignal = signal<Movie[]>([]);
  private tmdbDetailsSignal = signal<Map<number, any>>(new Map());
  private statsSignal = signal<Map<number, any>>(new Map());

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

  async loadMovies() {
    try {
      const movies = await this.pbService.getMovies();
      this.moviesSignal.set(movies);
      this.loadTmdbDetails(movies);
      this.loadStats();
      this.backfillMovieReviews(movies);
    } catch (error) {
      this.toast.error('Error al cargar peliculas');
    }
  }

  async loadStats() {
    try {
      const statsList = await this.pbService.collection('rankings').getFullList();
      const statsMap = new Map();
      statsList.forEach((s: any) => statsMap.set(s.tmdb_id, s));
      this.statsSignal.set(statsMap);
    } catch {
    }
  }

  private async loadTmdbDetails(movies: Movie[]) {
    const currentDetails = new Map(this.tmdbDetailsSignal());
    const promises = movies
      .filter(m => !currentDetails.has(m.tmdb_id))
      .map(async m => {
        try {
          const detail = await this.tmdbService.getMovieDetails(m.tmdb_id);
          currentDetails.set(m.tmdb_id, detail);
        } catch (e) {
          console.warn(`Error al cargar info de TMDB para ${m.tmdb_id}`, e);
        }
      });

    if (promises.length > 0) {
      await Promise.all(promises);
      this.tmdbDetailsSignal.set(currentDetails);
    }
  }

  async addMovieToBacklog(tmdbId: number, options: Partial<Omit<Movie, 'id' | 'tmdb_id' | 'user_id'>> = {}) {
    const existing = this.moviesSignal().find(m => m.tmdb_id === tmdbId);
    if (existing) return;

    const currentUser = this.auth.user();
    if (!currentUser) return;

    try {
      const newMovie: Omit<Movie, 'id'> = {
        tmdb_id: tmdbId,
        status: options['status'] || 'pending',
        rating: options['rating'] || 0,
        review: options['review'] || '',
        is_favorite: options['is_favorite'] || false,
        user_id: currentUser.id
      };
      const created = await this.pbService.addMovie(newMovie);
      this.moviesSignal.update(movies => [...movies, created]);
      this.loadTmdbDetails([created]);
      if ((options['rating'] || 0) > 0 || options['review']) {
        this.syncMovieReview(tmdbId, options['rating'] || 0, options['review'] || '');
      }
    } catch (error) {
      this.toast.error('Error al añadir película al backlog');
    }
  }

  async updateMovie(id: string, data: Partial<Movie>) {
    try {
      const updated = await this.pbService.updateMovie(id, data);
      this.moviesSignal.update(movies => 
        movies.map(m => m.id === id ? { ...m, ...updated } : m)
      );
      if (data['rating'] !== undefined || data['review'] !== undefined) {
        const movie = this.moviesSignal().find(m => m.id === id);
        if (movie) {
          this.syncMovieReview(movie.tmdb_id, data['rating'] ?? movie.rating, data['review'] ?? movie.review ?? '');
        }
      }
    } catch (error) {
      this.toast.error('Error al actualizar película');
    }
  }

  async updateMovieStatus(id: string, status: 'pending' | 'watched' | 'dropped') {
    return this.updateMovie(id, { status });
  }

  async updateMovieRating(id: string, rating: number) {
    return this.updateMovie(id, { rating });
  }

  async getMovieStats(tmdbId: number): Promise<any> {
    try {
      const records = await this.pbService.collection('rankings').getFullList({
        filter: `tmdb_id = ${tmdbId}`,
        $autoCancel: false,
      });
      return records[0] || { avg_rating: 0, total_votes: 0 };
    } catch (e) {
      return { avg_rating: 0, total_votes: 0 };
    }
  }

  async removeMovie(id: string) {
    try {
      const movie = this.moviesSignal().find(m => m.id === id);
      await this.pbService.deleteMovie(id);
      this.moviesSignal.update(movies => movies.filter(m => m.id !== id));
      if (movie) {
        this.deleteMovieReview(movie.tmdb_id);
      }
    } catch (error) {
      this.toast.error('Error al eliminar película');
    }
  }

  private async syncMovieReview(tmdbId: number, rating: number, reviewText: string) {
    const user = this.auth.user();
    if (!user) return;
    try {
      const existing = await this.pbService.collection('movie_reviews').getFullList({
        filter: `tmdb_id = ${tmdbId} && user = "${user.id}"`,
        $autoCancel: false
      });
      const payload = {
        tmdb_id: tmdbId,
        user: user.id,
        user_name: user['name'] || 'Usuario',
        rating,
        review_text: reviewText,
        source: 'backlog'
      };
      if (existing.length > 0) {
        await this.pbService.collection('movie_reviews').update(existing[0].id, payload, { $autoCancel: false });
      } else {
        await this.pbService.collection('movie_reviews').create(payload, { $autoCancel: false });
      }
    } catch {}
  }

  private async deleteMovieReview(tmdbId: number) {
    const user = this.auth.user();
    if (!user) return;
    try {
      const existing = await this.pbService.collection('movie_reviews').getFullList({
        filter: `tmdb_id = ${tmdbId} && user = "${user.id}"`,
        $autoCancel: false
      });
      for (const r of existing) {
        await this.pbService.collection('movie_reviews').delete(r.id);
      }
    } catch {}
  }

  private async backfillMovieReviews(movies: Movie[]) {
    const user = this.auth.user();
    if (!user) return;
    const rated = movies.filter(m => m.user_id === user.id && m.rating > 0);
    if (rated.length === 0) return;

    try {
      const existing = await this.pbService.collection('movie_reviews').getFullList({
        filter: `user = "${user.id}"`,
        $autoCancel: false
      });
      const existingTmdbIds = new Set(existing.map((r: any) => r.tmdb_id));

      for (const m of rated) {
        if (!existingTmdbIds.has(m.tmdb_id)) {
          this.syncMovieReview(m.tmdb_id, m.rating, m.review || '');
        }
      }
    } catch {}
  }
}
