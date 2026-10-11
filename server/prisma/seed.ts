/**
 * Demo data: staff, customers and ~50 tickets spread over the last 30 days.
 *
 * Tickets are created OPEN and then walked through legal status transitions, so the
 * seed exercises the same PostgreSQL guard triggers as the real application would.
 * Safe to run repeatedly: users are upserted and sample tickets are only created once.
 */
import {
  AuditAction,
  NotificationType,
  Role,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../src/domain/enums';
import { hashPassword } from '../src/lib/password';
import { prisma } from '../src/lib/prisma';
import { ticketRef } from '../src/modules/tickets/ticket.labels';
import { computeSlaDueAt } from '../src/modules/tickets/ticket.sla';
import { lifecycleTimestamps } from '../src/modules/tickets/ticket.state-machine';

const PASSWORD = process.env.SEED_PASSWORD ?? 'ChangeMe123!';
const TICKET_COUNT = 54;
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

interface SeedUser {
  email: string;
  name: string;
  role: Role;
  skills: TicketCategory[];
}

const STAFF: SeedUser[] = [
  { email: 'admin@itsm.dev', name: 'Amina Admin', role: Role.ADMIN, skills: [] },
  {
    email: 'grace.agent@itsm.dev',
    name: 'Grace Wanjiru',
    role: Role.AGENT,
    skills: [TicketCategory.NETWORK, TicketCategory.SECURITY],
  },
  {
    email: 'brian.agent@itsm.dev',
    name: 'Brian Otieno',
    role: Role.AGENT,
    skills: [TicketCategory.HARDWARE, TicketCategory.SOFTWARE],
  },
  {
    email: 'fatuma.agent@itsm.dev',
    name: 'Fatuma Hassan',
    role: Role.AGENT,
    skills: [TicketCategory.ACCESS, TicketCategory.EMAIL],
  },
  {
    email: 'peter.agent@itsm.dev',
    name: 'Peter Kamau',
    role: Role.AGENT,
    skills: [TicketCategory.SOFTWARE, TicketCategory.NETWORK, TicketCategory.OTHER],
  },
];

const CUSTOMERS: SeedUser[] = [
  { email: 'mary.customer@itsm.dev', name: 'Mary Njeri', role: Role.CUSTOMER, skills: [] },
  { email: 'john.customer@itsm.dev', name: 'John Mwangi', role: Role.CUSTOMER, skills: [] },
  { email: 'lucy.customer@itsm.dev', name: 'Lucy Achieng', role: Role.CUSTOMER, skills: [] },
  { email: 'david.customer@itsm.dev', name: 'David Kiptoo', role: Role.CUSTOMER, skills: [] },
];

interface Template {
  category: TicketCategory;
  priority: TicketPriority;
  title: string;
  description: string;
}

const C = TicketCategory;
const P = TicketPriority;
const TEMPLATES: Template[] = [
  { category: C.HARDWARE, priority: P.MEDIUM, title: 'Laptop battery drains in under an hour', description: 'My laptop used to last a full day on battery and now dies after about 50 minutes. It is two years old and I mostly work unplugged in meetings.' },
  { category: C.HARDWARE, priority: P.LOW, title: 'External monitor flickers when docked', description: 'The 27-inch monitor on my desk flickers every few seconds when connected through the docking station. It works fine on a direct HDMI cable.' },
  { category: C.HARDWARE, priority: P.LOW, title: 'Keyboard keys intermittently not responding', description: 'The E and R keys stop working at random, which makes typing very slow. Cleaning the keyboard did not help.' },
  { category: C.HARDWARE, priority: P.MEDIUM, title: 'Second-floor printer jams on every job', description: 'The shared printer on the second floor jams on almost every print job. Several people in the team are affected.' },
  { category: C.SOFTWARE, priority: P.MEDIUM, title: 'Excel crashes when opening large workbooks', description: 'Excel closes without warning when I open the monthly reconciliation workbook (about 60 MB). Smaller files are fine.' },
  { category: C.SOFTWARE, priority: P.HIGH, title: 'Cannot install the VPN client', description: 'The VPN installer fails at 80% with error 1603. I need remote access before I travel on Thursday.' },
  { category: C.SOFTWARE, priority: P.MEDIUM, title: 'Teams meeting audio keeps cutting out', description: 'During Teams calls people hear me for a few seconds and then the audio drops. Headset works elsewhere.' },
  { category: C.SOFTWARE, priority: P.LOW, title: 'Request to install Adobe Acrobat Pro', description: 'I need to edit and sign PDF contracts regularly and the free reader is not enough. Manager approval attached.' },
  { category: C.NETWORK, priority: P.HIGH, title: 'Wi-Fi drops every few minutes in meeting room 3', description: 'Video calls in meeting room 3 disconnect from Wi-Fi every few minutes. Other rooms are fine.' },
  { category: C.NETWORK, priority: P.MEDIUM, title: 'Very slow internet in the finance office', description: 'Pages take 20+ seconds to load for everyone in the finance office since Monday morning.' },
  { category: C.NETWORK, priority: P.HIGH, title: 'VPN connection times out from home', description: 'The VPN connects, then times out after about two minutes. I have tried two different home networks.' },
  { category: C.NETWORK, priority: P.HIGH, title: 'Network is down in building B', description: 'No wired or wireless connectivity in building B since 08:40. About 30 people cannot work.' },
  { category: C.ACCESS, priority: P.MEDIUM, title: 'Password reset email never arrives', description: 'I requested a password reset three times and no email arrives, even in spam. I am locked out of the HR portal.' },
  { category: C.ACCESS, priority: P.LOW, title: 'Need access to the finance shared drive', description: 'I joined the finance team this week and need read/write access to the shared drive. Manager has approved.' },
  { category: C.ACCESS, priority: P.HIGH, title: 'Account locked after changing MFA device', description: 'I got a new phone and now cannot pass multi-factor authentication. The old device was wiped.' },
  { category: C.ACCESS, priority: P.MEDIUM, title: 'New hire needs accounts set up', description: 'A new colleague starts on Monday and needs email, the ERP system and the shared calendar configured.' },
  { category: C.EMAIL, priority: P.MEDIUM, title: 'Outlook not syncing on my phone', description: 'New emails show up on my laptop but not on my phone since the weekend. Removing and re-adding the account did not help.' },
  { category: C.EMAIL, priority: P.LOW, title: 'Shared mailbox missing from Outlook', description: 'The support@ shared mailbox disappeared from my Outlook sidebar yesterday. I still need to monitor it.' },
  { category: C.EMAIL, priority: P.LOW, title: 'Mailbox almost full, need archive help', description: 'My mailbox is at 98% and I cannot delete the large attachments I still need for audit purposes.' },
  { category: C.SECURITY, priority: P.HIGH, title: 'Suspicious email asking for my password', description: 'I received an email that looks like it is from IT asking me to confirm my password through a link. I did not click it.' },
  { category: C.SECURITY, priority: P.CRITICAL, title: 'Lost company laptop, please lock the account', description: 'I left my work laptop in a taxi this morning. Please disable the account and wipe the device remotely.' },
  { category: C.SECURITY, priority: P.HIGH, title: 'Unexpected MFA prompts I did not trigger', description: 'I keep receiving MFA approval requests on my phone that I did not start. Someone may have my password.' },
  { category: C.OTHER, priority: P.LOW, title: 'Request for a second monitor', description: 'I work with large spreadsheets all day and would like a second monitor for my desk.' },
  { category: C.OTHER, priority: P.LOW, title: 'Software licence renewal question', description: 'Our design team licence renews next month. Who handles the renewal and what do you need from us?' },
];

const AGENT_REPLIES = [
  'Thanks for reporting this. I am looking into it now and will update you shortly.',
  'I have reproduced the issue on my side and am working on a fix.',
  'Could you tell me when this started and whether anything changed on your device recently?',
  'I have escalated this to the vendor and will keep you posted.',
];
const CUSTOMER_REPLIES = [
  'It started on Monday morning, nothing else changed as far as I know.',
  'I tried restarting as suggested, but the problem is still there.',
  'Thanks, that sounds right. Please let me know when it is done.',
];
const INTERNAL_NOTES = [
  'Checked the logs: matches a known issue, applying the standard fix.',
  'Waiting on the vendor for a patch. Revisit tomorrow morning.',
  'Customer is travelling next week, so this has a soft deadline.',
];

const OUTCOMES: Array<{ weight: number; path: TicketStatus[] }> = [
  { weight: 14, path: [] },
  { weight: 24, path: [TicketStatus.IN_PROGRESS] },
  { weight: 12, path: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING_ON_CUSTOMER] },
  { weight: 20, path: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED] },
  {
    weight: 8,
    path: [
      TicketStatus.IN_PROGRESS,
      TicketStatus.WAITING_ON_CUSTOMER,
      TicketStatus.IN_PROGRESS,
      TicketStatus.RESOLVED,
    ],
  },
  { weight: 22, path: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED] },
];

/** Deterministic PRNG so every seed run produces the same dataset. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(20261010);

function pick<T>(items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error('Cannot pick from an empty list');
  return item;
}

function pickOutcome(): TicketStatus[] {
  const total = OUTCOMES.reduce((sum, outcome) => sum + outcome.weight, 0);
  let roll = random() * total;
  for (const outcome of OUTCOMES) {
    roll -= outcome.weight;
    if (roll < 0) return outcome.path;
  }
  return [];
}

interface Account {
  id: string;
  name: string;
  skills: TicketCategory[];
}

async function upsertUsers(users: SeedUser[], passwordHash: string): Promise<Account[]> {
  const accounts: Account[] = [];
  for (const user of users) {
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, skills: { set: user.skills }, isActive: true },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        skills: user.skills,
        passwordHash,
      },
      select: { id: true, name: true, skills: true },
    });
    accounts.push(saved);
  }
  return accounts;
}

async function seedTicket(
  index: number,
  agents: Account[],
  customers: Account[],
  now: number,
): Promise<void> {
  const template = TEMPLATES[index % TEMPLATES.length];
  if (!template) throw new Error('No ticket templates configured');
  const requester = pick(customers);

  const createdAt = new Date(now - Math.floor(random() * 29 * DAY) - Math.floor(random() * 10) * 60 * MINUTE);
  const path = pickOutcome();

  // Most tickets are routed to a specialist; a few new ones wait unassigned in the queue.
  const specialists = agents.filter((agent) => agent.skills.includes(template.category));
  const owner = pick(specialists.length > 0 ? specialists : agents);
  const assigned = path.length > 0 || random() > 0.2 ? owner : null;

  const ticket = await prisma.ticket.create({
    data: {
      title: template.title,
      description: template.description,
      category: template.category,
      priority: template.priority,
      requesterId: requester.id,
      assigneeId: assigned?.id ?? null,
      slaDueAt: computeSlaDueAt(template.priority, createdAt),
      createdAt,
      updatedAt: createdAt,
    },
    select: { id: true, number: true },
  });

  await prisma.auditLog.create({
    data: {
      ticketId: ticket.id,
      actorId: requester.id,
      action: AuditAction.TICKET_CREATED,
      toValue: TicketStatus.OPEN,
      metadata: { priority: template.priority, category: template.category },
      createdAt,
    },
  });

  if (assigned) {
    await prisma.auditLog.create({
      data: {
        ticketId: ticket.id,
        actorId: null,
        action: AuditAction.ASSIGNED,
        toValue: assigned.id,
        metadata: { assigneeName: assigned.name, automatic: true },
        createdAt,
      },
    });
  }

  let current: TicketStatus = TicketStatus.OPEN;
  let at = createdAt;
  let firstReplyRecorded = false;

  for (const next of path) {
    at = new Date(Math.min(now, at.getTime() + (15 + Math.floor(random() * 900)) * MINUTE));
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: next, ...lifecycleTimestamps(current, next, at), updatedAt: at },
    });
    await prisma.auditLog.create({
      data: {
        ticketId: ticket.id,
        actorId: assigned?.id ?? null,
        action: AuditAction.STATUS_CHANGED,
        fromValue: current,
        toValue: next,
        createdAt: at,
      },
    });

    if (assigned && next === TicketStatus.IN_PROGRESS && !firstReplyRecorded) {
      const replyAt = new Date(Math.min(now, at.getTime() + 5 * MINUTE));
      await prisma.ticketMessage.create({
        data: { ticketId: ticket.id, authorId: assigned.id, body: pick(AGENT_REPLIES), createdAt: replyAt },
      });
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { firstResponseAt: replyAt, updatedAt: replyAt },
      });
      firstReplyRecorded = true;
      if (random() > 0.6) {
        const note = await prisma.ticketMessage.create({
          data: { ticketId: ticket.id, authorId: assigned.id, body: pick(INTERNAL_NOTES), isInternal: true, createdAt: replyAt },
          select: { id: true },
        });
        await prisma.auditLog.create({
          data: {
            ticketId: ticket.id,
            actorId: assigned.id,
            action: AuditAction.NOTE_ADDED,
            metadata: { messageId: note.id },
            createdAt: replyAt,
          },
        });
      }
    }
    if (assigned && next === TicketStatus.WAITING_ON_CUSTOMER) {
      await prisma.ticketMessage.create({
        data: { ticketId: ticket.id, authorId: assigned.id, body: pick(AGENT_REPLIES), createdAt: at },
      });
    }
    if (current === TicketStatus.WAITING_ON_CUSTOMER && next === TicketStatus.IN_PROGRESS) {
      await prisma.ticketMessage.create({
        data: { ticketId: ticket.id, authorId: requester.id, body: pick(CUSTOMER_REPLIES), createdAt: at },
      });
    }
    current = next;
  }

  // Give the agents' notification bell something to show for tickets still waiting for them.
  if (assigned && current === TicketStatus.OPEN) {
    await prisma.notification.create({
      data: {
        userId: assigned.id,
        ticketId: ticket.id,
        type: NotificationType.TICKET_ASSIGNED,
        title: `${ticketRef(ticket.number)} was assigned to you`,
        body: template.title,
        createdAt,
      },
    });
  }
}

async function main(): Promise<void> {
  const passwordHash = await hashPassword(PASSWORD);
  const staff = await upsertUsers(STAFF, passwordHash);
  const customers = await upsertUsers(CUSTOMERS, passwordHash);
  const agents = staff.filter((account) =>
    STAFF.some((user) => user.name === account.name && user.role === Role.AGENT),
  );

  const existing = await prisma.ticket.count();
  if (existing > 0) {
    console.log(`Users are up to date. Skipped sample tickets (${existing} tickets already exist).`);
  } else {
    const now = Date.now();
    for (let index = 0; index < TICKET_COUNT; index += 1) {
      await seedTicket(index, agents, customers, now);
    }
    console.log(`Created ${TICKET_COUNT} sample tickets.`);
  }

  console.log('\nDemo accounts (password for all of them is the SEED_PASSWORD value):');
  for (const user of [...STAFF, ...CUSTOMERS]) {
    console.log(`  ${user.role.padEnd(8)} ${user.email}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
