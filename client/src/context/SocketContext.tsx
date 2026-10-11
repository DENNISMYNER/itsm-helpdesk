import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  AuditEntry,
  NotificationItem,
  TicketChange,
  TicketMessage,
  TicketSummary,
  TypingPayload,
} from '../types/api';
import { useAuth } from './AuthContext';

export interface ServerToClientEvents {
  'ticket:created': (ticket: TicketSummary) => void;
  'ticket:updated': (payload: { ticket: TicketSummary; change: TicketChange }) => void;
  'message:new': (payload: { ticketId: string; message: TicketMessage }) => void;
  'activity:new': (entry: AuditEntry) => void;
  'notification:new': (notification: NotificationItem) => void;
  'ticket:typing': (payload: TypingPayload) => void;
}

export interface ClientToServerEvents {
  'ticket:join': (payload: { ticketId: string }, ack?: (response: { ok: boolean; error?: string }) => void) => void;
  'ticket:leave': (payload: { ticketId: string }) => void;
  'ticket:typing': (payload: { ticketId: string; isTyping: boolean }) => void;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextValue {
  socket: AppSocket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

/**
 * One WebSocket per signed-in user. The browser sends the httpOnly session cookie with the
 * handshake, so no token ever touches JavaScript. Socket.io reconnects automatically.
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [value, setValue] = useState<SocketContextValue>({ socket: null, connected: false });

  useEffect(() => {
    if (!userId) {
      setValue({ socket: null, connected: false });
      return undefined;
    }

    const socket: AppSocket = io({ withCredentials: true });
    const sync = (connected: boolean) => setValue({ socket, connected });
    socket.on('connect', () => sync(true));
    socket.on('disconnect', () => sync(false));
    socket.on('connect_error', () => sync(false));
    setValue({ socket, connected: socket.connected });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [userId]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
