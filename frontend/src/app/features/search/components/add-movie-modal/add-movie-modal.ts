import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TMDbMovie } from '../../../../core/interfaces/movie.interface';

@Component({
  selector: 'app-add-movie-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-movie-modal.html',
  styleUrl: './add-movie-modal.css'
})
export class AddMovieModalComponent {
  isOpen = input.required<boolean>();
  movie = input.required<TMDbMovie>();
  
  save = output<{ status: 'pending' | 'watched' | 'dropped'; rating: number; review: string; is_favorite: boolean }>();
  cancel = output<void>();

  status = signal<'pending' | 'watched' | 'dropped'>('pending');
  rating = signal<number>(0);
  review = signal<string>('');
  isFavorite = signal<boolean>(false);
  ratingTouched = signal(false);

  ratingError = computed(() => {
    if (!this.ratingTouched() || this.status() !== 'watched') return '';
    if (this.rating() === 0) return 'Selecciona una nota para la película.';
    return '';
  });

  onSave() {
    this.ratingTouched.set(true);

    if (this.ratingError()) return;

    this.save.emit({
      status: this.status(),
      rating: this.status() === 'watched' ? this.rating() : 0,
      review: this.status() === 'watched' ? this.review() : '',
      is_favorite: this.isFavorite()
    });
    this.reset();
  }

  onCancel() {
    this.cancel.emit();
    this.reset();
  }

  private reset() {
    this.status.set('pending');
    this.rating.set(0);
    this.review.set('');
    this.isFavorite.set(false);
    this.ratingTouched.set(false);
  }

  setRating(star: number, event?: MouseEvent) {
    let val = star;
    if (event) {
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const x = event.clientX - rect.left;
      if (x < rect.width / 2) {
        val = star - 0.5;
      }
    }
    this.rating.set(val);
    this.ratingTouched.set(true);
  }
}
