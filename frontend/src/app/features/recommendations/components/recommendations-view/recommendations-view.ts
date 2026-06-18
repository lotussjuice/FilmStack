import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RecommendationsService, RecommendationRow } from '../../services/recommendations.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-recommendations-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recommendations-view.html',
  styleUrl: './recommendations-view.css'
})
export class RecommendationsComponent implements OnInit {
  private recsService = inject(RecommendationsService);
  private router = inject(Router);
  private toast = inject(ToastService);

  rows = signal<RecommendationRow[]>([]);
  isLoading = signal(true);

  async ngOnInit() {
    this.isLoading.set(true);
    try {
      const data = await this.recsService.buildRecommendations();
      this.rows.set(data);
    } catch {
      this.toast.error('Error al cargar recomendaciones');
    }
    this.isLoading.set(false);
  }

  getPosterUrl(path: string | null): string {
    return path ? `https://image.tmdb.org/t/p/w300${path}` : 'assets/no-poster.png';
  }

  scrollLeft(event: Event, rowIdx: number) {
    const container = (event.currentTarget as HTMLElement).closest('.carousel-container')?.querySelector('.carousel-track') as HTMLElement;
    if (container) container.scrollBy({ left: -300, behavior: 'smooth' });
  }

  scrollRight(event: Event, rowIdx: number) {
    const container = (event.currentTarget as HTMLElement).closest('.carousel-container')?.querySelector('.carousel-track') as HTMLElement;
    if (container) container.scrollBy({ left: 300, behavior: 'smooth' });
  }

  openDetail(movieId: number) {
    this.router.navigate(['/movie', movieId]);
  }
}
