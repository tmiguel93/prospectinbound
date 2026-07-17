export type User = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SELLER';
  active: boolean;
};

export type DashboardSummary = {
  newLeads: number;
  contactsInProgress: number;
  qualifiedLeads: number;
  scheduledMeetings: number;
  completedMeetings: number;
  monthlySales: number;
  activeCustomers: number;
  projectedCommissionCents: number;
  availableCommissionCents: number;
  partnerRecurringRevenueCents: number;
  overdueActivities: number;
};

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers }
  });
  const body = response.status === 204 ? undefined : await response.json();
  if (!response.ok) {
    const error = Object.assign(
      new Error(body?.message ?? 'Não foi possível concluir a solicitação.'),
      body
    );
    throw error;
  }
  return body as T;
}
