import { Component, input, computed, inject, signal, effect } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FilmRepositoryService } from '../../../backlog/services/film-repository.service';
import { TmdbService } from '../../../../core/services/tmdb.service';
import { ActiveSessionService } from '../../../roulette/services/active-session.service';
import { MovieReviewsService, MovieReview } from '../../../reviews/services/movie-reviews.service';
import { RuntimePipe } from '../../../../shared/pipes/runtime.pipe';
import { SafePipe } from '../../../../shared/pipes/safe.pipe';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RuntimePipe, SafePipe],
  templateUrl: './movie-detail-view.html',
  styleUrl: './movie-detail-view.css'
})
export class MovieDetailComponent {
  private repo = inject(FilmRepositoryService);
  private tmdb = inject(TmdbService);
  private router = inject(Router);
  private location = inject(Location);
  private sessionService = inject(ActiveSessionService);
  private reviewsService = inject(MovieReviewsService);

  movieId = input.required<string>();

  tmdbMovie = signal<any>(null);
  isLoadingTmdb = signal(false);
  activeTab = signal<'info' | 'reviews'>('info');
  reviews = signal<MovieReview[]>([]);
  reviewsLoading = signal(false);

  movieData = computed(() => {
    const id = this.movieId();
    const numId = Number(id);
    return this.repo.hybridMovies().find(m => m.id === id || (numId && m.tmdb_id === numId));
  });

  currentMovie = computed(() => {
    const local = this.movieData();
    if (local?.tmdb_data) return local.tmdb_data;
    return this.tmdbMovie();
  });

  isInBacklog = computed(() => !!this.movieData());

  isWatching = computed(() => {
    const m = this.currentMovie();
    if (!m) return false;
    const s = this.sessionService.session();
    return !!s && s.tmdbId === m.id;
  });

  mainTrailer = computed(() => {
    const m = this.currentMovie();
    const videos = m?.videos?.results || [];
    return videos.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') || videos[0];
  });

  stats = computed(() => this.movieData()?.stats || null);

  constructor() {
    effect(() => {
      const id = this.movieId();
      const local = this.movieData();
      if (!local && id) {
        this.fetchFromTmdb(id);
      }
    });
  }

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
    const m = this.currentMovie();
    if (!m) return;
    await this.repo.addMovieToBacklog(m.id, { status: 'pending' });
  }

  async startWatching() {
    const m = this.currentMovie();
    if (!m) return;
    if (!this.isInBacklog()) {
      await this.repo.addMovieToBacklog(m.id, { status: 'watched' });
    } else {
      const local = this.movieData();
      if (local) {
        await this.repo.updateMovieStatus(local.id, 'watched');
      }
    }
    this.sessionService.start({
      tmdbId: m.id,
      title: m.title,
      posterPath: m.poster_path,
      year: m.release_date ? new Date(m.release_date).getFullYear().toString() : '',
      source: 'direct'
    });
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

  goBack() {
    this.location.back();
  }

  switchTab(tab: 'info' | 'reviews') {
    this.activeTab.set(tab);
    if (tab === 'reviews') {
      this.loadReviews();
    }
  }

  private async loadReviews() {
    const m = this.currentMovie();
    if (!m) return;
    this.reviewsLoading.set(true);
    const data = await this.reviewsService.getReviewsForMovie(m.id);
    this.reviews.set(data);
    this.reviewsLoading.set(false);
  }

  getFriendReviews(): MovieReview[] {
    return this.reviews().filter(r => r.is_friend);
  }

  getOtherReviews(): MovieReview[] {
    return this.reviews().filter(r => !r.is_friend);
  }

  getStarArray(rating: number): ('full' | 'half' | 'empty')[] {
    return Array.from({ length: 5 }, (_, i) => {
      const star = i + 1;
      if (rating >= star) return 'full';
      if (rating >= star - 0.5) return 'half';
      return 'empty';
    });
  }

  getProfileImage(path: string | null) {
    return path ? `https://image.tmdb.org/t/p/w200${path}` : 'assets/no-profile.png';
  }
}
