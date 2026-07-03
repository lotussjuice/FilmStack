import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TMDbMovie } from '../interfaces/movie.interface';

@Injectable({
  providedIn: 'root'
})
export class TmdbService {
  private http = inject(HttpClient);
  // Llamamos a nuestro backend PocketBase que actúa como proxy
  private baseUrl = '/api/tmdb';

  // Busca películas por texto utilizando el proxy
  async searchMovies(query: string): Promise<TMDbMovie[]> {
    if (!query.trim()) return [];
    
    const url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}`;
    const response = await firstValueFrom(this.http.get<any>(url));
    return response.results;
  }

  // Obtiene los detalles completos de una película por su ID de TMDB
  async getMovieDetails(tmdbId: number): Promise<TMDbMovie> {
    const url = `${this.baseUrl}/movie/${tmdbId}`;
    return firstValueFrom(this.http.get<TMDbMovie>(url));
  }

  // Obtiene la lista de géneros disponibles
  async getGenres(): Promise<{id: number, name: string}[]> {
    const url = `${this.baseUrl}/genres`;
    const response = await firstValueFrom(this.http.get<any>(url));
    return response.genres;
  }
}
