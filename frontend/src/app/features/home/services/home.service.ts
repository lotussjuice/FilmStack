import { Injectable, inject } from '@angular/core';
import { PocketbaseService } from '../../../core/services/pocketbase.service';
import { StatsService } from '../../stats/services/stats.service';

@Injectable({ providedIn: 'root' })
export class HomeService {
  private pb = inject(PocketbaseService);
  private stats = inject(StatsService);

  async getHomeData() {
    return this.stats.getHomeData();
  }

  async getTmdbMovie(tmdbId: number): Promise<any> {
    try {
      const res = await fetch(`/api/tmdb/movie/${tmdbId}`, {
        headers: { Authorization: `Bearer ${this.pb.authStore.token}` }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}
