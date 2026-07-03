import { Component, signal, effect, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TmdbService } from '../../../../core/services/tmdb.service';
import { FilmRepositoryService } from '../../../backlog/services/film-repository.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TMDbMovie } from '../../../../core/interfaces/movie.interface';
import { MovieDetailModalComponent } from '../../../../shared/components/movie-detail-modal/movie-detail-modal';
import { AddMovieModalComponent } from '../add-movie-modal/add-movie-modal';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, MovieDetailModalComponent, AddMovieModalComponent],
  templateUrl: './search-view.html',
  styleUrl: './search-view.css'
})
export class SearchComponent implements OnInit {
  private tmdbService = inject(TmdbService);
  private repo = inject(FilmRepositoryService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  public auth = inject(AuthService);

  searchQuery = signal<string>('');
  searchResults = signal<TMDbMovie[]>([]);
  isLoading = signal<boolean>(false);

  genres = signal<{id: number, name: string}[]>([]);
  selectedGenre = signal<number | null>(null);
  selectedYear = signal<number | null>(null);
  minRating = signal<number>(0);

  appliedFilters = signal<{ genre: number | null, year: number | null, rating: number }>({ 
    genre: null, 
    year: null, 
    rating: 0 
  });

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

  selectedMovie = signal<TMDbMovie | null>(null);
  selectedMovieStats = signal<any | null>(null);
  isInfoModalOpen = signal<boolean>(false);
  isAddModalOpen = signal<boolean>(false);

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const query = this.searchQuery();
      if (this.searchTimeout !== null) {
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
          this.toast.error('Error al buscar películas');
          this.searchResults.set([]);
        } finally {
          this.isLoading.set(false);
        }
      }, 500);
    });
  }

  async ngOnInit() {
    try {
      const genres = await this.tmdbService.getGenres();
      this.genres.set(genres);
    } catch (e) {
      this.toast.error('Error al cargar géneros');
    }
    this.route.queryParamMap.subscribe(params => {
      const q = params.get('q');
      if (q) {
        this.searchQuery.set(q);
      }
    });
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

  async openInfo(movie: TMDbMovie) {
    this.selectedMovie.set(movie);
    this.selectedMovieStats.set(null); 
    this.isInfoModalOpen.set(true);
    
    try {
      const [fullDetails, stats] = await Promise.all([
        this.tmdbService.getMovieDetails(movie.id),
        this.repo.getMovieStats(movie.id)
      ]);
      
      this.selectedMovie.set(fullDetails);
      this.selectedMovieStats.set(stats);
    } catch (e) {
      this.toast.error('Error al obtener detalles de la película');
    }
  }

  openAdd(movie: TMDbMovie) {
    this.selectedMovie.set(movie);
    this.isInfoModalOpen.set(false);
    this.isAddModalOpen.set(true);
  }

  async onAddConfirm(options: { status: 'pending' | 'watched' | 'dropped'; rating: number; review: string; is_favorite: boolean }) {
    const movie = this.selectedMovie();
    if (movie) {
      await this.repo.addMovieToBacklog(movie.id, options);
      this.isAddModalOpen.set(false);
      this.selectedMovie.set(null);
    }
  }

  isMovieInBacklog(tmdbId: number): boolean {
    return this.repo.hybridMovies().some(m => m.tmdb_id === tmdbId);
  }
}
