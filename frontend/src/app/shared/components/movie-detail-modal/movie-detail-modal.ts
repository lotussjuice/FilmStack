import { Component, input, output, computed, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TMDbMovie, MovieStats } from '../../../core/interfaces/movie.interface';
import { RuntimePipe } from '../../pipes/runtime.pipe';
import { SafePipe } from '../../pipes/safe.pipe';
import { MovieReviewsService, MovieReview } from '../../../features/reviews/services/movie-reviews.service';

@Component({
  selector: 'app-movie-detail-modal',
  standalone: true,
  imports: [CommonModule, RuntimePipe, SafePipe],
  templateUrl: './movie-detail-modal.html',
  styleUrl: './movie-detail-modal.css'
})
export class MovieDetailModalComponent {
  isOpen = input.required<boolean>();
  movie = input.required<TMDbMovie>();
  stats = input<MovieStats>();
  isAlreadyInBacklog = input<boolean>(false);

  add = output<void>();
  close = output<void>();

  private reviewsService = inject(MovieReviewsService);

  activeTab = signal<'info' | 'reviews'>('info');
  reviews = signal<MovieReview[]>([]);
  reviewsLoading = signal(false);

  mainTrailer = computed(() => {
    const videos = this.movie().videos?.results || [];
    return videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') || videos[0];
  });

  constructor() {
    effect(() => {
      const m = this.movie();
      if (m && this.isOpen() && this.activeTab() === 'reviews') {
        this.loadReviews(m.id);
      }
    });
  }

  getProfileImage(path: string | null) {
    return path ? `https://image.tmdb.org/t/p/w200${path}` : 'assets/no-profile.png';
  }

  onAdd() {
    this.add.emit();
  }

  onClose() {
    this.close.emit();
  }

  switchTab(tab: 'info' | 'reviews') {
    this.activeTab.set(tab);
    if (tab === 'reviews' && this.movie()) {
      this.loadReviews(this.movie().id);
    }
  }

  private async loadReviews(tmdbId: number) {
    this.reviewsLoading.set(true);
    const data = await this.reviewsService.getReviewsForMovie(tmdbId);
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
}
