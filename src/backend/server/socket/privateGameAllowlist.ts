/**
 * In-memory allowlist for private pong games.
 * Populated by chatHandler when accept_game_invite is fired.
 * Validated by pong.ts when a player tries to join with an inviteId.
 *
 * Map<gameId, Set<userId>>
 * Only the two invited user IDs may join a given gameId.
 * Entry is cleaned up after 30 minutes to avoid unbounded growth.
 */
const privateGameAllowlist = new Map<string, Set<number>>();

const ALLOWLIST_TTL_MS = 30 * 60 * 1000; // 30 minutesz 

export function allowPrivateGame(gameId: string, userIdA: number, userIdB: number) {
    privateGameAllowlist.set(gameId, new Set([userIdA, userIdB]));
    setTimeout(() => privateGameAllowlist.delete(gameId), ALLOWLIST_TTL_MS);
}

export function isAllowedToJoin(gameId: string, userId: number): boolean {
    const allowed = privateGameAllowlist.get(gameId);
    return allowed !== undefined && allowed.has(userId);
}

export function removePrivateGame(gameId: string) {
    privateGameAllowlist.delete(gameId);
}
