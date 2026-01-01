import { ClientsService, Client } from "./clientsService";
import { AppointmentsService, RendezVous } from "./appointmentsService";
import {
  InvoicesService,
  Facture,
  FactureWithDetails,
  FactureStatut,
  FactureBien,
  TypeBien,
} from "./invoicesService";
import { PaymentsService, Payment } from "./paymentsService";

export interface AnalyticsFilters {
  startDate?: string; // ISO
  endDate?: string; // ISO
  clientCIN?: string;
  employeeCIN?: string; // Cree_par on records
}

export interface GlobalKPIs {
  periodClientsCount: number;
  periodAppointmentsCount: number;
  periodRevenueTotal: number;
  periodPaidRevenueTotal: number;
  uniqueClientsWithInvoices: number;
}

export interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface EmployeeProductionItem {
  employee: string;
  invoicesCount: number;
  revenue: number;
}

export interface ClientSummary {
  client?: Client | null;
  visitsCount: number;
  lastVisit?: string | null;
  lastPayment?: string | null;
  totalInvoiced: number;
  totalPaid: number;
  products: TopItem[];
  services: TopItem[];
}

export interface AnalyticsData {
  clients: Client[];
  appointments: RendezVous[];
  invoices: Facture[];
  invoicesWithDetails: FactureWithDetails[];
  payments: Payment[];
}

const inRange = (d: string, start?: string, end?: string) => {
  const dt = new Date(d).getTime();
  if (start && dt < new Date(start).getTime()) return false;
  if (end && dt > new Date(end).getTime()) return false;
  return true;
};

export const AnalyticsService = {
  async loadAll(): Promise<AnalyticsData> {
    const [clients, appointments] = await Promise.all([
      ClientsService.getAll(),
      AppointmentsService.getAll(),
    ]);
    const invoices = await InvoicesService.getAll();
    const invoicesWithDetails = await InvoicesService.getAllWithDetails();
    const payments = await PaymentsService.getAll();
    return { clients, appointments, invoices, invoicesWithDetails, payments };
  },

  filterData(data: AnalyticsData, filters: AnalyticsFilters): AnalyticsData {
    const { startDate, endDate, clientCIN, employeeCIN } = filters;

    const appointments = data.appointments.filter(
      (a) =>
        (!clientCIN || a.CIN === clientCIN) &&
        (!employeeCIN || a.Cree_par === employeeCIN) &&
        inRange(a.date_rendez_vous, startDate, endDate),
    );

    const invoices = data.invoices.filter(
      (f) =>
        (!clientCIN || f.CIN === clientCIN) &&
        (!employeeCIN || f.Cree_par === employeeCIN) &&
        inRange(f.date, startDate, endDate),
    );

    const invoiceIds = new Set(invoices.map((f) => f.id));
    const invoicesWithDetails = data.invoicesWithDetails
      .filter((f) => invoiceIds.has(f.id))
      .map((f) => ({
        ...f,
        items: f.items.filter(() => true),
      }));

    const payments = data.payments.filter(
      (p) =>
        (!employeeCIN || p.Cree_par === employeeCIN) &&
        inRange(p.date, startDate, endDate) &&
        (!clientCIN || invoices.some((f) => f.id === p.id_facture && f.CIN === clientCIN)),
    );

    return { clients: data.clients, appointments, invoices, invoicesWithDetails, payments };
  },

  computeKPIs(data: AnalyticsData): GlobalKPIs {
    const periodClients = new Set<string>();

    data.appointments.forEach((a) => periodClients.add(a.CIN));
    data.invoices.forEach((f) => periodClients.add(f.CIN));

    const periodRevenueTotal = data.invoices.reduce((s, f) => s + f.prix_total, 0);
    const periodPaidRevenueTotal = data.invoices
      .filter((f) => f.statut === FactureStatut.PAYEE)
      .reduce((s, f) => s + f.prix_total, 0);

    return {
      periodClientsCount: periodClients.size,
      periodAppointmentsCount: data.appointments.length,
      periodRevenueTotal,
      periodPaidRevenueTotal,
      uniqueClientsWithInvoices: new Set(data.invoices.map((f) => f.CIN)).size,
    };
  },

  computeClientSummary(data: AnalyticsData, cin: string): ClientSummary {
    const client = data.clients.find((c) => c.CIN === cin) || null;
    const clientAppointments = data.appointments.filter((a) => a.CIN === cin);
    const clientInvoices = data.invoices.filter((f) => f.CIN === cin);
    const clientInvoicesWithDetails = data.invoicesWithDetails.filter((f) => f.CIN === cin);

    const visitsCount = clientAppointments.length;
    const lastVisit = clientAppointments
      .map((a) => a.date_rendez_vous)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

    const lastPayment = clientInvoices
      .filter((f) => f.statut === FactureStatut.PAYEE)
      .map((f) => f.date)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

    const totalInvoiced = clientInvoices.reduce((s, f) => s + f.prix_total, 0);
    const totalPaid = clientInvoices
      .filter((f) => f.statut === FactureStatut.PAYEE)
      .reduce((s, f) => s + f.prix_total, 0);

    const items = clientInvoicesWithDetails.flatMap((f) => f.items);

    const aggregate = (type: TypeBien): TopItem[] => {
      const map = new Map<string, { quantity: number; revenue: number }>();
      items
        .filter((it) => it.type_bien === type)
        .forEach((it) => {
          const key = it.nom_bien || `${it.type_bien}-${it.id_bien}`;
          const prev = map.get(key) || { quantity: 0, revenue: 0 };
          map.set(key, {
            quantity: prev.quantity + it.quantite,
            revenue: prev.revenue + it.quantite * it.prix_unitaire,
          });
        });
      return Array.from(map.entries())
        .map(([name, v]) => ({ name, quantity: v.quantity, revenue: v.revenue }))
        .sort((a, b) => b.quantity - a.quantity);
    };

    return {
      client,
      visitsCount,
      lastVisit,
      lastPayment,
      totalInvoiced,
      totalPaid,
      products: aggregate(TypeBien.PRODUIT),
      services: aggregate(TypeBien.SOIN),
    };
  },

  topServices(data: AnalyticsData, limit = 10): TopItem[] {
    const items = data.invoicesWithDetails.flatMap((f) => f.items);
    const byService = new Map<string, { quantity: number; revenue: number }>();
    items
      .filter((it) => it.type_bien === TypeBien.SOIN)
      .forEach((it) => {
        const key = it.nom_bien || `soin-${it.id_bien}`;
        const prev = byService.get(key) || { quantity: 0, revenue: 0 };
        byService.set(key, {
          quantity: prev.quantity + it.quantite,
          revenue: prev.revenue + it.prix_unitaire * it.quantite,
        });
      });
    return Array.from(byService.entries())
      .map(([name, v]) => ({ name, quantity: v.quantity, revenue: v.revenue }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  },

  topProducts(data: AnalyticsData, limit = 10): TopItem[] {
    const items = data.invoicesWithDetails.flatMap((f) => f.items);
    const byProduct = new Map<string, { quantity: number; revenue: number }>();
    items
      .filter((it) => it.type_bien === TypeBien.PRODUIT)
      .forEach((it) => {
        const key = it.nom_bien || `produit-${it.id_bien}`;
        const prev = byProduct.get(key) || { quantity: 0, revenue: 0 };
        byProduct.set(key, {
          quantity: prev.quantity + it.quantite,
          revenue: prev.revenue + it.prix_unitaire * it.quantite,
        });
      });
    return Array.from(byProduct.entries())
      .map(([name, v]) => ({ name, quantity: v.quantity, revenue: v.revenue }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  },

  employeeProduction(data: AnalyticsData): EmployeeProductionItem[] {
    const byEmployee = new Map<string, { invoicesCount: number; revenue: number }>();
    data.invoices.forEach((f) => {
      const key = f.Cree_par || "N/A";
      const prev = byEmployee.get(key) || { invoicesCount: 0, revenue: 0 };
      byEmployee.set(key, {
        invoicesCount: prev.invoicesCount + 1,
        revenue: prev.revenue + f.prix_total,
      });
    });
    return Array.from(byEmployee.entries())
      .map(([employee, v]) => ({ employee, invoicesCount: v.invoicesCount, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  },
};
