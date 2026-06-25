export interface ForumThread {
  id: string;
  title: string;
  content: string;
  author_id: string;
  is_public: boolean;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  last_activity_at: string;
  edited: boolean;
  deleted: boolean;
  created: string;
  user_vote: 'upvote' | 'downvote' | null;
}

export interface ForumComment {
  id: string;
  thread: string;
  parent: string | null;
  author_id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  depth: number;
  edited: boolean;
  deleted: boolean;
  created: string;
  user_vote: 'upvote' | 'downvote' | null;
  children?: ForumComment[];
}

export interface ForumThreadListResponse {
  threads: ForumThread[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ForumThreadDetailResponse {
  thread: ForumThread;
  comments: ForumComment[];
}

export interface VoteResponse {
  action: 'created' | 'changed' | 'removed';
  upvotes: number;
  downvotes: number;
}

export type ForumSort = 'created' | 'activity' | 'comments';
export type ForumOrder = 'asc' | 'desc';
export type ForumVisibility = 'all' | 'public' | 'friends';
