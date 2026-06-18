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

export interface ChatMessageRecord {
  id: string;
  party_id: string;
  user_id: string;
  user_name: string;
  text: string;
  type: 'text' | 'proposal' | 'system';
  proposal_data?: any;
  created: string;
}

export interface WatchParty {
  id: string;
  host: string;
  hostName: string;
  members: string[];
  memberNames: string[];
  confirmedMembers: string[];
  confirmedMemberNames: string[];
  status: 'lobby' | 'voting' | 'watching' | 'finished';
  activeMovie: number | null;
  activeMovieTmdb: number | null;
  activeMovieTitle: string;
  activeMoviePoster: string;
  startedAt: string;
  finishedAt: string;
  votingStartedAt: string;
  votes: { [proposalId: string]: MovieProposal['votes'] };
  spinPool: number[];
  isActive: boolean;
  updatedAt?: string;
}
