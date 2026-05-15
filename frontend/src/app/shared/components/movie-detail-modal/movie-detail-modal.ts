import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TMDbMovie, MovieStats } from '../../../models/movie.model';
import { RuntimePipe } from '../../../shared/pipes/runtime.pipe';
import { SafePipe } from '../../../shared/pipes/safe.pipe';

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

  mainTrailer = computed(() => {
    const videos = this.movie().videos?.results || [];
    return videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') || videos[0];
  });

  getProfileImage(path: string | null) {
    return path ? `https://image.tmdb.org/t/p/w200${path}` : 'assets/no-profile.png';
  }

  onAdd() {
    this.add.emit();
  }

  onClose() {
    this.close.emit();
  }
}
