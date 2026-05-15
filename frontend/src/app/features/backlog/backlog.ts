import { Component, computed, inject, signal } from '@angular/core'
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FilmRepositoryService } from '../../core/services/film-repository.service';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal';
import { EditMovieModalComponent } from '../../shared/components/edit-movie-modal/edit-movie-modal';
import { MovieDetailModalComponent } from '../../shared/components/movie-detail-modal/movie-detail-modal';
import { HybridMovie } from '../../models/movie.model';

@Component({
  selector: 'app-backlog',
  standalone: true,
  imports: [CommonModule, RouterModule, ConfirmModalComponent, EditMovieModalComponent, MovieDetailModalComponent],
  templateUrl: './backlog.html',
  styleUrl: './backlog.css'
})
export class BacklogComponent {
  private repo = inject(FilmRepositoryService);

  filterStatus = signal<'all' | 'pending' | 'watched' | 'dropped'>('all');
  
  // Control del modal de eliminación
  isDeleteModalOpen = signal(false);
  movieIdToDelete = signal<string | null>(null);

  // Control de otros modales (Edición e Info)
  isEditModalOpen = signal(false);
  isInfoModalOpen = signal(false);
  selectedMovie = signal<HybridMovie | null>(null);

  // Filtra las películas según el estado seleccionado (Vistas, Pendientes, Abandonadas)
  filteredMovies = computed(() => {
    const all = this.repo.hybridMovies();
    const status = this.filterStatus();
    
    if (status === 'all') return all;
    return all.filter(m => m.status === status);
  });

  setFilter(status: 'all' | 'pending' | 'watched' | 'dropped') {
    this.filterStatus.set(status);
  }

  // Solicita confirmación para eliminar una película
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

  async onEditConfirm(data: any) {
    const movie = this.selectedMovie();
    if (movie) {
      await this.repo.updateMovie(movie.id, data);
      this.isEditModalOpen.set(false);
      this.selectedMovie.set(null);
    }
  }
}
