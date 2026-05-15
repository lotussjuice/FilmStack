import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilmRepositoryService } from '../../core/services/film-repository.service';
import { RuntimePipe } from '../../shared/pipes/runtime.pipe';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RuntimePipe],
  templateUrl: './movie-detail.html',
  styleUrl: './movie-detail.css'
})
export class MovieDetailComponent {
  private repo = inject(FilmRepositoryService);

  // Using input signal for the movie ID (useful if used in routing)
  movieId = input.required<string>();

  movieData = computed(() => {
    return this.repo.hybridMovies().find(m => m.id === this.movieId());
  });

  async updateStatus(newStatus: 'pending' | 'watched' | 'dropped') {
    const current = this.movieData();
    if (current) {
      await this.repo.updateMovieStatus(current.id, newStatus);
    }
  }

  async updateRating(newRating: number) {
    const current = this.movieData();
    if (current) {
      await this.repo.updateMovieRating(current.id, newRating);
    }
  }
}
