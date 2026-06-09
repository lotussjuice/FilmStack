import { Component, input, output, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WatchpartyService } from '../../../../../../core/services/watchparty.service';
import { TmdbService } from '../../../../../../core/services/tmdb.service';
import { WatchParty } from '../../../../../../features/social/interfaces/social.interface';
import { TMDbMovie } from '../../../../../../core/interfaces/movie.interface';

@Component({
  selector: 'app-group-roulette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './group-roulette.html',
  styleUrl: './group-roulette.css'
})
export class GroupRouletteComponent {
  public wp = inject(WatchpartyService);
  private tmdbService = inject(TmdbService);

  party = input.required<WatchParty>();
  isHost = this.wp.isHost;

  syncRequested = output<void>();
  finishedWatching = output<void>();
  left = output<void>();

  poolMovies = computed(() => {
    const pool = this.party().spinPool || [];
    const proposals = this.wp.proposals();
    return pool.map(id => {
      const match = proposals.find(p => p.tmdbId === id);
      return { id, title: match ? match.title : `Movie ${id}` };
    });
  });

  showDirectForm = signal<boolean>(false);
  directQuery = signal<string>('');
  directResults = signal<TMDbMovie[]>([]);
  directSelected = signal<TMDbMovie | null>(null);
  isSearchingDirect = signal<boolean>(false);

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  async spin() {
    if (!this.isHost()) return;
    const result = await this.wp.spinGroup();
    if (result) {
      this.syncRequested.emit();
    }
  }

  async removeFromPool(id: number) {
    if (!this.isHost()) return;
    await this.wp.removeFromSpinPool(id);
  }

  toggleDirectForm() {
    this.showDirectForm.update(v => !v);
    if (!this.showDirectForm()) {
      this.resetDirectForm();
    }
  }

  onDirectQueryChange(value: string) {
    this.directQuery.set(value);
    this.directSelected.set(null);
    if (this.searchTimeout !== null) clearTimeout(this.searchTimeout);
    if (!value.trim()) {
      this.directResults.set([]);
      this.isSearchingDirect.set(false);
      return;
    }
    this.isSearchingDirect.set(true);
    this.searchTimeout = setTimeout(async () => {
      try {
        const results = await this.tmdbService.searchMovies(value);
        this.directResults.set(results.slice(0, 6));
      } catch (e) {
        this.directResults.set([]);
      } finally {
        this.isSearchingDirect.set(false);
      }
    }, 400);
  }

  selectDirectMovie(movie: TMDbMovie) {
    this.directSelected.set(movie);
  }

  async directStart() {
    if (!this.isHost()) return;
    const movie = this.directSelected();
    if (!movie) return;
    await this.wp.directStart(movie.id, movie.title, movie.poster_path || null);
    this.resetDirectForm();
    this.syncRequested.emit();
  }

  resetDirectForm() {
    this.directQuery.set('');
    this.directResults.set([]);
    this.directSelected.set(null);
    this.showDirectForm.set(false);
    if (this.searchTimeout !== null) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }

  async finish() {
    if (!this.isHost()) return;
    await this.wp.acceptAndStart();
  }

  async finishReview() {
    this.finishedWatching.emit();
  }

  async leave() {
    this.left.emit();
  }

  posterUrl(path: string | null | undefined): string | null {
    return path ? `https://image.tmdb.org/t/p/w300${path}` : null;
  }

  partyPosterUrl(): string | null {
    const p = this.party().activeMoviePoster;
    return p ? `https://image.tmdb.org/t/p/w300${p}` : null;
  }
}
