import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilmRepositoryService } from '../../../backlog/services/film-repository.service';
import { RuntimePipe } from '../../../../shared/pipes/runtime.pipe';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RuntimePipe],
  templateUrl: './movie-detail-view.html',
  styleUrl: './movie-detail-view.css'
})
export class MovieDetailComponent {
  private repo = inject(FilmRepositoryService);

  movieId = input.required<string>();

  movieData = computed(() => {
    const id = this.movieId();
    const numId = Number(id);
    return this.repo.hybridMovies().find(m => m.id === id || (numId && m.tmdb_id === numId));
  });

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
}
