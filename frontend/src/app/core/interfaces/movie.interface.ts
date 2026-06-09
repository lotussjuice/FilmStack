export interface Movie {
  id: string;
  tmdb_id: number;
  status: 'pending' | 'watched' | 'dropped';
  rating: number;
  is_favorite: boolean;
  review?: string;
  user_id: string;
}

export interface TMDbMovie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  overview: string;
  release_date: string;
  runtime?: number;
  genres?: { id: number; name: string }[];
  genre_ids?: number[];
  vote_average?: number;
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null }[];
  };
  videos?: {
    results: { id: string; key: string; name: string; site: string; type: string }[];
  };
}

export interface MovieStats {
  tmdb_id: number;
  avg_rating: number;
  total_votes: number;
  group_votes?: number;
}

export interface HybridMovie extends Movie {
  tmdb_data?: TMDbMovie;
  stats?: MovieStats;
}
