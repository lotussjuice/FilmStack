import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService, UserStats } from '../../services/stats.service';
import { FilmRepositoryService } from '../../../backlog/services/film-repository.service';

@Component({
  selector: 'app-stats-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-view.html',
  styleUrl: './stats-view.css'
})
export class StatsComponent implements OnInit {
  private statsService = inject(StatsService);
  private repo = inject(FilmRepositoryService);

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
      this.buildGenreDistribution(data.tmdb_ids);
      this.buildDecadeDistribution(data.tmdb_ids);
    }

    if (data?.monthly_evolution) {
      this.monthlyEvolution.set(data.monthly_evolution);
    }

    this.isLoading.set(false);
  }

  private buildGenreDistribution(tmdbIds: number[]) {
    const genreMap = new Map<string, number>();
    const detailsMap = new Map<number, any>();
    this.repo.hybridMovies().forEach(m => {
      if (m.tmdb_data) detailsMap.set(m.tmdb_id, m.tmdb_data);
    });

    for (const id of tmdbIds) {
      const details = detailsMap.get(id);
      if (details?.genres) {
        for (const g of details.genres) {
          genreMap.set(g.name, (genreMap.get(g.name) || 0) + 1);
        }
      }
    }

    const total = Array.from(genreMap.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return;

    const sorted = Array.from(genreMap.entries())
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    this.genreDistribution.set(sorted);
  }

  private buildDecadeDistribution(tmdbIds: number[]) {
    const decadeMap = new Map<string, number>();
    const detailsMap = new Map<number, any>();
    this.repo.hybridMovies().forEach(m => {
      if (m.tmdb_data) detailsMap.set(m.tmdb_id, m.tmdb_data);
    });

    for (const id of tmdbIds) {
      const details = detailsMap.get(id);
      if (details?.release_date) {
        const year = new Date(details.release_date).getFullYear();
        const decade = `${Math.floor(year / 10) * 10}s`;
        decadeMap.set(decade, (decadeMap.get(decade) || 0) + 1);
      }
    }

    const total = Array.from(decadeMap.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return;

    const sorted = Array.from(decadeMap.entries())
      .map(([decade, count]) => ({ decade, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => a.decade.localeCompare(b.decade));

    this.decadeDistribution.set(sorted);
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
