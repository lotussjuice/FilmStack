import { Injectable, inject } from '@angular/core';
import { PocketbaseService } from '../../../core/services/pocketbase.service';
import { TmdbService } from '../../../core/services/tmdb.service';
import { FilmRepositoryService } from '../../backlog/services/film-repository.service';
import { SocialService } from '../../social/services/social.service';

export interface RecommendationRow {
  title: string;
  subtitle: string;
  movies: any[];
}

@Injectable({ providedIn: 'root' })
export class RecommendationsService {
  private pb = inject(PocketbaseService);
  private tmdb = inject(TmdbService);
  private repo = inject(FilmRepositoryService);
  private social = inject(SocialService);

  async buildRecommendations(): Promise<RecommendationRow[]> {
    const stats = await this.fetchStats();
    const userTmdbIds = stats?.tmdb_ids || [];
    const rows: RecommendationRow[] = [];

    const genrePrefs = await this.getTopGenres(userTmdbIds);
    if (genrePrefs.length > 0) {
      const genreMovies = await this.discoverByGenres(genrePrefs[0].id, userTmdbIds);
      if (genreMovies.length > 0) {
        rows.push({
          title: `En base a tu preferencia: ${genrePrefs[0].name}`,
          subtitle: `Películas del género ${genrePrefs[0].name.toLowerCase()} que podrían gustarte`,
          movies: genreMovies
        });
      }
    }

    const decade = this.getPreferredDecade(userTmdbIds);
    if (decade) {
      const decadeMovies = await this.discoverByDecade(decade, userTmdbIds);
      if (decadeMovies.length > 0) {
        rows.push({
          title: `Películas de los ${decade}s`,
          subtitle: `Tu década favorita del cine`,
          movies: decadeMovies
        });
      }
    }

    const friendMovies = await this.getFriendRecommendations(userTmdbIds);
    if (friendMovies.length > 0) {
      rows.push({
        title: 'Tus amigos han visto',
        subtitle: 'Películas que tu círculo ha calificado recientemente',
        movies: friendMovies
      });
    }

    const actorMovies = await this.getActorRecommendations(userTmdbIds);
    if (actorMovies.length > 0) {
      rows.push({
        title: 'Tus actores favoritos',
        subtitle: 'Películas con actores que aparecen en tus favoritas',
        movies: actorMovies
      });
    }

    const topRated = await this.discoverTopRated(userTmdbIds);
    if (topRated.length > 0) {
      rows.push({
        title: 'Altamente valoradas',
        subtitle: 'Películas con excelentes calificaciones en tus géneros favoritos',
        movies: topRated
      });
    }

    const recent = await this.discoverRecent(userTmdbIds);
    if (recent.length > 0) {
      rows.push({
        title: 'Estrenos recientes',
        subtitle: 'Lo último del cine en tus géneros favoritos',
        movies: recent
      });
    }

    return rows;
  }

  private async fetchStats(): Promise<{ tmdb_ids: number[] } | null> {
    try {
      const res = await fetch('/api/stats/user', {
        headers: { Authorization: `Bearer ${this.pb.authStore.token}` }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  private async getTopGenres(tmdbIds: number[]): Promise<{ id: number; name: string; count: number }[]> {
    const genreMap = new Map<number, { name: string; count: number }>();
    for (const id of tmdbIds.slice(0, 50)) {
      try {
        const details = await this.tmdb.getMovieDetails(id);
        if (details?.genres) {
          for (const g of details.genres) {
            const existing = genreMap.get(g.id) || { name: g.name, count: 0 };
            existing.count++;
            genreMap.set(g.id, existing);
          }
        }
      } catch {}
    }
    return Array.from(genreMap.entries())
      .map(([id, data]) => ({ id, name: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getPreferredDecade(tmdbIds: number[]): number | null {
    const decades: Record<number, number> = {};
    for (const id of tmdbIds.slice(0, 50)) {
      const movie = this.repo.hybridMovies().find(m => m.tmdb_id === id);
      const year = movie?.tmdb_data?.release_date ? new Date(movie.tmdb_data.release_date).getFullYear() : 0;
      if (year > 0) {
        const decade = Math.floor(year / 10) * 10;
        decades[decade] = (decades[decade] || 0) + 1;
      }
    }
    const sorted = Object.entries(decades).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? parseInt(sorted[0][0]) : null;
  }

  private async discoverByGenres(genreId: number, excludeIds: number[]): Promise<any[]> {
    try {
      const res = await fetch(`/api/tmdb/discover?genres=${genreId}&sort_by=vote_average.desc&vote_gte=6&page=1`, {
        headers: { Authorization: `Bearer ${this.pb.authStore.token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      const results = data.results || [];
      return results
        .filter((m: any) => !excludeIds.includes(m.id) && m.poster_path)
        .slice(0, 20);
    } catch {
      return [];
    }
  }

  private async discoverByDecade(decade: number, excludeIds: number[]): Promise<any[]> {
    try {
      const res = await fetch(`/api/tmdb/discover?year_gte=${decade}&year_lte=${decade + 9}&sort_by=vote_average.desc&vote_gte=6&page=1`, {
        headers: { Authorization: `Bearer ${this.pb.authStore.token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || [])
        .filter((m: any) => !excludeIds.includes(m.id) && m.poster_path)
        .slice(0, 20);
    } catch {
      return [];
    }
  }

  private async discoverTopRated(excludeIds: number[]): Promise<any[]> {
    try {
      const res = await fetch(`/api/tmdb/discover?sort_by=vote_average.desc&vote_gte=7.5&page=1`, {
        headers: { Authorization: `Bearer ${this.pb.authStore.token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || [])
        .filter((m: any) => !excludeIds.includes(m.id) && m.poster_path)
        .slice(0, 20);
    } catch {
      return [];
    }
  }

  private async discoverRecent(excludeIds: number[]): Promise<any[]> {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const gte = threeMonthsAgo.toISOString().split('T')[0];
    try {
      const res = await fetch(`/api/tmdb/discover?sort_by=popularity.desc&year_gte=${gte.substring(0, 4)}&page=1`, {
        headers: { Authorization: `Bearer ${this.pb.authStore.token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || [])
        .filter((m: any) => !excludeIds.includes(m.id) && m.poster_path)
        .slice(0, 20);
    } catch {
      return [];
    }
  }

  private async getFriendRecommendations(excludeIds: number[]): Promise<any[]> {
    const friendReviews = await this.fetchFriendsRecent();
    const tmdbIds = [...new Set(friendReviews.map(r => r.tmdb_id))].filter(id => !excludeIds.includes(id));
    const movies: any[] = [];
    for (const id of tmdbIds.slice(0, 10)) {
      try {
        const details = await this.tmdb.getMovieDetails(id);
        if (details && details.poster_path) {
          movies.push(details);
        }
      } catch {}
    }
    return movies.slice(0, 15);
  }

  private async fetchFriendsRecent(): Promise<{ tmdb_id: number }[]> {
    try {
      const res = await fetch('/api/stats/friends-recent', {
        headers: { Authorization: `Bearer ${this.pb.authStore.token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.reviews || [];
    } catch {
      return [];
    }
  }

  private async getActorRecommendations(excludeIds: number[]): Promise<any[]> {
    const actorMap = new Map<number, { name: string; count: number }>();
    for (const id of excludeIds.slice(0, 30)) {
      try {
        const details = await this.tmdb.getMovieDetails(id);
        if (details?.credits?.cast) {
          for (const actor of details.credits.cast.slice(0, 5)) {
            const existing = actorMap.get(actor.id) || { name: actor.name, count: 0 };
            existing.count++;
            actorMap.set(actor.id, existing);
          }
        }
      } catch {}
    }

    const topActors = Array.from(actorMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3);

    const movies: any[] = [];
    for (const [actorId] of topActors) {
      try {
        const res = await fetch(`/api/tmdb/person/${actorId}`, {
          headers: { Authorization: `Bearer ${this.pb.authStore.token}` }
        });
        if (!res.ok) continue;
        const data = await res.json();
        const credits = data.movie_credits?.cast || [];
        for (const c of credits.slice(0, 5)) {
          if (!excludeIds.includes(c.id) && c.poster_path && !movies.find((m: any) => m.id === c.id)) {
            movies.push(c);
          }
        }
      } catch {}
    }
    return movies.slice(0, 15);
  }
}
