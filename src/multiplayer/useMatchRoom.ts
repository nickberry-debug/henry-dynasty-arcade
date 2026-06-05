// React hook wrapping the multiplayer/match.ts primitives. Subscribes
// to the room doc, pings a heartbeat every 20 seconds, exposes the
// caller's seat (host or guest), and returns the live VersusRoom.

import { useEffect, useState } from "react";
import { subscribeRoom, heartbeat, type VersusRoom } from "./match";

export type Seat = "host" | "guest";

export interface UseMatchRoomResult {
  room: VersusRoom | null;
  /** Which seat the caller occupies. Null if they aren't in the room. */
  seat: Seat | null;
  /** True after the first subscription snapshot has arrived. Used to
   *  avoid flashing the "room not found" state during the first 200ms. */
  hydrated: boolean;
}

export function useMatchRoom(code: string | null, profileId: string | null): UseMatchRoomResult {
  const [room, setRoom] = useState<VersusRoom | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!code) { setRoom(null); setHydrated(true); return; }
    setHydrated(false);
    return subscribeRoom(code, next => {
      setRoom(next);
      setHydrated(true);
    });
  }, [code]);

  // Heartbeat so the other side knows we're still here. Stale > 2min =
  // abandoned for join logic. Fires every 20s.
  useEffect(() => {
    if (!code || !room || !profileId) return;
    const seat: Seat | null =
      room.host?.profileId === profileId ? "host" :
      room.guest?.profileId === profileId ? "guest" :
      null;
    if (!seat) return;
    const tick = () => { void heartbeat(code, seat); };
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, [code, room?.host?.profileId, room?.guest?.profileId, profileId]);

  const seat: Seat | null =
    room && profileId
      ? room.host?.profileId === profileId ? "host"
      : room.guest?.profileId === profileId ? "guest"
      : null
      : null;

  return { room, seat, hydrated };
}
