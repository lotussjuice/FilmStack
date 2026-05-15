import { Component, signal, effect, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TmdbService } from '../../core/services/tmdb.service';
import { FilmRepositoryService } from '../../core/services/film-repository.service';
import { AuthService } from '../../core/services/auth.service';
import { PocketbaseService } from '../../core/services/pocketbase.service';
import { TMDbMovie } from '../../models/movie.model';
import { MovieDetailModalComponent } from '../../shared/components/movie-detail-modal/movie-detail-modal';
import { AddMovieModalComponent } from '../../shared/components/add-movie-modal/add-movie-modal';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, MovieDetailModalComponent, AddMovieModalComponent],
  templateUrl: './search.html',
  styleUrl: './search.css'
})
export class SearchComponent implements OnInit {
  private tmdbService = inject(TmdbService);
  private repo = inject(FilmRepositoryService);
  private pbService = inject(PocketbaseService);
  public auth = inject(AuthService);

  searchQuery = signal<string>('');
  searchResults = signal<TMDbMovie[]>([]);
  isLoading = signal<boolean>(false);

  // Filtros
  genres = signal<{id: number, name: string}[]>([]);
  selectedGenre = signal<number | null>(null);
  selectedYear = signal<number | null>(null);
  minRating = signal<number>(0);

  // Estado aplicado de los filtros
  appliedFilters = signal<{ genre: number | null, year: number | null, rating: number }>({ 
    genre: null, 
    year: null, 
    rating: 0 
  });

  // Resultados filtrados (basados en filtros aplicados)
  filteredResults = computed(() => {
    let results = this.searchResults();
    const { genre, year, rating } = this.appliedFilters();

    if (genre) {
      results = results.filter(m => m.genre_ids?.includes(genre));
    }
    if (year) {
      results = results.filter(m => m.release_date && new Date(m.release_date).getFullYear() === year);
    }
    if (rating > 0) {
      results = results.filter(m => m.vote_average ? m.vote_average >= rating : false);
    }

    return results;
  });

  // Estado de los modales
  selectedMovie = signal<TMDbMovie | null>(null);
  selectedMovieStats = signal<any | null>(null);
  isInfoModalOpen = signal<boolean>(false);
  isAddModalOpen = signal<boolean>(false);

  private searchTimeout: any;

  constructor() {
    // Efecto para manejar la búsqueda con debounce
    effect(() => {
      const query = this.searchQuery();
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      
      if (!query.trim()) {
        this.searchResults.set([]);
        this.isLoading.set(false);
        return;
      }

      this.isLoading.set(true);
      this.searchTimeout = setTimeout(async () => {
        try {
          const results = await this.tmdbService.searchMovies(query);
          this.searchResults.set(results);
        } catch (e) {
          console.error('Error al buscar películas:', e);
          this.searchResults.set([]);
        } finally {
          this.isLoading.set(false);
        }
      }, 500); 
    }, { allowSignalWrites: true });
  }

  async ngOnInit() {
    try {
      const genres = await this.tmdbService.getGenres();
      this.genres.set(genres);
    } catch (e) {
      console.error('Error al cargar géneros:', e);
    }
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  applyFilters() {
    this.appliedFilters.set({
      genre: this.selectedGenre(),
      year: this.selectedYear(),
      rating: this.minRating()
    });
  }

  resetFilters() {
    this.selectedGenre.set(null);
    this.selectedYear.set(null);
    this.minRating.set(0);
    this.applyFilters();
  }

  // Abre el modal de información y carga detalles adicionales + estadísticas
  async openInfo(movie: TMDbMovie) {
    this.selectedMovie.set(movie);
    this.selectedMovieStats.set(null); 
    this.isInfoModalOpen.set(true);
    
    try {
      const [fullDetails, stats] = await Promise.all([
        this.tmdbService.getMovieDetails(movie.id),
        this.pbService.getMovieStats(movie.id)
      ]);
      
      this.selectedMovie.set(fullDetails);
      this.selectedMovieStats.set(stats);
    } catch (e) {
      console.error('Error al obtener detalles/estadísticas:', e);
    }
  }

  openAdd(movie: TMDbMovie) {
    this.selectedMovie.set(movie);
    this.isInfoModalOpen.set(false);
    this.isAddModalOpen.set(true);
  }

  async onAddConfirm(options: any) {
    const movie = this.selectedMovie();
    if (movie) {
      await this.repo.addMovieToBacklog(movie.id, options);
      this.isAddModalOpen.set(false);
      this.selectedMovie.set(null);
    }
  }

  // Comprueba si una película ya existe en el backlog del usuario
  isMovieInBacklog(tmdbId: number): boolean {
    return this.repo.hybridMovies().some(m => m.tmdb_id === tmdbId);
  }
}
