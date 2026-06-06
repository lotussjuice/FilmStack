export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  fromName: string;
  toName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  type: 'text' | 'proposal' | 'system';
  proposal?: MovieProposal;
}

export interface MovieProposal {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  proposedBy: string;
  proposedByName: string;
  createdAt: string;
  expiresAt: string;
  votes: { [userId: string]: 'add' | 'discard' };
  status: 'voting' | 'added' | 'rejected' | 'expired';
}

export interface WatchParty {
  id: string;
  host: string;
  hostName: string;
  members: string[];
  memberNames: string[];
  status: 'lobby' | 'voting' | 'watching' | 'finished';
  activeMovie: number | null;
  activeMovieTmdb: number | null;
  activeMovieTitle: string;
  activeMoviePoster: string;
  startedAt: string;
  finishedAt: string;
  votingStartedAt: string;
  chatMessages: ChatMessage[];
  votes: { [proposalId: string]: MovieProposal['votes'] };
  spinPool: number[];
  isActive: boolean;
  updatedAt?: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}
