import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  FileText,
  History,
  Receipt,
  User,
  DollarSign,
  Eye,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableLoader } from "@/components/ui/table-loader";
import { useToast } from "@/components/ui/use-toast";
import {
  ClientsService,
  Client,
  calculateAge,
  Utilisateur,
} from "@/services/clientsService";
import {
  InvoicesService,
  Facture,
  FactureWithDetails,
  FactureStatut,
  getStatusColor,
  formatPrice,
} from "@/services/invoicesService";
import {
  PaymentsService,
  PaymentWithInvoiceDetails,
  formatDate,
  formatDateTime,
  generatePaymentsFromPaidInvoices,
} from "@/services/paymentsService";
import { AnalyticsService } from "@/services/analyticsService";
import { CurrencyService } from "@/services/currencyService";
import {
  AppointmentsService,
  RendezVous,
} from "@/services/appointmentsService";
import { UserService } from "@/services/userService";
import InvoiceDetailsModal from "@/components/invoices/InvoiceDetailsModal";

export default function PatientOperations() {
  const { cin } = useParams<{ cin: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [patient, setPatient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<FactureWithDetails[]>([]);
  const [payments, setPayments] = useState<PaymentWithInvoiceDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPatientLoading, setIsPatientLoading] = useState(true);
  const [appointments, setAppointments] = useState<RendezVous[]>([]);
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] =
    useState<FactureWithDetails | null>(null);

  useEffect(() => {
    if (!cin) {
      navigate("/patients");
      return;
    }
    loadPatient();
    loadOperations();
    loadUsers();
  }, [cin]);

  const loadPatient = async () => {
    if (!cin) return;
    try {
      setIsPatientLoading(true);
      const clients = await ClientsService.getAll();
      const found = clients.find((c) => c.CIN === cin) || null;
      setPatient(found);
    } catch (e) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations du patient",
        variant: "destructive",
      });
    } finally {
      setIsPatientLoading(false);
    }
  };

  const loadOperations = async () => {
    if (!cin) return;
    try {
      setIsLoading(true);
      const [allInvoices, allPayments, allAppointments] = await Promise.all([
        (async () => {
          await InvoicesService.getAll();
          return InvoicesService.getAllWithDetails();
        })(),
        (async () => {
          await generatePaymentsFromPaidInvoices();
          return PaymentsService.getAllWithDetails();
        })(),
        AppointmentsService.getAll(),
      ]);
      const byPatientInvoices = allInvoices.filter((f) => f.CIN === cin);
      const uniqueInvoicesMap = new Map<number, FactureWithDetails>();
      byPatientInvoices.forEach((f) => {
        if (!uniqueInvoicesMap.has(f.id)) uniqueInvoicesMap.set(f.id, f);
      });
      setInvoices(Array.from(uniqueInvoicesMap.values()));

      const byPatientPayments = allPayments.filter(
        (p) => p.patient_cin === cin,
      );
      const uniquePaymentsMap = new Map<number, PaymentWithInvoiceDetails>();
      byPatientPayments.forEach((p) => {
        if (!uniquePaymentsMap.has(p.id)) uniquePaymentsMap.set(p.id, p);
      });
      setPayments(Array.from(uniquePaymentsMap.values()));

      const byPatientAppointments = allAppointments.filter(
        (a) => a.CIN === cin,
      );
      setAppointments(byPatientAppointments);
    } catch (e) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les opérations du patient",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await UserService.getCurrentAllUsers();
      setUsers(data);
    } catch {}
  };

  const getUserName = (CIN: string) => {
    const user = users.find((user) => user.CIN === CIN);
    if (user && user.nom) return user.nom;
    return CIN;
  };

  const summary = useMemo(() => {
    if (!cin) return null;
    const invoicesPlain: Facture[] = invoices.map(({ items, ...rest }) => rest);
    return AnalyticsService.computeClientSummary(
      {
        clients: patient ? [patient] : [],
        appointments: [],
        invoices: invoicesPlain,
        invoicesWithDetails: invoices,
        payments: payments.map((p) => ({
          id: p.id,
          id_facture: p.id_facture,
          date: p.date,
          montant_totale: p.montant_totale,
          Cree_par: p.Cree_par,
        })),
      },
      cin,
    );
  }, [cin, patient, invoices, payments]);

  const itemsSummary = (items: FactureWithDetails["items"]) => {
    if (!items || items.length === 0) return "—";
    return items.map((it) => `${it.nom_bien} ×${it.quantite}`).join(", ");
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            onClick={() => navigate("/patients")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux patients
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Opérations Patient
            </h1>
            <p className="text-muted-foreground">
              {patient
                ? `${patient.prenom} ${patient.nom} (${patient.CIN})`
                : `CIN: ${cin}`}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <History className="h-4 w-4" />
            Historique des factures et paiements
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" /> Rendez-vous
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  {isLoading ? (
                    <TableLoader columns={4} rows={4} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sujet</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Créé par</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appointments.length > 0 ? (
                          appointments
                            .slice()
                            .sort(
                              (a, b) =>
                                new Date(b.date_rendez_vous).getTime() -
                                new Date(a.date_rendez_vous).getTime(),
                            )
                            .map((apt, idx) => (
                              <TableRow
                                key={`apt-${apt.id}-${idx}`}
                                className="hover:bg-muted/50"
                              >
                                <TableCell className="font-medium">
                                  {apt.sujet}
                                </TableCell>
                                <TableCell>
                                  {formatDate(apt.date_rendez_vous)}
                                </TableCell>
                                <TableCell>
                                  {apt.status || "programmé"}
                                </TableCell>
                                <TableCell>
                                  {getUserName(apt.Cree_par)}
                                </TableCell>
                              </TableRow>
                            ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8">
                              <div className="flex flex-col items-center gap-2">
                                <Calendar className="h-8 w-8 text-muted-foreground" />
                                <p className="text-muted-foreground">
                                  Aucun rendez-vous trouvé
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" /> Factures
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  {isLoading ? (
                    <TableLoader columns={6} rows={6} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Facture</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Créé par</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.length > 0 ? (
                          invoices
                            .slice()
                            .sort(
                              (a, b) =>
                                new Date(b.date).getTime() -
                                new Date(a.date).getTime(),
                            )
                            .map((invoice, idx) => (
                              <TableRow
                                key={`inv-${invoice.id}-${idx}`}
                                className="hover:bg-muted/50"
                              >
                                <TableCell>
                                  <div className="font-medium">
                                    #{invoice.id.toString().padStart(4, "0")}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {invoice.notes
                                      ? invoice.notes
                                      : "Aucune note"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {formatDate(invoice.date)}
                                </TableCell>
                                <TableCell className="font-mono font-semibold">
                                  {formatPrice(invoice.prix_total)}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.statut as FactureStatut)}`}
                                  >
                                    {invoice.statut}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {getUserName(invoice.Cree_par)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setSelectedInvoice(invoice);
                                      setIsDetailsOpen(true);
                                    }}
                                    title="Voir détails"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <div className="flex flex-col items-center gap-2">
                                <Receipt className="h-8 w-8 text-muted-foreground" />
                                <p className="text-muted-foreground">
                                  Aucune facture trouvée
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" /> Paiements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  {isLoading ? (
                    <TableLoader columns={5} rows={6} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Paiement</TableHead>
                          <TableHead>Facture</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Médecin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.length > 0 ? (
                          payments.map((payment, idx) => (
                            <TableRow
                              key={`pay-${payment.id}-${idx}`}
                              className="hover:bg-muted/50"
                            >
                              <TableCell>
                                <div className="font-medium">
                                  #{payment.id.toString().padStart(4, "0")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDateTime(payment.date)}
                                </div>
                              </TableCell>
                              <TableCell>{payment.facture_number}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {formatDate(payment.date)}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono font-semibold text-green-600">
                                {CurrencyService.formatCurrency(
                                  payment.montant_totale,
                                )}
                              </TableCell>
                              <TableCell>
                                {getUserName(payment.Cree_par)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <div className="flex flex-col items-center gap-2">
                                <DollarSign className="h-8 w-8 text-muted-foreground" />
                                <p className="text-muted-foreground">
                                  Aucun paiement trouvé
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

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" /> Informations Patient
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isPatientLoading ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                ) : patient ? (
                  <div className="space-y-3">
                    <div className="text-lg font-semibold">
                      {patient.prenom} {patient.nom}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">
                      CIN: {patient.CIN}
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Né(e): {formatDate(patient.date_naissance)} (
                        {calculateAge(patient.date_naissance)} ans)
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Email: <span className="truncate">{patient.email}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Patient non trouvé
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Synthèse</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total facturé</div>
                    <div className="text-lg font-semibold">
                      {summary
                        ? CurrencyService.formatForDisplay(
                            summary.totalInvoiced,
                          )
                        : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total payé</div>
                    <div className="text-lg font-semibold">
                      {summary
                        ? CurrencyService.formatForDisplay(summary.totalPaid)
                        : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Dernière visite</div>
                    <div className="font-medium">
                      {summary ? formatDate(summary.lastVisit || "") : "-"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <InvoiceDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        invoice={selectedInvoice}
        onEdit={() => {}}
        onDelete={() => {}}
        users={users}
      />
    </DashboardLayout>
  );
}
