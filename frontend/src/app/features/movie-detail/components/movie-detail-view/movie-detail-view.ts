import { Component, input, computed, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FilmRepositoryService } from '../../../backlog/services/film-repository.service';
import { TmdbService } from '../../../../core/services/tmdb.service';
import { RuntimePipe } from '../../../../shared/pipes/runtime.pipe';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RuntimePipe],
  templateUrl: './movie-detail-view.html',
  styleUrl: './movie-detail-view.css'
})
export class MovieDetailComponent implements OnInit {
  private repo = inject(FilmRepositoryService);
  private tmdb = inject(TmdbService);
  private router = inject(Router);

  movieId = input.required<string>();

  tmdbMovie = signal<any>(null);
  isLoadingTmdb = signal(false);

  movieData = computed(() => {
    const id = this.movieId();
    const numId = Number(id);
    return this.repo.hybridMovies().find(m => m.id === id || (numId && m.tmdb_id === numId));
  });

  displayMovie = computed(() => {
    const local = this.movieData();
    if (local) return { source: 'local' as const, data: local };
    const external = this.tmdbMovie();
    if (external) return { source: 'tmdb' as const, data: external };
    return null;
  });

  constructor() {
    effect(() => {
      const id = this.movieId();
      const local = this.movieData();
      if (!local && id) {
        this.fetchFromTmdb(id);
      }
    });
  }

  ngOnInit() {}

  private async fetchFromTmdb(id: string) {
    const numId = Number(id);
    if (!numId) return;
    this.isLoadingTmdb.set(true);
    try {
      const movie = await this.tmdb.getMovieDetails(numId);
      this.tmdbMovie.set(movie);
    } catch {
      this.tmdbMovie.set(null);
    }
    this.isLoadingTmdb.set(false);
  }

  async addToBacklog() {
    const m = this.tmdbMovie();
    if (!m) return;
    await this.repo.addMovieToBacklog(m.id, { status: 'pending' });
    this.router.navigate(['/backlog']);
  }

  async updateStatus(newStatus: 'pending' | 'watched' | 'dropped') {
    const current = this.movieData();
    if (current) {
      await this.repo.updateMovieStatus(current.id, newStatus);
    }
  }

  async updateRating(star: number, event?: MouseEvent) {
    let val = star;
    if (event) {
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const x = event.clientX - rect.left;
      if (x < rect.width / 2) {
        val = star - 0.5;
      }
    }
    const current = this.movieData();
    if (current) {
      await this.repo.updateMovieRating(current.id, val);
    }
  }
}
