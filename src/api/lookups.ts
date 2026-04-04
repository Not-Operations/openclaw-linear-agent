import { listTeams, listUsers } from '../operations/lookups.js';

export async function apiListTeams() {
  return { ok: true, teams: await listTeams() };
}

export async function apiListUsers(query?: string) {
  return { ok: true, users: await listUsers(query) };
}
