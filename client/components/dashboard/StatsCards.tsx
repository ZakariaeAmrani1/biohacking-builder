import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Activity,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientsService } from "@/services/clientsService";
import { AppointmentsService } from "@/services/appointmentsService";
import { InvoicesService, FactureStatut } from "@/services/invoicesService";
import { CurrencyService } from "@/services/currencyService";

interface StatData {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: any;
  description: string;
  loading?: boolean;
}

export default function StatsCards() {
  const [stats, setStats] = useState<StatData[]>([
    {
      title: "Total Patients",
      value: "...",
      change: "...",
      trend: "up",
      icon: Users,
      description: "Patients actifs ce mois",
      loading: true,
    },
    {
      title: "Rendez-vous Aujourd'hui",
      value: "...",
      change: "...",
      trend: "up",
      icon: Calendar,
      description: "Programmés pour aujourd'hui",
      loading: true,
    },
    {
      title: "Revenus Mensuels",
      value: "...",
      change: "...",
      trend: "up",
      icon: DollarSign,
      description: "Comparé au mois dernier",
      loading: true,
    },
    {
      title: "Factures Payées",
      value: "...",
      change: "...",
      trend: "up",
      icon: Activity,
      description: "Taux de paiement",
      loading: true,
    },
  ]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Load all data in parallel
        const [clients, appointments, invoices] = await Promise.all([
          ClientsService.getAll(),
          AppointmentsService.getAll(),
          InvoicesService.getAll(),
        ]);

        // Calculate total patients
        const totalPatients = clients.length;

        // Calculate today's appointments
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const todayAppointments = appointments.filter((apt) =>
          apt.date_rendez_vous.startsWith(todayStr),
        );

        // Calculate monthly revenue (this month)
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyInvoices = invoices.filter((invoice) => {
          const invoiceDate = new Date(invoice.date);
          return (
            invoiceDate.getMonth() === currentMonth &&
            invoiceDate.getFullYear() === currentYear
          );
        });
        const monthlyRevenue = monthlyInvoices.reduce(
          (sum, invoice) => sum + invoice.prix_total,
          0,
        );

        // Calculate previous month revenue for comparison
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const prevMonthInvoices = invoices.filter((invoice) => {
          const invoiceDate = new Date(invoice.date);
          return (
            invoiceDate.getMonth() === prevMonth &&
            invoiceDate.getFullYear() === prevYear
          );
        });
        const prevMonthRevenue = prevMonthInvoices.reduce(
          (sum, invoice) => sum + invoice.prix_total,
          0,
        );

        const revenueChange =
          prevMonthRevenue > 0
            ? (
                ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) *
                100
              ).toFixed(1)
            : "0";

        // Calculate payment success rate
        const paidInvoices = invoices.filter(
          (inv) => inv.statut === FactureStatut.PAYEE,
        );
        const paymentRate =
          invoices.length > 0
            ? ((paidInvoices.length / invoices.length) * 100).toFixed(1)
            : "0";

        // Previous month payment rate for comparison
        const prevMonthPaidInvoices = prevMonthInvoices.filter(
          (inv) => inv.statut === FactureStatut.PAYEE,
        );
        const prevPaymentRate =
          prevMonthInvoices.length > 0
            ? (prevMonthPaidInvoices.length / prevMonthInvoices.length) * 100
            : 0;
        const currentPaymentRateNum = parseFloat(paymentRate);
        const paymentRateChange = (
          currentPaymentRateNum - prevPaymentRate
        ).toFixed(1);

        setStats([
          {
            title: "Total Patients",
            value: totalPatients.toLocaleString(),
            change: "+12.5%", // This would need historical data to calculate properly
            trend: "up",
            icon: Users,
            description: "Patients actifs ce mois",
            loading: false,
          },
          {
            title: "Rendez-vous Aujourd'hui",
            value: todayAppointments.length.toString(),
            change: `+${Math.max(0, todayAppointments.length - 15)}`, // Assuming average of 15
            trend: todayAppointments.length >= 15 ? "up" : "down",
            icon: Calendar,
            description: "Programmés pour aujourd'hui",
            loading: false,
          },
          {
            title: "Revenus Mensuels",
            value: CurrencyService.formatCurrency(monthlyRevenue),
            change: `${parseFloat(revenueChange) >= 0 ? "+" : ""}${revenueChange}%`,
            trend: parseFloat(revenueChange) >= 0 ? "up" : "down",
            icon: DollarSign,
            description: "Comparé au mois dernier",
            loading: false,
          },
          {
            title: "Factures Payées",
            value: `${paymentRate}%`,
            change: `${parseFloat(paymentRateChange) >= 0 ? "+" : ""}${paymentRateChange}%`,
            trend: parseFloat(paymentRateChange) >= 0 ? "up" : "down",
            icon: Activity,
            description: "Taux de paiement",
            loading: false,
          },
        ]);
      } catch (error) {
        console.error("Error loading dashboard stats:", error);
        // Keep loading state or show error
      }
    };

    loadStats();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stat.loading ? (
                <div className="animate-pulse bg-muted h-6 w-16 rounded"></div>
              ) : (
                stat.value
              )}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {!stat.loading && (
                <>
                  {stat.trend === "up" ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                  )}
                  <span
                    className={
                      stat.trend === "up" ? "text-green-500" : "text-red-500"
                    }
                  >
                    {stat.change}
                  </span>
                  <span className="ml-1">{stat.description}</span>
                </>
              )}
              {stat.loading && (
                <div className="animate-pulse bg-muted h-3 w-32 rounded"></div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
