export type Role = 'guest' | 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  deleted?: boolean;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}
