import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/Button';
import { Card, PageHeader } from '../components/ui/Card';
import { ErrorBanner } from '../components/ui/Feedback';
import { SelectField, TextAreaField, TextField } from '../components/ui/Field';
import { useCurrentUser } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useCreateTicket } from '../hooks/useTickets';
import { fieldErrors } from '../lib/api-client';
import { CATEGORY_LABEL, PRIORITY_LABEL, isStaff, ticketRef } from '../lib/labels';
import { TICKET_CATEGORIES, TICKET_PRIORITIES, type TicketCategory, type TicketPriority } from '../types/api';

export function NewTicketPage() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { notify } = useToast();
  const create = useCreateTicket();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('OTHER');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');

  // Only support staff can declare an emergency; for everyone else it is raised automatically
  // when the description clearly describes one (outage, suspected breach).
  const priorities = isStaff(user.role) ? TICKET_PRIORITIES : TICKET_PRIORITIES.filter((p) => p !== 'CRITICAL');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const ticket = await create.mutateAsync({ title, description, category, priority });
      notify({ tone: 'success', title: `${ticketRef(ticket.number)} created`, body: ticket.assignee ? `Assigned to ${ticket.assignee.name}` : 'Waiting for an agent' });
      void navigate(`/tickets/${ticket.id}`);
    } catch {
      // Rendered below through `create.error`.
    }
  };

  const errors = fieldErrors(create.error);
  const hasFieldErrors = Object.keys(errors).length > 0;

  return (
    <>
      <PageHeader title="New ticket" description="Tell us what is wrong. The more detail you give, the faster we can fix it." />
      <Card className="max-w-2xl">
        <form onSubmit={(event) => void submit(event)} className="space-y-5 p-4 sm:p-6" noValidate>
          {hasFieldErrors ? null : <ErrorBanner error={create.error} />}

          <TextField
            label="What do you need help with?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="e.g. Cannot connect to the office Wi-Fi"
            error={errors.title}
            required
          />
          <TextAreaField
            label="Describe the problem"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            rows={7}
            hint="What happened, when it started, and what you already tried."
            error={errors.description}
            required
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)} hint="Helps us route it to the right specialist.">
              {TICKET_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_LABEL[value]}
                </option>
              ))}
            </SelectField>
            <SelectField label="How urgent is it?" value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)} hint="Urgent problems get a shorter response target.">
              {priorities.map((value) => (
                <option key={value} value={value}>
                  {PRIORITY_LABEL[value]}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => void navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending} disabled={title.trim().length < 5 || description.trim().length < 10}>
              Submit ticket
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
