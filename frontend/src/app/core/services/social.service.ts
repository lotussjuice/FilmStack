import { Injectable, signal, computed, inject, effect, DestroyRef } from '@angular/core';
import { PocketbaseService } from './pocketbase.service';
import { AuthService } from './auth.service';
import { UserSummary } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class SocialService {
  private pb = inject(PocketbaseService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  private friendsState = signal<UserSummary[]>([]);
  private requestsState = signal<{ sent: UserSummary[]; received: UserSummary[] }>({ sent: [], received: [] });
  private searchState = signal<UserSummary[]>([]);
  private loadingState = signal<boolean>(false);
  private errorState = signal<string>('');

  private userUnsubscribe: (() => void) | null = null;
  private subscribedUserId: string | null = null;
  private inFlightRequest: Set<string> = new Set();

  readonly friends = computed(() => this.friendsState());
  readonly requests = computed(() => this.requestsState());
  readonly searchResults = computed(() => this.searchState());
  readonly loading = computed(() => this.loadingState());
  readonly error = computed(() => this.errorState());

  constructor() {
    this.destroyRef.onDestroy(() => this.teardownUserSubscription());

    effect(() => {
      const user = this.auth.user();
      if (user) {
        this.setupUserSubscription(user.id);
      } else {
        this.teardownUserSubscription();
        this.friendsState.set([]);
        this.requestsState.set({ sent: [], received: [] });
        this.searchState.set([]);
      }
    });
  }

  async loadAll(): Promise<void> {
    await Promise.all([this.loadFriends(), this.loadRequests()]);
  }

  private async fetchUsersByIds(ids: string[]): Promise<Map<string, UserSummary>> {
    const map = new Map<string, UserSummary>();
    if (ids.length === 0) return map;
    try {
      const filter = ids.map(id => `id = "${this.escapeFilterValue(id)}"`).join(' || ');
      const records = await this.pb.pb.collection('users').getFullList({
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

  async loadFriends(): Promise<void> {
    const me = this.auth.user();
    if (!me) return;
    this.errorState.set('');
    try {
      const ownRecord = await this.pb.pb.collection('users').getOne(me.id, { $autoCancel: false });
      let friendIds = (ownRecord as any)['friends'] || [];
      if (!Array.isArray(friendIds)) friendIds = friendIds ? [friendIds] : [];
      friendIds = friendIds.filter((id: any) => typeof id === 'string' && id.trim().length > 0);

      const userMap = await this.fetchUsersByIds(friendIds as string[]);
      const summaries: UserSummary[] = friendIds.map((id: string) => {
        return userMap.get(id) || { id, name: 'Usuario no disponible', email: '' };
      });
      this.friendsState.set(summaries);
    } catch (e: any) {
      if (e?.isAbort !== true) {
        console.error('Error cargando amigos:', e?.message || e);
        this.errorState.set('Error cargando amigos');
      }
    }
  }

  async loadRequests(): Promise<void> {
    const me = this.auth.user();
    if (!me) return;
    try {
      const rec = await this.pb.pb.collection('users').getOne(me.id, { $autoCancel: false });
      let sentIds = (rec as any)['friend_requests_sent'] || [];
      if (!Array.isArray(sentIds)) sentIds = sentIds ? [sentIds] : [];
      let receivedIds = (rec as any)['friend_requests_received'] || [];
      if (!Array.isArray(receivedIds)) receivedIds = receivedIds ? [receivedIds] : [];

      sentIds = sentIds.filter((id: any) => typeof id === 'string' && id.trim().length > 0);
      receivedIds = receivedIds.filter((id: any) => typeof id === 'string' && id.trim().length > 0);

      const allIds = Array.from(new Set([...sentIds, ...receivedIds]));
      const userMap = allIds.length > 0 ? await this.fetchUsersByIds(allIds as string[]) : new Map();
      this.requestsState.set({
        sent: sentIds.map((id: string) => userMap.get(id) || { id, name: 'Usuario no disponible', email: '' }),
        received: receivedIds.map((id: string) => userMap.get(id) || { id, name: 'Usuario no disponible', email: '' })
      });
    } catch (e: any) {
      if (e?.isAbort !== true) {
        console.error('Error cargando solicitudes:', e?.message || e);
        this.errorState.set('Error cargando solicitudes');
      }
    }
  }

  async searchByName(name: string): Promise<void> {
    if (!name.trim()) {
      this.searchState.set([]);
      this.loadingState.set(false);
      return;
    }
    this.loadingState.set(true);
    this.errorState.set('');
    try {
      const me = this.auth.user();
      const safe = this.escapeFilterValue(name.trim().toLowerCase());
      const filter = `name ~ "${safe}"${me ? ` && id != "${this.escapeFilterValue(me.id)}"` : ''}`;
      const records = await this.pb.pb.collection('users').getFullList({
        filter,
        fields: 'id,name,email',
        $autoCancel: false
      });
      this.searchState.set(records.map((r: any) => ({ id: r.id, name: r['name'] || 'Sin nombre', email: r['email'] || '' })));
    } catch (e: any) {
      if (e?.isAbort !== true) {
        console.error('Error en la busqueda:', e?.message || e);
        this.errorState.set('Error en la busqueda');
        this.searchState.set([]);
      }
    } finally {
      this.loadingState.set(false);
    }
  }

  hasSentRequestTo(userId: string): boolean {
    return this.requestsState().sent.some(r => r.id === userId);
  }

  isFriend(userId: string): boolean {
    return this.friendsState().some(f => f.id === userId);
  }

  async sendRequest(userId: string): Promise<boolean> {
    const me = this.auth.user();
    if (!me) return false;
    if (me.id === userId) return false;
    if (this.inFlightRequest.has(userId)) return false;
    this.inFlightRequest.add(userId);
    this.errorState.set('');

    try {
      const target = await this.pb.pb.collection('users').getOne(userId, { $autoCancel: false });
      const received: string[] = Array.isArray((target as any)['friend_requests_received'])
        ? [...(target as any)['friend_requests_received']]
        : [];
      if (!received.includes(me.id)) {
        received.push(me.id);
        await this.pb.pb.collection('users').update(userId, { friend_requests_received: received });
      }

      const mine = await this.pb.pb.collection('users').getOne(me.id, { $autoCancel: false });
      const sent: string[] = Array.isArray((mine as any)['friend_requests_sent'])
        ? [...(mine as any)['friend_requests_sent']]
        : [];
      if (!sent.includes(userId)) {
        sent.push(userId);
        await this.pb.pb.collection('users').update(me.id, { friend_requests_sent: sent });
      }

      await this.loadRequests();
      return true;
    } catch (e: any) {
      if (e?.isAbort !== true) {
        console.error('No se pudo enviar la solicitud:', e?.message || e);
        this.errorState.set('No se pudo enviar la solicitud');
      }
      return false;
    } finally {
      this.inFlightRequest.delete(userId);
    }
  }

  async acceptRequest(userId: string): Promise<boolean> {
    const me = this.auth.user();
    if (!me) return false;
    if (this.inFlightRequest.has(userId)) return false;
    this.inFlightRequest.add(userId);
    this.errorState.set('');

    try {
      const myRec = await this.pb.pb.collection('users').getOne(me.id, { $autoCancel: false });
      const friends: string[] = Array.isArray((myRec as any)['friends'])
        ? [...(myRec as any)['friends']]
        : [];
      const received: string[] = Array.isArray((myRec as any)['friend_requests_received'])
        ? [...(myRec as any)['friend_requests_received']]
        : [];
      if (!friends.includes(userId)) friends.push(userId);
      const newReceived = received.filter(id => id !== userId);
      await this.pb.pb.collection('users').update(me.id, {
        friends,
        friend_requests_received: newReceived
      });

      const otherRec = await this.pb.pb.collection('users').getOne(userId, { $autoCancel: false });
      const otherFriends: string[] = Array.isArray((otherRec as any)['friends'])
        ? [...(otherRec as any)['friends']]
        : [];
      const otherSent: string[] = Array.isArray((otherRec as any)['friend_requests_sent'])
        ? [...(otherRec as any)['friend_requests_sent']]
        : [];
      if (!otherFriends.includes(me.id)) otherFriends.push(me.id);
      const newSent = otherSent.filter(id => id !== me.id);
      await this.pb.pb.collection('users').update(userId, {
        friends: otherFriends,
        friend_requests_sent: newSent
      });

      await this.loadAll();
      return true;
    } catch (e: any) {
      if (e?.isAbort !== true) {
        console.error('No se pudo aceptar la solicitud:', e?.message || e);
        this.errorState.set('No se pudo aceptar la solicitud');
      }
      return false;
    } finally {
      this.inFlightRequest.delete(userId);
    }
  }

  async rejectRequest(userId: string): Promise<boolean> {
    const me = this.auth.user();
    if (!me) return false;
    if (this.inFlightRequest.has(userId)) return false;
    this.inFlightRequest.add(userId);
    this.errorState.set('');

    try {
      const myRec = await this.pb.pb.collection('users').getOne(me.id, { $autoCancel: false });
      const received: string[] = Array.isArray((myRec as any)['friend_requests_received'])
        ? [...(myRec as any)['friend_requests_received']]
        : [];
      const newReceived = received.filter(id => id !== userId);
      await this.pb.pb.collection('users').update(me.id, { friend_requests_received: newReceived });

      const otherRec = await this.pb.pb.collection('users').getOne(userId, { $autoCancel: false });
      const sent: string[] = Array.isArray((otherRec as any)['friend_requests_sent'])
        ? [...(otherRec as any)['friend_requests_sent']]
        : [];
      const newSent = sent.filter(id => id !== me.id);
      await this.pb.pb.collection('users').update(userId, { friend_requests_sent: newSent });

      await this.loadRequests();
      return true;
    } catch (e: any) {
      if (e?.isAbort !== true) {
        console.error('No se pudo rechazar la solicitud:', e?.message || e);
        this.errorState.set('No se pudo rechazar la solicitud');
      }
      return false;
    } finally {
      this.inFlightRequest.delete(userId);
    }
  }

  async removeFriend(userId: string): Promise<boolean> {
    const me = this.auth.user();
    if (!me) return false;
    if (this.inFlightRequest.has(userId)) return false;
    this.inFlightRequest.add(userId);
    this.errorState.set('');

    try {
      const myRec = await this.pb.pb.collection('users').getOne(me.id, { $autoCancel: false });
      const friends: string[] = ((myRec as any)['friends'] || []).filter((id: string) => id !== userId);
      await this.pb.pb.collection('users').update(me.id, { friends });

      const otherRec = await this.pb.pb.collection('users').getOne(userId, { $autoCancel: false });
      const otherFriends: string[] = ((otherRec as any)['friends'] || []).filter((id: string) => id !== me.id);
      await this.pb.pb.collection('users').update(userId, { friends: otherFriends });

      await this.loadFriends();
      return true;
    } catch (e: any) {
      if (e?.isAbort !== true) {
        console.error('No se pudo eliminar al amigo:', e?.message || e);
        this.errorState.set('No se pudo eliminar al amigo');
      }
      return false;
    } finally {
      this.inFlightRequest.delete(userId);
    }
  }

  clearError(): void {
    this.errorState.set('');
  }

  clearSearch(): void {
    this.searchState.set([]);
  }

  private async setupUserSubscription(userId: string) {
    if (this.subscribedUserId === userId) return;
    this.teardownUserSubscription();
    this.subscribedUserId = userId;
    try {
      const unsub = await this.pb.pb.collection('users').subscribe(userId, (e: any) => {
        if (e.action === 'update') {
          this.loadFriends();
          this.loadRequests();
        }
      });
      this.userUnsubscribe = typeof unsub === 'function' ? unsub : () => { try { (unsub as any)?.unsubscribe?.(); } catch (e) {} };
    } catch (e: any) {
      console.error('Error subscribiendo a usuario', e?.message || e);
    }
  }

  private teardownUserSubscription() {
    if (this.userUnsubscribe) {
      try { this.userUnsubscribe(); } catch (e) {}
      this.userUnsubscribe = null;
    }
    this.subscribedUserId = null;
  }

  private escapeFilterValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
}
