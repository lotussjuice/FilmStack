import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import PocketBase from 'pocketbase';
import { Movie } from '../interfaces/movie.interface';
import { UserSummary } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class PocketbaseService {
  private pb: PocketBase;
  private router = inject(Router);

  constructor() {
    this.pb = new PocketBase('/');
    this.pb.afterSend = (response, data) => {
      if (response.status === 401) {
        this.pb.authStore.clear();
        this.router.navigate(['/login']);
      }
      return data;
    };
  }

  collection(name: string) {
    return this.pb.collection(name);
  }

  get authStore() {
    return this.pb.authStore;
  }

  async getMovies(): Promise<Movie[]> {
    const userId = this.pb.authStore.record?.id;
    if (!userId) return [];
    try {
      return await this.pb.collection('movies').getFullList<Movie>({
        filter: `user_id = "${userId}"`,
        sort: '-created'
      });
    } catch {
      return [];
    }
  }

  async addMovie(movie: Omit<Movie, 'id'>): Promise<Movie> {
    const payload = { 
      ...movie,
      id: this.generateId()
    } as any;
    return this.pb.collection('movies').create<Movie>(payload);
  }

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

  async fetchUsersByIds(ids: string[]): Promise<Map<string, UserSummary>> {
    const map = new Map<string, UserSummary>();
    if (ids.length === 0) return map;
    try {
      const filter = ids.map(id => `id = "${this.escapeFilterValue(id)}"`).join(' || ');
      const records = await this.pb.collection('users').getFullList({
        filter,
        fields: 'id,name,email',
        $autoCancel: false
      });
      for (const r of records as any[]) {
        map.set(r.id, { id: r.id, name: r['name'] || 'Sin nombre', email: r['email'] || '' });
      }
    } catch (e: any) {
      console.error('Error fetching users by ids:', e?.message || e);
    }
    return map;
  }

  private escapeFilterValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
}
