import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HybridMovie } from '../../../models/movie.model';

@Component({
  selector: 'app-edit-movie-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-movie-modal.html',
  styleUrl: './edit-movie-modal.css'
})
export class EditMovieModalComponent {
  isOpen = input.required<boolean>();
  movie = input.required<HybridMovie>();
  
  save = output<any>();
  cancel = output<void>();

  status = signal<'pending' | 'watched' | 'dropped'>('pending');
  rating = signal<number>(0);
  review = signal<string>('');
  isFavorite = signal<boolean>(false);

  constructor() {
    effect(() => {
      const m = this.movie();
      if (m) {
        this.status.set(m.status);
        this.rating.set(m.rating || 0);
        this.review.set(m.review || '');
        this.isFavorite.set(m.is_favorite || false);
      }
    }, { allowSignalWrites: true });
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
}
