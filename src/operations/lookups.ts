import { linearGraphQL } from '../linear-graphql.js';

export async function listTeams() {
  const data = await linearGraphQL<{ teams: { nodes: any[] } }>(
    `query Teams {
      teams {
        nodes {
          id
          key
          name
        }
      }
    }`
  );
  return data.teams?.nodes ?? [];
}

export async function listUsers(query?: string) {
  const data = await linearGraphQL<{ users: { nodes: any[] } }>(
    `query Users($query: String) {
      users(filter: { active: { eq: true }, or: [
        { name: { containsIgnoreCase: $query } },
        { email: { containsIgnoreCase: $query } },
        { displayName: { containsIgnoreCase: $query } }
      ] }) {
        nodes {
          id
          name
          displayName
          email
          active
        }
      }
    }`,
    { query: query || '' }
  );
  return data.users?.nodes ?? [];
}

export async function resolveTeamByKeyOrName(value: string) {
  const teams = await listTeams();
  const lower = value.toLowerCase();
  return teams.find((t) => t.key?.toLowerCase() === lower || t.name?.toLowerCase() === lower) || null;
}

export async function resolveUserByEmailOrName(value: string) {
  const users = await listUsers(value);
  const lower = value.toLowerCase();
  return users.find((u) => u.email?.toLowerCase() === lower || u.name?.toLowerCase() === lower || u.displayName?.toLowerCase() === lower) || users[0] || null;
}

export async function resolveProjectByName(value: string) {
  const data = await linearGraphQL<{ projects: { nodes: any[] } }>(
    `query ProjectByName($name: String!) {
      projects(filter: { name: { eq: $name } }) {
        nodes {
          id
          name
          slugId
        }
      }
    }`,
    { name: value }
  );
  return data.projects?.nodes?.[0] ?? null;
}

export async function resolveStateByName(teamKey: string, stateName: string) {
  const data = await linearGraphQL<{ teams: { nodes: any[] } }>(
    `query ResolveState($teamKey: String!) {
      teams(filter: { key: { eq: $teamKey } }) {
        nodes {
          id
          key
          states {
            nodes {
              id
              name
              type
            }
          }
        }
      }
    }`,
    { teamKey }
  );
  const team = data.teams?.nodes?.[0];
  if (!team) return null;
  const lower = stateName.toLowerCase();
  return team.states?.nodes?.find((s: any) => s.name?.toLowerCase() === lower) || null;
}
