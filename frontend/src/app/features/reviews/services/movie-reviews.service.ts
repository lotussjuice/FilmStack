import { Injectable, inject } from '@angular/core';
import { PocketbaseService } from '../../../core/services/pocketbase.service';

export interface MovieReview {
  id: string;
  tmdb_id: number;
  user_id: string;
  user_name: string;
  rating: number;
  review_text: string;
  source: 'backlog' | 'watchparty';
  created: string;
  is_friend?: boolean;
}

@Injectable({ providedIn: 'root' })
export class MovieReviewsService {
  private pb = inject(PocketbaseService);

  async getReviewsForMovie(tmdbId: number): Promise<MovieReview[]> {
    try {
      const res = await fetch(`/api/reviews/movie/${tmdbId}`, {
        headers: { Authorization: `Bearer ${this.pb.authStore.token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.reviews || [];
    } catch {
      return [];
    }
  }

  async addReview(data: { tmdb_id: number; rating: number; review_text: string; source: 'backlog' | 'watchparty' }): Promise<boolean> {
    const user = this.pb.authStore.record;
    if (!user) return false;
    try {
      await this.pb.collection('movie_reviews').create({
        tmdb_id: data.tmdb_id,
        user: user.id,
        user_name: user['name'] || 'Usuario',
        rating: data.rating,
        review_text: data.review_text,
        source: data.source
      }, { $autoCancel: false });
      return true;
    } catch {
      return false;
    }
  }

  async updateReview(reviewId: string, data: { rating: number; review_text: string }): Promise<boolean> {
    try {
      await this.pb.collection('movie_reviews').update(reviewId, data, { $autoCancel: false });
      return true;
    } catch {
      return false;
    }
  }

  async deleteReview(reviewId: string): Promise<boolean> {
    try {
      await this.pb.collection('movie_reviews').delete(reviewId);
      return true;
    } catch {
      return false;
    }
  }

  async findUserReviewForMovie(tmdbId: number): Promise<MovieReview | null> {
    const user = this.pb.authStore.record;
    if (!user) return null;
    try {
      const records = await this.pb.collection('movie_reviews').getFullList({
        filter: `tmdb_id = ${tmdbId} && user = "${user.id}"`,
        $autoCancel: false
      });
      return records.length > 0 ? (records[0] as any) : null;
    } catch {
      return null;
    }
  }
}
