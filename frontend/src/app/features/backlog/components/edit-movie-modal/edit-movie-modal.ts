import { Component, input, output, signal, effect, inject, viewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HybridMovie } from '../../../../core/interfaces/movie.interface';
import { ExportService } from '../../../../core/services/export.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
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
  ratingTouched = signal(false);

  private exportService = inject(ExportService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private shareCardRef = viewChild<ReviewShareCardComponent>('shareCard');

  ratingError = computed(() => {
    if (!this.ratingTouched() || this.status() !== 'watched') return '';
    if (this.rating() === 0) return 'Selecciona una nota para la película.';
    return '';
  });

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
    this.ratingTouched.set(true);

    if (this.ratingError()) return;

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
    this.ratingTouched.set(true);
  }

  async exportReview() {
    const card = this.shareCardRef();
    if (!card) return;
    this.isExporting.set(true);
    this.exportMessage.set('Generando imagen...');
    const el = card.elementRef.nativeElement as HTMLElement;
    if (!el) {
      this.exportMessage.set('No se pudo generar la imagen');
      this.toast.error('No se pudo generar la imagen');
      this.isExporting.set(false);
      return;
    }
    const ok = await this.exportService.exportReviewAsPng(
      el,
      this.exportService.buildFilename(this.movie())
    );
    if (ok) {
      this.exportMessage.set('Imagen descargada');
      this.toast.success('Imagen descargada correctamente');
    } else {
      this.exportMessage.set('Error al exportar');
      this.toast.error('Error al exportar la imagen');
    }
    this.isExporting.set(false);
    setTimeout(() => this.exportMessage.set(''), 2500);
  }

  get currentUserName(): string {
    return this.auth.user()?.name || 'FilmStack User';
  }
}
