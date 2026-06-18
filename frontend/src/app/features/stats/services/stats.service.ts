import { Injectable, inject, signal } from '@angular/core';
import { PocketbaseService } from '../../../core/services/pocketbase.service';

export interface UserStats {
  total: number;
  watched: number;
  pending: number;
  dropped: number;
  favorites: number;
  avgRating: number;
  totalRated: number;
  tmdb_ids: number[];
  monthly_evolution: { month: string; count: number }[];
}

export interface HomeData {
  summary: {
    total: number;
    watched: number;
    pending: number;
    favorites: number;
    avgRating: number;
  };
  lastWatched: {
    tmdb_id: number;
    rating: number;
    review: string;
    updated: string;
  } | null;
  friendsRecent: {
    tmdb_id: number;
    user_name: string;
    user_id: string;
    rating: number;
    review_text: string;
    created: string;
  }[];
}

export interface FriendReview {
  tmdb_id: number;
  user_name: string;
  user_id: string;
  rating: number;
  review_text: string;
  created: string;
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private pb = inject(PocketbaseService);

  async getUserStats(): Promise<UserStats | null> {
    try {
      const res = await fetch('/api/stats/user', {
        headers: { Authorization: `Bearer ${this.pb.authStore.token}` }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async getHomeData(): Promise<HomeData | null> {
    try {
      const res = await fetch('/api/stats/home', {
        headers: { Authorization: `Bearer ${this.pb.authStore.token}` }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async getFriendsRecent(): Promise<FriendReview[]> {
    try {
      const res = await fetch('/api/stats/friends-recent', {
        headers: { Authorization: `Bearer ${this.pb.authStore.token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.reviews || [];
    } catch {
      return [];
    }
  }
}
