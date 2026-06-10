import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilmRepositoryService } from '../../../../core/services/film-repository.service';
import { ActiveSessionService } from '../../../../core/services/active-session.service';
import { RouletteResultModalComponent } from '../roulette-result-modal/roulette-result-modal';
import { HybridMovie } from '../../../../core/interfaces/movie.interface';

type RouletteMode = 'pending' | 'rewatch';

@Component({
  selector: 'app-roulette',
  standalone: true,
  imports: [CommonModule, RouletteResultModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './roulette-view.html',
  styleUrl: './roulette-view.css'
})
export class RouletteComponent {
  private repo = inject(FilmRepositoryService);
  private sessionService = inject(ActiveSessionService);

  mode = signal<RouletteMode>('pending');
  isSpinning = signal<boolean>(false);
  selected = signal<HybridMovie | null>(null);
  isResultOpen = signal<boolean>(false);

  candidates = computed<HybridMovie[]>(() => {
    const all = this.repo.hybridMovies();
    const m = this.mode();
    if (m === 'pending') {
      return all.filter(x => x.status === 'pending');
    }
    return all.filter(x => x.status === 'watched');
  });

  poolNames = computed<string[]>(() => this.candidates().map(c => c.tmdb_data?.title || 'Sin título'));

  private segmentColors = ['#0F2315', '#1A3322', '#2C4F33', '#3B6B47', '#5C7A60', '#8FA08B', '#0D2B17', '#163A23', '#244530', '#4A6F50', '#6B886E', '#A0B89C', '#082012'];

  wheelGradient = computed<string>(() => {
    const n = this.candidates().length;
    if (n === 0) return 'var(--color-dry-sage)';
    if (n === 1) return this.segmentColors[0];
    const angle = 360 / n;
    const stops: string[] = [];
    for (let i = 0; i < n; i++) {
      const color = this.segmentColors[i % this.segmentColors.length];
      stops.push(`${color} ${i * angle}deg ${(i + 1) * angle}deg`);
    }
    return `conic-gradient(from 0deg, ${stops.join(', ')})`;
  });

  labelAngles = computed<number[]>(() => {
    const n = this.candidates().length;
    if (n === 0) return [];
    const angle = 360 / n;
    const result: number[] = [];
    for (let i = 0; i < n; i++) {
      result.push(i * angle + angle / 2);
    }
    return result;
  });

  setMode(m: RouletteMode) {
    this.mode.set(m);
  }

  spin(): void {
    const pool = this.candidates();
    if (pool.length === 0) {
      return;
    }
    this.isSpinning.set(true);
    this.selected.set(null);
    const duration = 2200;
    setTimeout(() => {
      const idx = Math.floor(Math.random() * pool.length);
      this.selected.set(pool[idx]);
      this.isSpinning.set(false);
      this.isResultOpen.set(true);
    }, duration);
  }

  onAccept(): void {
    const m = this.selected();
    if (m && m.tmdb_data) {
      this.sessionService.start({
        tmdbId: m.tmdb_id,
        title: m.tmdb_data.title,
        posterPath: m.tmdb_data.poster_path,
        year: m.tmdb_data.release_date ? new Date(m.tmdb_data.release_date).getFullYear().toString() : '',
        source: 'roulette'
      });
    }
    this.isResultOpen.set(false);
    this.selected.set(null);
  }

  onDismiss(): void {
    this.isResultOpen.set(false);
    this.selected.set(null);
  }

  posterUrl(m: HybridMovie): string | null {
    const path = m.tmdb_data?.poster_path;
    return path ? `https://image.tmdb.org/t/p/w300${path}` : null;
  }
}
