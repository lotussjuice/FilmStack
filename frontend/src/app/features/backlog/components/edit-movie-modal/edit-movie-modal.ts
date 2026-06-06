import { Component, input, output, signal, effect, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HybridMovie } from '../../../../models/movie.model';
import { ExportService } from '../../../../core/services/export.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ReviewShareCardComponent } from '../review-share-card/review-share-card';

@Component({
  selector: 'app-edit-movie-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReviewShareCardComponent],
  templateUrl: './edit-movie-modal.html',
  styleUrl: './edit-movie-modal.css'
})
export class EditMovieModalComponent {
  isOpen = input.required<boolean>();
  movie = input.required<HybridMovie>();

  save = output<{ status: 'pending' | 'watched' | 'dropped'; rating: number; review: string; is_favorite: boolean }>();
  cancel = output<void>();

  status = signal<'pending' | 'watched' | 'dropped'>('pending');
  rating = signal<number>(0);
  review = signal<string>('');
  isFavorite = signal<boolean>(false);
  isExporting = signal<boolean>(false);
  exportMessage = signal<string>('');

  private exportService = inject(ExportService);
  private auth = inject(AuthService);
  private shareCardRef = viewChild<ReviewShareCardComponent>('shareCard');

  constructor() {
    effect(() => {
      const m = this.movie();
      if (m) {
        this.status.set(m.status);
        this.rating.set(m.rating || 0);
        this.review.set(m.review || '');
        this.isFavorite.set(m.is_favorite || false);
      }
    });
  }

  onSave() {
    this.save.emit({
      status: this.status(),
      rating: this.status() === 'watched' ? this.rating() : 0,
      review: this.status() === 'watched' ? this.review() : '',
      is_favorite: this.isFavorite()
    });
  }

  onCancel() {
    this.cancel.emit();
  }

  setRating(val: number) {
    this.rating.set(val);
  }

  async exportReview() {
    const card = this.shareCardRef();
    if (!card) return;
    this.isExporting.set(true);
    this.exportMessage.set('Generando imagen...');
    const el = card.elementRef.nativeElement as HTMLElement;
    if (!el) {
      this.exportMessage.set('No se pudo generar la imagen');
      this.isExporting.set(false);
      return;
    }
    const ok = await this.exportService.exportReviewAsPng(
      el,
      this.exportService.buildFilename(this.movie())
    );
    this.exportMessage.set(ok ? 'Imagen descargada' : 'Error al exportar');
    this.isExporting.set(false);
    setTimeout(() => this.exportMessage.set(''), 2500);
  }

  get currentUserName(): string {
    return this.auth.user()?.name || 'FilmStack User';
  }
}
