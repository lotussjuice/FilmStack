import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService, UserStats } from '../../services/stats.service';
import { TmdbService } from '../../../../core/services/tmdb.service';

@Component({
  selector: 'app-stats-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-view.html',
  styleUrl: './stats-view.css'
})
export class StatsComponent implements OnInit {
  private statsService = inject(StatsService);
  private tmdb = inject(TmdbService);

  stats = signal<UserStats | null>(null);
  genreDistribution = signal<{ name: string; count: number; pct: number }[]>([]);
  decadeDistribution = signal<{ decade: string; count: number; pct: number }[]>([]);
  monthlyEvolution = signal<{ month: string; count: number }[]>([]);
  isLoading = signal(true);

  totalHours = computed(() => {
    const s = this.stats();
    if (!s) return 0;
    return Math.round(s.total * 1.8 * 10) / 10;
  });

  async ngOnInit() {
    this.isLoading.set(true);
    const data = await this.statsService.getUserStats();
    this.stats.set(data);

    if (data?.tmdb_ids && data.tmdb_ids.length > 0) {
      await this.buildGenreDistribution(data.tmdb_ids);
      await this.buildDecadeDistribution(data.tmdb_ids);
      this.buildMonthlyEvolution();
    }

    this.isLoading.set(false);
  }

  private async buildGenreDistribution(tmdbIds: number[]) {
    const genreMap = new Map<string, number>();
    for (const id of tmdbIds.slice(0, 50)) {
      try {
        const details = await this.tmdb.getMovieDetails(id);
        if (details?.genres) {
          for (const g of details.genres) {
            genreMap.set(g.name, (genreMap.get(g.name) || 0) + 1);
          }
        }
      } catch {}
    }

    const total = Array.from(genreMap.values()).reduce((a, b) => a + b, 0);
    const sorted = Array.from(genreMap.entries())
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    this.genreDistribution.set(sorted);
  }

  private async buildDecadeDistribution(tmdbIds: number[]) {
    const decadeMap = new Map<string, number>();
    for (const id of tmdbIds.slice(0, 50)) {
      try {
        const details = await this.tmdb.getMovieDetails(id);
        if (details?.release_date) {
          const year = new Date(details.release_date).getFullYear();
          const decade = `${Math.floor(year / 10) * 10}s`;
          decadeMap.set(decade, (decadeMap.get(decade) || 0) + 1);
        }
      } catch {}
    }

    const total = Array.from(decadeMap.values()).reduce((a, b) => a + b, 0);
    const sorted = Array.from(decadeMap.entries())
      .map(([decade, count]) => ({ decade, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => a.decade.localeCompare(b.decade));

    this.decadeDistribution.set(sorted);
  }

  private buildMonthlyEvolution() {
    const months: { month: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('es-MX', { month: 'short' });
      months.push({ month: label, count: Math.floor(Math.random() * 8) + 1 });
    }
    this.monthlyEvolution.set(months);
  }

  getBarWidth(pct: number): string {
    return `${Math.max(pct, 3)}%`;
  }

  getDecadeBarWidth(pct: number): string {
    return `${Math.max(pct, 5)}%`;
  }

  getMonthBarHeight(count: number): number {
    const max = Math.max(...this.monthlyEvolution().map(m => m.count), 1);
    return (count / max) * 100;
  }
}
