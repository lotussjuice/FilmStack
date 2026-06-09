import { Component, computed, inject, signal, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FilmRepositoryService } from '../../../../core/services/film-repository.service';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal';
import { EditMovieModalComponent } from '../edit-movie-modal/edit-movie-modal';
import { MovieDetailModalComponent } from '../movie-detail-modal/movie-detail-modal';
import { BacklogCardComponent } from '../backlog-card/backlog-card';
import { HybridMovie } from '../../../../core/interfaces/movie.interface';

@Component({
  selector: 'app-backlog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ConfirmModalComponent, EditMovieModalComponent, MovieDetailModalComponent, BacklogCardComponent],
  templateUrl: './backlog-view.html',
  styleUrl: './backlog-view.css'
})
export class BacklogComponent implements OnInit {
  private repo = inject(FilmRepositoryService);
  private route = inject(ActivatedRoute);

  filterStatus = signal<'all' | 'pending' | 'watched' | 'dropped'>('all');
  filterTitle = signal<string>('');
  filterMinRating = signal<number>(0);
  filterFavoritesOnly = signal<boolean>(false);
  
  isDeleteModalOpen = signal(false);
  movieIdToDelete = signal<string | null>(null);

  isEditModalOpen = signal(false);
  isInfoModalOpen = signal(false);
  selectedMovie = signal<HybridMovie | null>(null);

  filteredMovies = computed(() => {
    let all = this.repo.hybridMovies();
    const status = this.filterStatus();
    const title = this.filterTitle().trim().toLowerCase();
    const minRating = this.filterMinRating();
    const favoritesOnly = this.filterFavoritesOnly();
    
    if (status !== 'all') all = all.filter(m => m.status === status);
    if (title) all = all.filter(m => (m.tmdb_data?.title || '').toLowerCase().includes(title));
    if (minRating > 0) all = all.filter(m => (m.rating || 0) >= minRating);
    if (favoritesOnly) all = all.filter(m => m.is_favorite);
    
    return all;
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const editTmdbId = params.get('edit');
      if (editTmdbId) {
        const tmdbIdNum = Number(editTmdbId);
        const movie = this.repo.hybridMovies().find(m => m.tmdb_id === tmdbIdNum);
        if (movie) {
          setTimeout(() => this.openEdit(movie), 100);
        }
      }
    });
  }

  setFilter(status: 'all' | 'pending' | 'watched' | 'dropped') {
    this.filterStatus.set(status);
  }

  onTitleFilter(value: string) {
    this.filterTitle.set(value);
  }

  toggleFavoritesOnly() {
    this.filterFavoritesOnly.update(v => !v);
  }

  resetFilters() {
    this.filterStatus.set('all');
    this.filterTitle.set('');
    this.filterMinRating.set(0);
    this.filterFavoritesOnly.set(false);
  }

  requestRemove(id: string, event: Event) {
    event.stopPropagation();
    this.movieIdToDelete.set(id);
    this.isDeleteModalOpen.set(true);
  }

  async confirmRemove() {
    const id = this.movieIdToDelete();
    if (id) {
      await this.repo.removeMovie(id);
    }
    this.closeDeleteModal();
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.movieIdToDelete.set(null);
  }

  openEdit(movie: HybridMovie) {
    this.selectedMovie.set(movie);
    this.isEditModalOpen.set(true);
    this.isInfoModalOpen.set(false);
  }

  openInfo(movie: HybridMovie) {
    this.selectedMovie.set(movie);
    this.isInfoModalOpen.set(true);
    this.isEditModalOpen.set(false);
  }

  async onEditConfirm(data: { status: 'pending' | 'watched' | 'dropped'; rating: number; review: string; is_favorite: boolean }) {
    const movie = this.selectedMovie();
    if (movie) {
      await this.repo.updateMovie(movie.id, data);
    }
    this.isEditModalOpen.set(false);
    this.selectedMovie.set(null);
  }

  onEditCancel() {
    this.isEditModalOpen.set(false);
    this.selectedMovie.set(null);
  }
}
