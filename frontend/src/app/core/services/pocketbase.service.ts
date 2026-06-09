import { Injectable } from '@angular/core';
import PocketBase from 'pocketbase';
import { Movie } from '../interfaces/movie.interface';

@Injectable({
  providedIn: 'root'
})
export class PocketbaseService {
  public pb: PocketBase;

  constructor() {
    this.pb = new PocketBase('/');
  }

  // Obtiene la lista de películas del usuario actual
  async getMovies(): Promise<Movie[]> {
    const userId = this.pb.authStore.record?.id;
    if (!userId) return [];
    
    return this.pb.collection('movies').getFullList<Movie>({
      filter: `user_id = "${userId}"`,
      sort: '-created'
    });
  }

  // Añade una nueva película con un ID generado manualmente (necesario para ciertas versiones de PB)
  async addMovie(movie: Omit<Movie, 'id'>): Promise<Movie> {
    const payload = { 
      ...movie,
      id: this.generateId()
    } as any;
    return this.pb.collection('movies').create<Movie>(payload);
  }

  // Genera un ID compatible con PocketBase (15 caracteres alfanuméricos)
  private generateId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 15; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async updateMovie(id: string, data: Partial<Movie>): Promise<Movie> {
    return this.pb.collection('movies').update<Movie>(id, data);
  }

  async deleteMovie(id: string): Promise<boolean> {
    return this.pb.collection('movies').delete(id);
  }

  // Obtiene las estadísticas de la comunidad para una película específica
  async getMovieStats(tmdbId: number): Promise<any> {
    try {
      return await this.pb.collection('rankings').getOne(tmdbId.toString());
    } catch (e) {
      return { avg_rating: 0, total_votes: 0 };
    }
  }
}
