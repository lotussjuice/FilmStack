import { Component, input, computed, ChangeDetectionStrategy, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HybridMovie } from '../../../../models/movie.model';

@Component({
  selector: 'app-review-share-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './review-share-card.html',
  styleUrl: './review-share-card.css'
})
export class ReviewShareCardComponent {
  movie = input.required<HybridMovie>();
  userName = input.required<string>();

  private cardRef = viewChild<ElementRef<HTMLElement>>('card');

  get elementRef(): ElementRef<HTMLElement> {
    const el = this.cardRef()?.nativeElement;
    if (el) return new ElementRef<HTMLElement>(el);
    return new ElementRef<HTMLElement>(document.createElement('div'));
  }

  posterUrl = computed(() => {
    const path = this.movie().tmdb_data?.poster_path;
    return path ? `https://image.tmdb.org/t/p/w500${path}?export=${Date.now()}` : '';
  });

  ratingStars = computed(() => {
    const rating = this.movie().rating || 0;
    return Array.from({ length: 5 }, (_, i) => i < rating);
  });

  year = computed(() => {
    const d = this.movie().tmdb_data?.release_date;
    return d ? new Date(d).getFullYear() : '';
  });

  reviewDate = computed<string>(() => {
    const m = this.movie() as any;
    const raw = m.updated || m.created;
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    return new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  });

  hasReviewText = computed<boolean>(() => !!this.movie().review && this.movie().review!.trim().length > 0);
}
