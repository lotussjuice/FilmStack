import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import { PocketbaseService } from '../../../core/services/pocketbase.service';
import { AuthService } from '../../auth/services/auth.service';
import { ActiveSessionService } from '../../roulette/services/active-session.service';
import { ToastService } from '../../../core/services/toast.service';
import { ChatMessage, ChatMessageRecord, MovieProposal, WatchParty } from '../interfaces/social.interface';

interface PartyRecord {
  id: string;
  host: string;
  members: string[] | string;
  confirmed_members: string[] | string;
  status: 'lobby' | 'voting' | 'watching' | 'finished';
  active_movie: number | null;
  active_movie_tmdb: number | null;
  active_movie_title: string;
  active_movie_poster: string;
  started_at: string;
  finished_at: string;
  voting_started_at: string;
  votes: string;
  spin_pool: string;
  is_active: boolean;
  created?: string;
  updated?: string;
}

function parseJsonField<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

import { VOTING_DURATION_MS } from '../../../core/constants';

@Injectable({
  providedIn: 'root'
})
export class WatchpartyService {
  private pb = inject(PocketbaseService);
  private auth = inject(AuthService);
  private sessionService = inject(ActiveSessionService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  private currentPartyState = signal<WatchParty | null>(null);
  private pendingInviteState = signal<WatchParty | null>(null);
  private messagesState = signal<ChatMessage[]>([]);
  private proposalsState = signal<MovieProposal[]>([]);
  private hostNameCache = new Map<string, string>();
  private memberNamesCache = new Map<string, string>();
  private unsubscribeFn: (() => void) | null = null;
  private chatUnsubscribeFn: (() => void) | null = null;
  private inviteUnsubscribeFn: (() => void) | null = null;
  private proposalTimers = new Map<string, any>();
  private proposalRecordMap = new Map<string, string>();

  readonly currentParty = computed(() => this.currentPartyState());
  readonly pendingInvite = computed(() => this.pendingInviteState());
  readonly messages = computed(() => this.messagesState());
  readonly proposals = computed(() => this.proposalsState());
  readonly isInParty = computed(() => this.currentPartyState() !== null);
  readonly isHost = computed(() => {
    const party = this.currentPartyState();
    const me = this.auth.user();
    return !!party && !!me && party.host === me.id;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.cleanup());
    this.loadActiveParty();
    this.listenForInvites();
  }

  async loadActiveParty(): Promise<void> {
    const me = this.auth.user();
    if (!me) return;
    try {
      const records = await this.pb.collection('watchparties').getFullList<PartyRecord>({
        filter: `(host = "${me.id}" || members ~ "${me.id}") && is_active = true && status != 'finished'`,
        sort: '-created',
        $autoCancel: false
      });
      if (records.length > 0) {
        const rec = records[0];
        const members = Array.isArray(rec.members) ? rec.members : [];
        const confirmedMembers = Array.isArray(rec.confirmed_members) ? rec.confirmed_members : [];
        await this.loadMemberNames([...members, rec.host]);
        const wp = this.toModel(rec);
        if (wp.host === me.id || confirmedMembers.includes(me.id)) {
          this.applyParty(wp);
          await this.subscribe(rec.id);
          if (wp.status === 'watching' && wp.activeMovie && me.id !== wp.host) {
            this.sessionService.start({
              tmdbId: wp.activeMovie,
              title: wp.activeMovieTitle,
              posterPath: wp.activeMoviePoster,
              year: '',
              source: 'watchparty',
              watchpartyId: wp.id
            });
          }
        } else {
          this.pendingInviteState.set(wp);
        }
      }
    } catch (e) {
      console.warn('Error cargando watchparty activa', e);
      this.toast.error('Error al cargar la watchparty activa.');
    }
  }

  private applyParty(wp: WatchParty) {
    this.currentPartyState.set(wp);
  }

  private rescheduleProposalTimers(proposals: MovieProposal[]) {
    this.proposalTimers.forEach(t => clearTimeout(t));
    this.proposalTimers.clear();
    for (const p of proposals) {
      if (p.status === 'voting') this.scheduleProposalExpiry(p);
    }
  }

  async createParty(memberIds: string[] = []): Promise<WatchParty | null> {
    const me = this.auth.user();
    if (!me) return null;
    try {
      await this.loadMemberNames([...memberIds, me.id]);
      const record = await this.pb.collection('watchparties').create<PartyRecord>({
        host: me.id,
        members: [me.id, ...memberIds.filter(id => id !== me.id)],
        status: 'lobby',
        active_movie: null,
        active_movie_tmdb: null,
        active_movie_title: '',
        active_movie_poster: '',
        started_at: new Date().toISOString(),
        finished_at: '',
        voting_started_at: '',
        votes: '{}',
        spin_pool: '[]',
        is_active: true
      });
      const wp = this.toModel(record);
      this.applyParty(wp);
      await this.subscribe(record.id);
      return wp;
    } catch (e) {
      console.error('Error creando watchparty', e);
      this.toast.error('Error al crear la watchparty.');
      return null;
    }
  }

  async acceptInvite(): Promise<void> {
    const invite = this.pendingInviteState();
    const me = this.auth.user();
    if (!invite || !me) return;
    try {
      const rec = await this.pb.collection('watchparties').getOne<PartyRecord>(invite.id, { $autoCancel: false });
      const confirmedMembers = Array.isArray(rec.confirmed_members) ? rec.confirmed_members : [];
      if (!confirmedMembers.includes(me.id)) {
        await this.pb.collection('watchparties').update(invite.id, {
          confirmed_members: [...confirmedMembers, me.id]
        });
      }
      const members = Array.isArray(rec.members) ? rec.members : [];
      await this.loadMemberNames([...members, rec.host]);
      const wp = this.toModel(rec);
      this.applyParty(wp);
      this.rescheduleProposalTimers(this.proposalsState());
      await this.subscribe(rec.id);
      if (wp.status === 'watching' && wp.activeMovie) {
        this.sessionService.start({
          tmdbId: wp.activeMovie,
          title: wp.activeMovieTitle,
          posterPath: wp.activeMoviePoster,
          year: '',
          source: 'watchparty',
          watchpartyId: wp.id
        });
      } else if (wp.status === 'voting' && wp.activeMovie && me.id !== wp.host) {
        this.sessionService.start({
          tmdbId: wp.activeMovie,
          title: wp.activeMovieTitle,
          posterPath: wp.activeMoviePoster,
          year: '',
          source: 'watchparty',
          watchpartyId: wp.id
        });
      }
    } catch (e) {
      console.warn('Fallo refetch de invitacion, usando datos cacheados', e);
      this.applyParty(invite);
      this.rescheduleProposalTimers(this.proposalsState());
      await this.subscribe(invite.id);
    }
    this.pendingInviteState.set(null);
  }

  async declineInvite(): Promise<void> {
    const invite = this.pendingInviteState();
    const me = this.auth.user();
    if (invite && me) {
      const newMembers = invite.members?.filter((id: string) => id !== me.id) || [];
      try { await this.pb.collection('watchparties').update(invite.id, { members: newMembers }); } catch (e) {}
    }
    this.pendingInviteState.set(null);
  }

  async leaveParty(): Promise<void> {
    const party = this.currentPartyState();
    const me = this.auth.user();
    if (party && me) {
      if (party.host === me.id) {
        try { await this.persistParty({ is_active: false }); } catch (e) {}
      } else {
        const newMembers = party.members?.filter((id: string) => id !== me.id) || [];
        try { await this.persistParty({ members: newMembers }); } catch (e) {}
      }
    }
    this.sessionService.discard();
    this.cleanup();
    this.currentPartyState.set(null);
    this.messagesState.set([]);
    this.proposalsState.set([]);
    this.proposalTimers.forEach(t => clearTimeout(t));
    this.proposalTimers.clear();
    this.proposalRecordMap.clear();
  }

  async sendMessage(text: string): Promise<void> {
    const me = this.auth.user();
    const party = this.currentPartyState();
    if (!me || !party || !text.trim()) return;
    try {
      await this.pb.collection('chat_messages').create({
        party_id: party.id,
        user_id: me.id,
        user_name: me.name,
        text: text.trim(),
        type: 'text'
      }, { $autoCancel: false });
    } catch (e) {
      console.warn('Error enviando mensaje', e);
    }
  }

  async sendSystemMessage(text: string): Promise<void> {
    const party = this.currentPartyState();
    if (!party) return;
    try {
      await this.pb.collection('chat_messages').create({
        party_id: party.id,
        user_id: 'system',
        user_name: 'Sistema',
        text,
        type: 'system'
      }, { $autoCancel: false });
    } catch (e) {
      console.warn('Error enviando mensaje del sistema', e);
    }
  }

  async inviteMembers(newMemberIds: string[]): Promise<void> {
    const party = this.currentPartyState();
    if (!party || !this.isHost()) return;
    try {
      const currentMembers = party.members || [];
      const updatedMembers = Array.from(new Set([...currentMembers, ...newMemberIds]));
      await this.persistParty({ members: updatedMembers });
    } catch (e) {
      console.error('Error invitando miembros', e);
      this.toast.error('Error al invitar miembros.');
    }
  }

  async proposeMovie(tmdbId: number, title: string, posterPath: string | null): Promise<void> {
    const me = this.auth.user();
    const party = this.currentPartyState();
    if (!me || !party) return;

    if ((party.spinPool || []).includes(tmdbId)) {
      await this.sendSystemMessage(`"${title}" ya está en el pozo de la ruleta`);
      return;
    }
    const existingVoting = this.proposalsState().find(p => p.tmdbId === tmdbId && p.status === 'voting');
    if (existingVoting) {
      await this.sendSystemMessage(`"${title}" ya está en votación`);
      return;
    }

    const proposal: MovieProposal = {
      tmdbId,
      title,
      posterPath,
      proposedBy: me.id,
      proposedByName: me.name,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + VOTING_DURATION_MS).toISOString(),
      votes: {},
      status: 'voting'
    };
    const updated = [...this.proposalsState(), proposal];
    this.proposalsState.set(updated);

    try {
      const record = await this.pb.collection('chat_messages').create({
        party_id: party.id,
        user_id: me.id,
        user_name: me.name,
        text: `propuso "${title}"`,
        type: 'proposal',
        proposal_data: JSON.stringify(proposal)
      }, { $autoCancel: false });
      this.proposalRecordMap.set(this.proposalKey(proposal), record.id);
    } catch (e) {
      console.warn('Error creando propuesta', e);
    }

    this.scheduleProposalExpiry(proposal);
  }

  async vote(proposalId: string, vote: 'add' | 'discard'): Promise<void> {
    const me = this.auth.user();
    if (!me) return;
    const all = this.proposalsState();
    const idx = all.findIndex(p => this.proposalKey(p) === proposalId);
    if (idx === -1) return;
    const target = all[idx];
    if (target.status !== 'voting') return;
    target.votes = { ...target.votes, [me.id]: vote };
    const newList = [...all];
    newList[idx] = { ...target };
    this.proposalsState.set(newList);

    await this.updateProposalInChat(target);

    this.checkProposalResult(newList[idx]);
  }

  proposalKey(p: MovieProposal | string): string {
    if (typeof p === 'string') return p;
    return p.tmdbId + '_' + p.createdAt;
  }

  private scheduleProposalExpiry(p: MovieProposal) {
    const key = this.proposalKey(p);
    if (this.proposalTimers.has(key)) clearTimeout(this.proposalTimers.get(key));
    const remaining = new Date(p.expiresAt).getTime() - Date.now();
    if (remaining <= 0) {
      this.expireProposal(key);
      return;
    }
    const t = setTimeout(() => this.expireProposal(key), remaining);
    this.proposalTimers.set(key, t);
  }

  private async expireProposal(key: string) {
    const all = this.proposalsState();
    const idx = all.findIndex(p => this.proposalKey(p) === key);
    if (idx === -1) return;
    const target = all[idx];
    if (target.status !== 'voting') return;
    target.status = 'expired';
    this.proposalsState.set([...all]);
    await this.updateProposalInChat(target);
    await this.checkProposalResult(target, true);
  }

  private async checkProposalResult(p: MovieProposal, forceExpire = false) {
    const votes = Object.values(p.votes);
    if (votes.length === 0 && !forceExpire) return;
    const add = votes.filter(v => v === 'add').length;
    const discard = votes.filter(v => v === 'discard').length;
    const me = this.auth.user();
    const party = this.currentPartyState();
    if (!party) return;

    let statusChanged: MovieProposal['status'] | null = null;

    if (forceExpire) {
      if (add > discard && add > 0) {
        p.status = 'added';
        statusChanged = 'added';
        const currentPool = party.spinPool || [];
        if (!currentPool.includes(p.tmdbId)) {
          const pool = [...currentPool, p.tmdbId];
          await this.persistParty({ spin_pool: JSON.stringify(pool) });
          this.currentPartyState.set({ ...party, spinPool: pool });
        }
        await this.sendSystemMessage(`"${p.title}" se añadió al pozo de la ruleta`);
      } else {
        p.status = 'rejected';
        statusChanged = 'rejected';
        await this.sendSystemMessage(`Propuesta "${p.title}" no alcanzó mayoría`);
      }
    } else if (add >= Math.ceil(party.members.length / 2) && add > discard) {
      p.status = 'added';
      statusChanged = 'added';
      const currentPool = party.spinPool || [];
      if (!currentPool.includes(p.tmdbId)) {
        const pool = [...currentPool, p.tmdbId];
        await this.persistParty({ spin_pool: JSON.stringify(pool) });
        this.currentPartyState.set({ ...party, spinPool: pool });
      }
      await this.sendSystemMessage(`"${p.title}" se añadió al pozo`);
    } else if (discard >= Math.ceil(party.members.length / 2) && discard > add) {
      p.status = 'rejected';
      statusChanged = 'rejected';
      await this.sendSystemMessage(`Propuesta "${p.title}" descartada`);
    }

    if (statusChanged) {
      this.syncProposalStatusLocally(p, statusChanged);
    }
  }

  private async updateProposalInChat(p: MovieProposal): Promise<void> {
    const key = this.proposalKey(p);
    const recordId = this.proposalRecordMap.get(key);
    if (!recordId) return;
    try {
      await this.pb.collection('chat_messages').update(recordId, {
        proposal_data: JSON.stringify(p)
      }, { $autoCancel: false });
    } catch (e) {
      console.warn('Error actualizando propuesta en chat', e);
    }
  }

  private syncProposalStatusLocally(p: MovieProposal, newStatus: MovieProposal['status']) {
    const key = this.proposalKey(p);
    p.status = newStatus;
    const updatedProposals = this.proposalsState().map(prop =>
      this.proposalKey(prop) === key ? { ...prop, status: newStatus } : prop
    );
    this.proposalsState.set(updatedProposals);
    this.updateProposalInChat(p);
  }

  async removeFromSpinPool(tmdbId: number): Promise<void> {
    const me = this.auth.user();
    const party = this.currentPartyState();
    if (!me || !party || me.id !== party.host) return;
    const pool = party.spinPool || [];
    const newPool = pool.filter(id => id !== tmdbId);
    await this.persistParty({ spin_pool: JSON.stringify(newPool) });
    this.currentPartyState.set({ ...party, spinPool: newPool });
    await this.sendSystemMessage(`Se quitó una película del pozo`);
  }

  async spinGroup(): Promise<MovieProposal | null> {
    const me = this.auth.user();
    const party = this.currentPartyState();
    if (!me || !party || me.id !== party.host) return null;
    const pool = party.spinPool || [];
    if (pool.length === 0) return null;
    const idx = Math.floor(Math.random() * pool.length);
    const tmdbId = pool[idx];
    const knownProposal = this.proposalsState().find(p => p.tmdbId === tmdbId);
    if (!knownProposal) return null;
    const votesMap = { ...party.votes };
    delete votesMap['sync_vote'];
    const votingStartedAt = new Date().toISOString();
    await this.persistParty({
      status: 'voting',
      active_movie_tmdb: tmdbId,
      active_movie_title: knownProposal.title,
      active_movie_poster: knownProposal.posterPath || '',
      votes: JSON.stringify(votesMap),
      voting_started_at: votingStartedAt
    });
    this.currentPartyState.set({
      ...party,
      status: 'voting',
      activeMovie: tmdbId,
      activeMovieTitle: knownProposal.title,
      activeMoviePoster: knownProposal.posterPath || '',
      votes: votesMap,
      votingStartedAt
    });
    await this.sendSystemMessage(`La ruleta ha elegido: ${knownProposal.title}`);
    return knownProposal;
  }

  async directStart(tmdbId: number, title: string, posterPath: string | null): Promise<void> {
    const me = this.auth.user();
    const party = this.currentPartyState();
    if (!me || !party || me.id !== party.host) return;
    const votesMap = { ...party.votes };
    delete votesMap['sync_vote'];
    const votingStartedAt = new Date().toISOString();
    await this.persistParty({
      status: 'voting',
      active_movie_tmdb: tmdbId,
      active_movie_title: title,
      active_movie_poster: posterPath || '',
      votes: JSON.stringify(votesMap),
      voting_started_at: votingStartedAt
    });
    this.currentPartyState.set({
      ...party,
      status: 'voting',
      activeMovie: tmdbId,
      activeMovieTitle: title,
      activeMoviePoster: posterPath || '',
      votes: votesMap,
      votingStartedAt
    });
    await this.sendSystemMessage(`Película directa elegida: ${title}`);
  }

  async syncVote(vote: 'add' | 'discard'): Promise<void> {
    const me = this.auth.user();
    const party = this.currentPartyState();
    if (!me || !party) return;
    const votesMap = { ...party.votes };
    if (!votesMap['sync_vote']) {
      votesMap['sync_vote'] = {};
    }
    votesMap['sync_vote'] = { ...votesMap['sync_vote'], [me.id]: vote };
    try {
      await this.pb.collection('watchparties').update(party.id, { votes: JSON.stringify(votesMap) }, { $autoCancel: false });
      this.currentPartyState.set({ ...party, votes: votesMap });
    } catch (e) {
      console.error('Error enviando sync vote', e);
      this.toast.error('Error al enviar el voto.');
    }
  }

  async acceptAndStart(): Promise<void> {
    const me = this.auth.user();
    const party = this.currentPartyState();
    if (!me || !party) return;
    if (me.id !== party.host) return;
    if (!party.activeMovie) return;
    await this.persistParty({
      status: 'watching',
      started_at: new Date().toISOString()
    });
    this.currentPartyState.set({ ...party, status: 'watching' });
    this.sessionService.start({
      tmdbId: party.activeMovie,
      title: party.activeMovieTitle,
      posterPath: party.activeMoviePoster,
      year: '',
      source: 'watchparty',
      watchpartyId: party.id
    });
    await this.sendSystemMessage(`Comenzamos a ver ${party.activeMovieTitle}`);
  }

  async declineAndReroll(): Promise<void> {
    const me = this.auth.user();
    const party = this.currentPartyState();
    if (!me || !party) return;
    if (me.id !== party.host) return;
    const votesMap = { ...party.votes };
    delete votesMap['sync_vote'];
    await this.persistParty({
      status: 'lobby',
      active_movie_tmdb: null,
      active_movie_title: '',
      active_movie_poster: '',
      votes: JSON.stringify(votesMap),
      voting_started_at: ''
    });
    this.currentPartyState.set({
      ...party,
      status: 'lobby',
      activeMovie: null,
      activeMovieTitle: '',
      activeMoviePoster: '',
      votes: votesMap,
      votingStartedAt: ''
    });
    this.sessionService.discard();
    await this.sendSystemMessage('La elección fue rechazada. Se reinicia la ruleta');
  }

  async finishAndReview(): Promise<void> {
    const me = this.auth.user();
    const party = this.currentPartyState();
    if (!me || !party) return;
    if (me.id !== party.host) return;
    await this.persistParty({
      status: 'finished',
      finished_at: new Date().toISOString()
    });
    this.currentPartyState.set({ ...party, status: 'finished' });
    this.sessionService.discard();
  }

  async submitGroupReview(rating: number, review: string): Promise<void> {
    const me = this.auth.user();
    const party = this.currentPartyState();
    if (!me || !party || !party.activeMovie) return;
    try {
      const existing = await this.pb.collection('group_reviews').getFullList({
        filter: `watchparty = "${party.id}" && user = "${me.id}"`,
        $autoCancel: false
      });
      if (existing.length > 0) {
        await this.pb.collection('group_reviews').update(existing[0].id, {
          rating,
          review,
          tmdb_id: party.activeMovie,
          user_name: me.name
        });
      } else {
        await this.pb.collection('group_reviews').create({
          watchparty: party.id,
          user: me.id,
          tmdb_id: party.activeMovie,
          rating,
          review,
          user_name: me.name
        });
      }
      await this.sendSystemMessage(`${me.name} calificó con ${rating}/5`);
    } catch (e) {
      console.error('Error guardando reseña grupal', e);
      this.toast.error('Error al guardar la reseña grupal.');
    }
  }

  async getGroupReviews(): Promise<{ avg: number; count: number; reviews: any[] } | null> {
    const party = this.currentPartyState();
    if (!party || !party.activeMovie) return null;
    try {
      const records = await this.pb.collection('group_reviews').getFullList({
        filter: `watchparty = "${party.id}"`,
        sort: '-created',
        $autoCancel: false
      });
      if (records.length === 0) return { avg: 0, count: 0, reviews: [] };
      const sum = records.reduce((acc: number, r: any) => acc + (r.rating || 0), 0);
      return { avg: sum / records.length, count: records.length, reviews: records };
    } catch (e) {
      return null;
    }
  }

  async getFinishedParties(): Promise<WatchParty[]> {
    const me = this.auth.user();
    if (!me) return [];
    try {
      const records = await this.pb.collection('watchparties').getFullList<PartyRecord>({
        filter: `(host = "${me.id}" || members ~ "${me.id}" || confirmed_members ~ "${me.id}") && status = 'finished'`,
        sort: '-created',
        $autoCancel: false
      });
      const allIds = new Set<string>();
      records.forEach(r => {
        const m = Array.isArray(r.members) ? r.members : [];
        m.forEach(id => allIds.add(id));
        allIds.add(r.host);
      });
      await this.loadMemberNames(Array.from(allIds));
      return records.map(r => this.toModel(r));
    } catch (e) {
      console.warn('Error cargando historial', e);
      return [];
    }
  }

  async getReviewsForParty(partyId: string): Promise<{ avg: number; count: number; reviews: any[] }> {
    try {
      const records = await this.pb.collection('group_reviews').getFullList({
        filter: `watchparty = "${partyId}"`,
        sort: '-created',
        $autoCancel: false
      });
      if (records.length === 0) return { avg: 0, count: 0, reviews: [] };
      const sum = records.reduce((acc: number, r: any) => acc + (r.rating || 0), 0);
      return { avg: sum / records.length, count: records.length, reviews: records };
    } catch (e) {
      return { avg: 0, count: 0, reviews: [] };
    }
  }

  async getGroupsHistory(): Promise<{ movie: WatchParty; sessions: WatchParty[] }[]> {
    const me = this.auth.user();
    if (!me) return [];
    try {
      const records = await this.pb.collection('watchparties').getFullList<PartyRecord>({
        filter: `(members ~ "${me.id}" || confirmed_members ~ "${me.id}") && status = 'finished' && active_movie_tmdb != null`,
        sort: '-finished_at',
        $autoCancel: false
      });
      const allIds = new Set<string>();
      records.forEach(r => {
        const m = Array.isArray(r.members) ? r.members : [];
        m.forEach(id => allIds.add(id));
        allIds.add(r.host);
      });
      await this.loadMemberNames(Array.from(allIds));

      const byMovie = new Map<number, WatchParty[]>();
      for (const r of records) {
        const wp = this.toModel(r);
        const id = wp.activeMovieTmdb || 0;
        if (!byMovie.has(id)) byMovie.set(id, []);
        byMovie.get(id)!.push(wp);
      }

      const result: { movie: WatchParty; sessions: WatchParty[] }[] = [];
      for (const [id, sessions] of byMovie.entries()) {
        result.push({ movie: sessions[0], sessions });
      }
      result.sort((a, b) => {
        const ad = a.sessions[0].finishedAt || '';
        const bd = b.sessions[0].finishedAt || '';
        return bd.localeCompare(ad);
      });
      return result;
    } catch (e) {
      console.warn('Error cargando grupos', e);
      return [];
    }
  }

  private async subscribe(partyId: string) {
    if (this.unsubscribeFn) {
      try { this.unsubscribeFn(); } catch (e) {}
      this.unsubscribeFn = null;
    }
    if (this.chatUnsubscribeFn) {
      try { this.chatUnsubscribeFn(); } catch (e) {}
      this.chatUnsubscribeFn = null;
    }

    try {
      const unsub = await this.pb.collection('watchparties').subscribe(partyId, (e: any) => {
        if (e.action === 'update' || e.action === 'create') {
          const rec = e.record as PartyRecord;
          if (!rec.is_active) {
            this.leaveParty();
            return;
          }
          const members = Array.isArray(rec.members) ? rec.members : [];
          this.loadMemberNames([...members, rec.host]).then(() => {
            const wp = this.toModel(rec);
            this.applyParty(wp);
            this.rescheduleProposalTimers(this.proposalsState());
            const me = this.auth.user();
            if (wp.status === 'watching' && wp.activeMovie && me) {
              this.sessionService.start({
                tmdbId: wp.activeMovie,
                title: wp.activeMovieTitle,
                posterPath: wp.activeMoviePoster,
                year: '',
                source: 'watchparty',
                watchpartyId: wp.id
              });
            } else if (wp.status === 'finished') {
              this.sessionService.discard();
            }
          });
        }
      });
      this.unsubscribeFn = typeof unsub === 'function' ? unsub : () => { try { (unsub as any)?.unsubscribe?.(); } catch (e) {} };
    } catch (e) {
      console.warn('Error subscribiendo a watchparty', e);
    }

    try {
      const chatUnsub = await this.pb.collection('chat_messages').subscribe('*', (e: any) => {
        const record = e.record;
        if (!record || record.party_id !== partyId) return;
        this.handleChatRealtime(e);
      });
      this.chatUnsubscribeFn = typeof chatUnsub === 'function' ? chatUnsub : () => { try { (chatUnsub as any)?.unsubscribe?.(); } catch (e) {} };
    } catch (e) {
      console.warn('Error subscribiendo a chat_messages', e);
    }

    await this.loadChatMessages(partyId);
  }

  private async loadChatMessages(partyId: string): Promise<void> {
    try {
      const records = await this.pb.collection('chat_messages').getFullList<ChatMessageRecord>({
        filter: `party_id = "${partyId}"`,
        sort: 'created',
        $autoCancel: false
      });
      const messages: ChatMessage[] = [];
      const proposals: MovieProposal[] = [];
      this.proposalRecordMap.clear();

      for (const r of records) {
        const msg = this.recordToChatMessage(r);
        messages.push(msg);
        if (msg.type === 'proposal' && msg.proposal) {
          proposals.push(msg.proposal);
          this.proposalRecordMap.set(this.proposalKey(msg.proposal), r.id);
        }
      }

      this.messagesState.set(messages);
      this.proposalsState.set(proposals);
      this.rescheduleProposalTimers(proposals);
    } catch (e) {
      console.warn('Error cargando mensajes del chat', e);
    }
  }

  private handleChatRealtime(e: any): void {
    const record = e.record as ChatMessageRecord;
    if (!record) return;

    if (e.action === 'create') {
      const msg = this.recordToChatMessage(record);
      this.messagesState.update(msgs => [...msgs, msg]);
      if (msg.type === 'proposal' && msg.proposal) {
        this.proposalsState.update(props => [...props, msg.proposal!]);
        this.proposalRecordMap.set(this.proposalKey(msg.proposal!), record.id);
      }
    } else if (e.action === 'update') {
      const msg = this.recordToChatMessage(record);
      this.messagesState.update(msgs => msgs.map(m => m.id === msg.id ? msg : m));
      if (msg.type === 'proposal' && msg.proposal) {
        this.proposalsState.update(props => props.map(p =>
          this.proposalKey(p) === this.proposalKey(msg.proposal!) ? msg.proposal! : p
        ));
      }
    } else if (e.action === 'delete') {
      const msgId = record.id;
      this.messagesState.update(msgs => msgs.filter(m => m.id !== msgId));
      this.proposalsState.update(props =>
        props.filter(p => this.proposalRecordMap.get(this.proposalKey(p)) !== msgId)
      );
    }
  }

  private async loadMemberNames(ids: string[]): Promise<void> {
    const missing = ids.filter(id => !this.memberNamesCache.has(id));
    if (missing.length === 0) return;
    try {
      const records = await this.pb.collection('users').getFullList({
        filter: missing.map(id => `id="${id}"`).join(' || '),
        $autoCancel: false
      });
      records.forEach((r: any) => {
        this.memberNamesCache.set(r.id, r.name || 'Miembro');
        this.hostNameCache.set(r.id, r.name || 'Host');
      });
    } catch (e) {}
  }

  private async listenForInvites() {
    if (this.inviteUnsubscribeFn) {
      try { this.inviteUnsubscribeFn(); } catch (e) {}
      this.inviteUnsubscribeFn = null;
    }
    try {
      const unsub = await this.pb.collection('watchparties').subscribe('*', (e: any) => {
        if (e.action === 'create' || e.action === 'update') {
          const me = this.auth.user();
          if (!me) return;
          const rec = e.record as PartyRecord;
          if (!this.currentPartyState() && rec.is_active && rec.status !== 'finished') {
            const members = Array.isArray(rec.members) ? rec.members : [];
            const confirmedMembers = Array.isArray(rec.confirmed_members) ? rec.confirmed_members : [];
            if (members.includes(me.id) && rec.host !== me.id && !confirmedMembers.includes(me.id)) {
              const wp = this.toModel(rec);
              if (this.hostNameCache.size === 0 && members.length > 0) {
                this.loadMemberNames([...members, rec.host]).then(() => {
                  const fresh = this.toModel(rec);
                  this.pendingInviteState.set(fresh);
                });
              } else {
                this.pendingInviteState.set(wp);
              }
            }
          }
        }
      });
      this.inviteUnsubscribeFn = typeof unsub === 'function' ? unsub : () => { try { (unsub as any)?.unsubscribe?.(); } catch (e) {} };
    } catch (e) {
      console.warn('Error listening for invites', e);
    }
  }

  private async persistParty(data: Partial<PartyRecord>): Promise<void> {
    const party = this.currentPartyState();
    if (!party) return;
    try {
      await this.pb.collection('watchparties').update(party.id, data, { $autoCancel: false });
    } catch (e) {
      console.warn('Error persistiendo party', e);
    }
  }

  private toModel(r: PartyRecord): WatchParty {
    const membersArr = Array.isArray(r.members) ? r.members : [];
    const confirmedMembersArr = Array.isArray(r.confirmed_members) ? r.confirmed_members : [];
    return {
      id: r.id,
      host: r.host,
      hostName: this.hostNameCache.get(r.host) || 'Host',
      members: membersArr,
      memberNames: membersArr.map(id => this.memberNamesCache.get(id) || 'Miembro'),
      confirmedMembers: confirmedMembersArr,
      confirmedMemberNames: confirmedMembersArr.map(id => this.memberNamesCache.get(id) || 'Miembro'),
      status: r.status,
      activeMovie: r.active_movie_tmdb,
      activeMovieTmdb: r.active_movie_tmdb,
      activeMovieTitle: r.active_movie_title,
      activeMoviePoster: r.active_movie_poster,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      votingStartedAt: r.voting_started_at || '',
      votes: parseJsonField<{ [key: string]: MovieProposal['votes'] }>(r.votes, {}),
      spinPool: parseJsonField<number[]>(r.spin_pool, []),
      isActive: r.is_active,
      updatedAt: r.updated
    };
  }

  private recordToChatMessage(r: ChatMessageRecord): ChatMessage {
    let proposal: MovieProposal | undefined;
    if (r.proposal_data) {
      try {
        proposal = typeof r.proposal_data === 'string'
          ? JSON.parse(r.proposal_data)
          : r.proposal_data;
      } catch { proposal = undefined; }
    }
    return {
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      text: r.text,
      createdAt: r.created,
      type: r.type,
      proposal
    };
  }

  private cleanup() {
    if (this.unsubscribeFn) {
      try { this.unsubscribeFn(); } catch (e) {}
      this.unsubscribeFn = null;
    }
    if (this.chatUnsubscribeFn) {
      try { this.chatUnsubscribeFn(); } catch (e) {}
      this.chatUnsubscribeFn = null;
    }
    this.proposalTimers.forEach(t => clearTimeout(t));
    this.proposalTimers.clear();
    this.proposalRecordMap.clear();
  }
}
