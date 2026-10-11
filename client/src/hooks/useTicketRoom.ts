import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';

const TYPING_IDLE_MS = 2500;

interface TicketRoom {
  /** Names of the other people currently typing in this ticket. */
  typingNames: string[];
  /** Call on every keystroke; sends "typing" once and "stopped" after a pause. */
  signalTyping: () => void;
  /** Call right after sending, to clear the indicator immediately. */
  stopTyping: () => void;
}

/**
 * Joins the Socket.io room of one ticket while its page is open (the server verifies the user
 * may see it) and tracks the typing indicator. Re-joins automatically after a reconnect.
 */
export function useTicketRoom(ticketId: string): TicketRoom {
  const { socket, connected } = useSocket();
  const [typing, setTyping] = useState<Record<string, string>>({});
  const typingTimer = useRef<number | null>(null);
  const isTyping = useRef(false);

  useEffect(() => {
    if (!socket || !connected) return undefined;

    socket.emit('ticket:join', { ticketId });
    const onTyping = (payload: { ticketId: string; userId: string; name: string; isTyping: boolean }) => {
      if (payload.ticketId !== ticketId) return;
      setTyping((current) => {
        const next = { ...current };
        if (payload.isTyping) next[payload.userId] = payload.name;
        else delete next[payload.userId];
        return next;
      });
    };
    socket.on('ticket:typing', onTyping);

    return () => {
      socket.off('ticket:typing', onTyping);
      socket.emit('ticket:leave', { ticketId });
      setTyping({});
    };
  }, [socket, connected, ticketId]);

  const stopTyping = useCallback(() => {
    if (typingTimer.current !== null) window.clearTimeout(typingTimer.current);
    typingTimer.current = null;
    if (isTyping.current) {
      isTyping.current = false;
      socket?.emit('ticket:typing', { ticketId, isTyping: false });
    }
  }, [socket, ticketId]);

  const signalTyping = useCallback(() => {
    if (!isTyping.current) {
      isTyping.current = true;
      socket?.emit('ticket:typing', { ticketId, isTyping: true });
    }
    if (typingTimer.current !== null) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(stopTyping, TYPING_IDLE_MS);
  }, [socket, ticketId, stopTyping]);

  // Never leave a stale "typing" signal behind when the page closes.
  useEffect(() => stopTyping, [stopTyping]);

  return { typingNames: Object.values(typing), signalTyping, stopTyping };
}
