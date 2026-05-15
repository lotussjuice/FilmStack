import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TMDbMovie } from '../../../models/movie.model';

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
  
  save = output<any>();
  cancel = output<void>();

  status = signal<'pending' | 'watched' | 'dropped'>('pending');
  rating = signal<number>(0);
  review = signal<string>('');
  isFavorite = signal<boolean>(false);

  onSave() {
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
  }

  setRating(val: number) {
    this.rating.set(val);
  }
}
