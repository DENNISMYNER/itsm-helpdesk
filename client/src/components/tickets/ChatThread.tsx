import { Lock } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '../../lib/cn';
import { formatDateTime } from '../../lib/format';
import { isStaff } from '../../lib/labels';
import type { TicketMessage } from '../../types/api';
import { Avatar } from '../ui/Avatar';

interface Props {
  messages: TicketMessage[];
  currentUserId: string;
  typingNames: string[];
}

function typingText(names: string[]): string {
  if (names.length === 1) return `${names[0]} is typing`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
  return 'Several people are typing';
}

export function ChatThread({ messages, currentUserId, typingNames }: Props) {
  const bottom = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages.length, typingNames.length]);

  if (messages.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-muted">
        No messages yet. Write the first one below to start the conversation.
      </p>
    );
  }

  return (
    <div className="max-h-[32rem] space-y-4 overflow-y-auto px-4 py-5 sm:px-5" role="log" aria-live="polite" aria-label="Conversation">
      {messages.map((message) => {
        const mine = message.author.id === currentUserId;
        const staffAuthor = isStaff(message.author.role);
        return (
          <article key={message.id} className={cn('flex gap-3', mine && 'flex-row-reverse')}>
            <Avatar name={message.author.name} />
            <div className={cn('min-w-0 max-w-[85%]', mine && 'text-right')}>
              <p className="text-xs text-muted">
                <span className="font-semibold text-ink">{mine ? 'You' : message.author.name}</span>
                {staffAuthor && !mine ? ' · Support' : ''} · {formatDateTime(message.createdAt)}
              </p>
              <div
                className={cn(
                  'mt-1 inline-block whitespace-pre-wrap break-words rounded-lg px-3.5 py-2 text-left text-sm',
                  message.isInternal
                    ? 'border border-dashed border-[var(--prio-medium)] bg-[var(--st-closed-soft)]'
                    : mine
                      ? 'bg-brand text-brand-ink'
                      : 'border border-line bg-subtle',
                )}
              >
                {message.isInternal ? (
                  <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-[var(--prio-medium)]">
                    <Lock aria-hidden className="size-3" />
                    Internal note, not visible to the customer
                  </span>
                ) : null}
                {message.body}
              </div>
            </div>
          </article>
        );
      })}
      {typingNames.length > 0 ? (
        <p className="px-1 text-xs italic text-muted" aria-live="polite">
          {typingText(typingNames)}...
        </p>
      ) : null}
      <div ref={bottom} />
    </div>
  );
}
