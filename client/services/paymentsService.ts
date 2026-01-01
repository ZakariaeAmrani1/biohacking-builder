import { CurrencyService } from "./currencyService";

// Payment types
export interface Payment {
  id: number;
  id_facture: number;
  date: string;
  montant_totale: number;
  Cree_par: string;
}

export interface PaymentWithInvoiceDetails extends Payment {
  facture_number: string;
  patient_cin: string;
  facture_notes?: string;
  facture_date: string;
}

// Mock data storage - payments are generated from paid invoices
let mockPayments: Payment[] = [
  {
    id: 1,
    id_facture: 1,
    date: "2024-01-15T10:30:00",
    montant_totale: 147.6,
    Cree_par: "Dr. Smith",
  },
];

export class PaymentsService {
  // Get all payments
  static async getAll(): Promise<Payment[]> {
    return [...mockPayments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  // Get all payments with invoice details
  static async getAllWithDetails(): Promise<PaymentWithInvoiceDetails[]> {
    // Import invoices service to get invoice data
    const { InvoicesService } = await import("./invoicesService");
    const invoices = await InvoicesService.getAll();
    console.log(mockPayments);
    return mockPayments
      .map((payment) => {
        const invoice = invoices.find((inv) => inv.id === payment.id_facture);
        return {
          ...payment,
          facture_number: `#${payment.id_facture.toString().padStart(4, "0")}`,
          patient_cin: invoice?.CIN || "N/A",
          facture_notes: invoice?.notes,
          facture_date: invoice?.date || payment.date,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Get payment by ID
  static async getById(id: number): Promise<Payment | null> {
    const payment = mockPayments.find((payment) => payment.id === id);
    return payment || null;
  }

  // Get payments by doctor
  static async getByDoctor(doctor: string): Promise<Payment[]> {
    return mockPayments.filter((payment) => payment.Cree_par === doctor);
  }

  // Get payments by date range
  static async getByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Payment[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return mockPayments.filter((payment) => {
      const paymentDate = new Date(payment.date);
      return paymentDate >= start && paymentDate <= end;
    });
  }

  // Search payments
  static async search(query: string): Promise<Payment[]> {
    const lowerQuery = query.toLowerCase();

    return mockPayments.filter(
      (payment) =>
        payment.Cree_par.toLowerCase().includes(lowerQuery) ||
        payment.id_facture.toString().includes(lowerQuery),
    );
  }

  // Create payment (when invoice is marked as paid)
  static async createFromInvoice(
    invoiceId: number,
    createdBy: string,
  ): Promise<Payment> {
    // Import invoices service to get invoice data
    const { InvoicesService } = await import("./invoicesService");
    const invoice = await InvoicesService.getById(invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const newPayment: Payment = {
      id: Math.max(...mockPayments.map((p) => p.id), 0) + 1,
      id_facture: invoiceId,
      date: new Date().toISOString(),
      montant_totale: invoice.prix_total,
      Cree_par: createdBy,
    };

    mockPayments.push(newPayment);
    return newPayment;
  }
}

// Validation functions
export const validatePaymentData = (data: Omit<Payment, "id">): string[] => {
  const errors: string[] = [];

  if (!data.id_facture) {
    errors.push("L'ID de la facture est obligatoire");
  }

  if (!data.date) {
    errors.push("La date du paiement est obligatoire");
  }

  if (!data.montant_totale || data.montant_totale <= 0) {
    errors.push("Le montant doit être supérieur à 0");
  }

  if (!data.Cree_par.trim()) {
    errors.push("Le créateur est obligatoire");
  }

  return errors;
};

// Utility functions
export const getAvailableDoctorsFromPayments = (): string[] => {
  return Array.from(
    new Set(mockPayments.map((payment) => payment.Cree_par)),
  ).sort();
};

export const formatPrice = (price: number): string => {
  return CurrencyService.formatCurrency(price);
};

// Get payment statistics
export const getPaymentStatistics = (payments: Payment[]) => {
  const totalPayments = payments.length;
  const totalRevenue = payments.reduce(
    (sum, payment) => sum + payment.montant_totale,
    0,
  );

  // Group by month for trend analysis
  const monthlyData = payments.reduce(
    (acc, payment) => {
      const month = new Date(payment.date).toISOString().slice(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { count: 0, revenue: 0 };
      }
      acc[month].count += 1;
      acc[month].revenue += payment.montant_totale;
      return acc;
    },
    {} as Record<string, { count: number; revenue: number }>,
  );

  // Get current and previous month for comparison
  const currentMonth = new Date().toISOString().slice(0, 7);
  const previousMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 7);

  const currentMonthData = monthlyData[currentMonth] || {
    count: 0,
    revenue: 0,
  };
  const previousMonthData = monthlyData[previousMonth] || {
    count: 0,
    revenue: 0,
  };

  // Group by doctor
  const doctorStats = payments.reduce(
    (acc, payment) => {
      if (!acc[payment.Cree_par]) {
        acc[payment.Cree_par] = { count: 0, revenue: 0 };
      }
      acc[payment.Cree_par].count += 1;
      acc[payment.Cree_par].revenue += payment.montant_totale;
      return acc;
    },
    {} as Record<string, { count: number; revenue: number }>,
  );

  return {
    totalPayments,
    totalRevenue,
    averagePayment: totalPayments > 0 ? totalRevenue / totalPayments : 0,
    currentMonthRevenue: currentMonthData.revenue,
    previousMonthRevenue: previousMonthData.revenue,
    currentMonthCount: currentMonthData.count,
    previousMonthCount: previousMonthData.count,
    monthlyTrend: currentMonthData.revenue - previousMonthData.revenue,
    monthlyData,
    doctorStats,
    topDoctor:
      Object.entries(doctorStats).sort(
        (a, b) => b[1].revenue - a[1].revenue,
      )[0]?.[0] || "N/A",
  };
};

// Format date for display
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Generate mock data based on existing paid invoices
export const generatePaymentsFromPaidInvoices = async () => {
  const { InvoicesService, FactureStatut } = await import("./invoicesService");
  const invoices = await InvoicesService.getAll();
  // Clear existing mock payments
  mockPayments = [];

  // Create payments for all paid invoices
  const paidInvoices = invoices.filter(
    (invoice) => invoice.statut === FactureStatut.PAYEE,
  );

  paidInvoices.forEach((invoice, index) => {
    const payment: Payment = {
      id: index + 1,
      id_facture: invoice.id,
      date: new Date(
        new Date(invoice.date).getTime() +
          Math.random() * 7 * 24 * 60 * 60 * 1000,
      ).toISOString(), // Random date after invoice
      montant_totale: invoice.prix_total,
      Cree_par: invoice.Cree_par,
    };
    mockPayments.push(payment);
  });

  return mockPayments;
};
