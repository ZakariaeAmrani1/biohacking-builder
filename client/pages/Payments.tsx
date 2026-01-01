import { useState, useMemo, useEffect } from "react";
import {
  DollarSign,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  User,
  Receipt,
  Clock,
  Euro,
  CreditCard,
  Target,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useToast } from "@/components/ui/use-toast";
import { TableLoader } from "@/components/ui/table-loader";
import {
  PaymentsService,
  Payment,
  PaymentWithInvoiceDetails,
  getPaymentStatistics,
  formatPrice,
  formatDate,
  formatDateTime,
  getAvailableDoctorsFromPayments,
  generatePaymentsFromPaidInvoices,
} from "@/services/paymentsService";

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [doctorFilter, setDoctorFilter] = useState<string>("tous");
  const [dateFilter, setDateFilter] = useState<string>("tous");

  // Data state
  const [payments, setPayments] = useState<PaymentWithInvoiceDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();

  // Get unique doctors for filter dropdown
  const doctors = getAvailableDoctorsFromPayments();

  // Load payments on component mount
  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setIsLoading(true);

      // Generate payments from paid invoices first
      await generatePaymentsFromPaidInvoices();

      // Then load the payments with details
      const data = await PaymentsService.getAllWithDetails();
      setPayments(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les paiements",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter payments based on search and filters
  const filteredPayments = useMemo(() => {
    let filtered = payments;

    // Search filter
    if (searchTerm) {
      const lowerQuery = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (payment) =>
          payment.patient_cin.toLowerCase().includes(lowerQuery) ||
          payment.Cree_par.toLowerCase().includes(lowerQuery) ||
          payment.facture_number.toLowerCase().includes(lowerQuery) ||
          payment.id.toString().includes(lowerQuery),
      );
    }

    // Doctor filter
    if (doctorFilter !== "tous") {
      filtered = filtered.filter(
        (payment) => payment.Cree_par === doctorFilter,
      );
    }

    // Date filter
    if (dateFilter !== "tous") {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((payment) => {
            const paymentDate = new Date(payment.date);
            return paymentDate >= filterDate;
          });
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter((payment) => {
            const paymentDate = new Date(payment.date);
            return paymentDate >= filterDate;
          });
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter((payment) => {
            const paymentDate = new Date(payment.date);
            return paymentDate >= filterDate;
          });
          break;
        case "quarter":
          filterDate.setMonth(now.getMonth() - 3);
          filtered = filtered.filter((payment) => {
            const paymentDate = new Date(payment.date);
            return paymentDate >= filterDate;
          });
          break;
      }
    }

    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [searchTerm, doctorFilter, dateFilter, payments]);

  // Get statistics from filtered payments
  const statistics = getPaymentStatistics(
    filteredPayments.map((p) => ({
      id: p.id,
      id_facture: p.id_facture,
      date: p.date,
      montant_totale: p.montant_totale,
      Cree_par: p.Cree_par,
    })),
  );

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Paiements</h1>
            <p className="text-muted-foreground">
              Visualisation des revenus et paiements reçus
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Revenus Totaux
              </CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPrice(statistics.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Tous les paiements reçus
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Paiements Total
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.totalPayments}
              </div>
              <p className="text-xs text-muted-foreground">
                Nombre de paiements
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Paiement Moyen
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPrice(statistics.averagePayment)}
              </div>
              <p className="text-xs text-muted-foreground">
                Montant moyen par paiement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ce Mois</CardTitle>
              {statistics.monthlyTrend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPrice(statistics.currentMonthRevenue)}
              </div>
              <p
                className={`text-xs ${statistics.monthlyTrend >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {statistics.monthlyTrend >= 0 ? "+" : ""}
                {formatPrice(statistics.monthlyTrend)} vs mois dernier
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rechercher et Filtrer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher paiement..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Doctor Filter */}
              <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Médecin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les médecins</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor} value={doctor}>
                      {doctor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Toutes les périodes</SelectItem>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="quarter">Ces 3 mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Chargement..."
              : `${filteredPayments.length} paiement(s) trouvé(s)`}
          </p>
          {filteredPayments.length > 0 && (
            <p className="text-sm font-medium">
              Total affiché:{" "}
              {formatPrice(
                filteredPayments.reduce((sum, p) => sum + p.montant_totale, 0),
              )}
            </p>
          )}
        </div>

        {/* Payments Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {isLoading ? (
                <TableLoader columns={7} rows={6} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paiement</TableHead>
                      <TableHead>Facture</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Date Paiement</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Médecin</TableHead>
                      <TableHead>Notes Facture</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length > 0 ? (
                      filteredPayments.map((payment) => (
                        <TableRow
                          key={payment.id}
                          className="hover:bg-muted/50"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <div>
                                <div className="font-medium">
                                  #{payment.id.toString().padStart(4, "0")}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {formatDateTime(payment.date)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-primary" />
                              <div>
                                <div className="font-medium">
                                  {payment.facture_number}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {formatDate(payment.facture_date)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {payment.patient_cin}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatDate(payment.date)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-lg font-semibold text-green-600">
                              {formatPrice(payment.montant_totale)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {payment.Cree_par}
                            </div>
                          </TableCell>
                          <TableCell>
                            {payment.facture_notes ? (
                              <div className="max-w-xs truncate text-sm text-muted-foreground">
                                {payment.facture_notes}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">
                                Aucune note
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <DollarSign className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              {isLoading
                                ? "Chargement des paiements..."
                                : "Aucun paiement trouvé avec les critères sélectionnés"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
