import { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  LayoutGrid,
  Table as TableIcon,
  Clock,
  User,
  MapPin,
  Check,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { TableLoader, GridLoader } from "@/components/ui/table-loader";
import AppointmentFormModal from "@/components/appointments/AppointmentFormModal";
import AppointmentDetailsModal from "@/components/appointments/AppointmentDetailsModal";
import DeleteConfirmationModal from "@/components/appointments/DeleteConfirmationModal";
import {
  AppointmentsService,
  RendezVous,
  AppointmentFormData,
} from "@/services/appointmentsService";
import { SoinsService, Soin } from "@/services/soinsService";
import { Utilisateur } from "@/services/clientsService";
import { UserService } from "@/services/userService";
import InvoiceFormModal from "@/components/invoices/InvoiceFormModal";
import {
  InvoicesService,
  FactureWithDetails,
  FactureItem,
  FactureStatut,
  TypeBien,
  FactureFormData,
} from "@/services/invoicesService";

const statusColors = {
  programmé: "bg-blue-100 text-blue-700 border-blue-200",
  confirmé: "bg-green-100 text-green-700 border-green-200",
  terminé: "bg-gray-100 text-gray-700 border-gray-200",
  annulé: "bg-red-100 text-red-700 border-red-200",
};

const cabinetColors: Record<string, string> = {
  Biohacking: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Nassens: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function Appointments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [creatorFilter, setCreatorFilter] = useState<string>("tous");
  const [dateFilter, setDateFilter] = useState<string>("tous");
  const [cabinetFilter, setCabinetFilter] = useState<string>("tous");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Data state
  const [appointments, setAppointments] = useState<RendezVous[]>([]);
  const [soins, setSoins] = useState<Soin[]>([]);
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<RendezVous | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invoice modal state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceDraft, setInvoiceDraft] = useState<FactureWithDetails | null>(
    null,
  );
  const [isInvoiceSubmitting, setIsInvoiceSubmitting] = useState(false);

  const { toast } = useToast();

  // Get unique creators for filter dropdown
  const creators = Array.from(new Set(appointments.map((apt) => apt.Cree_par)));
  const cabinets = Array.from(
    new Set(
      appointments
        .map((apt) => apt.Cabinet)
        .filter((c): c is string => Boolean(c)),
    ),
  );

  // Load appointments on component mount
  useEffect(() => {
    loadAppointments();
    loadSoins();
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  // Add escape key handler to force close modals if stuck
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && event.ctrlKey) {
        // Ctrl+Escape force closes all modals
        forceCloseAllModals();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      const data = await AppointmentsService.getAll();
      setAppointments(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les rendez-vous",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSoins = async () => {
    try {
      const data = await SoinsService.getAll();
      setSoins(data);
    } catch (error) {
      console.error("Erreur lors du chargement des soins", error);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await UserService.getCurrentAllUsers();
      setUsers(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUserName = (CIN: string) => {
    const user = users.find((user) => user.CIN === CIN);
    if (user && user.nom) return user.nom;
    return CIN;
  };

  const getSoinName = (id?: number, fallback?: string) => {
    if (fallback) return fallback;
    if (!id) return "-";
    const s = soins.find((soin) => soin.id === id);
    return s ? s.Nom : String(id);
  };

  // Filter and search logic
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const matchesSearch =
        appointment.patient_nom
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        appointment.CIN.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.sujet.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "tous" || appointment.status === statusFilter;

      const matchesCreator =
        creatorFilter === "tous" || appointment.Cree_par === creatorFilter;

      const matchesCabinet =
        cabinetFilter === "tous" || appointment.Cabinet === cabinetFilter;

      let matchesDate = true;
      if (dateFilter !== "tous") {
        const appointmentDate = new Date(appointment.date_rendez_vous);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const thisWeek = new Date(today);
        thisWeek.setDate(thisWeek.getDate() + 7);

        switch (dateFilter) {
          case "aujourd'hui":
            matchesDate =
              appointmentDate.toDateString() === today.toDateString();
            break;
          case "demain":
            matchesDate =
              appointmentDate.toDateString() === tomorrow.toDateString();
            break;
          case "cette-semaine":
            matchesDate =
              appointmentDate >= today && appointmentDate <= thisWeek;
            break;
        }
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCreator &&
        matchesCabinet &&
        matchesDate
      );
    });
  }, [
    searchTerm,
    statusFilter,
    creatorFilter,
    cabinetFilter,
    dateFilter,
    appointments,
  ]);

  // CRUD Operations
  const handleCreateAppointment = async (data: AppointmentFormData) => {
    try {
      setIsSubmitting(true);
      await AppointmentsService.create(data);
      await loadAppointments();
      closeFormModal();
      toast({
        title: "Succès",
        description: "Le rendez-vous a été créé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le rendez-vous",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAppointment = async (data: AppointmentFormData) => {
    if (!selectedAppointment) return;

    try {
      setIsSubmitting(true);
      await AppointmentsService.update(selectedAppointment.id, data);
      await loadAppointments();
      closeFormModal();
      toast({
        title: "Succès",
        description: "Le rendez-vous a été modifié avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le rendez-vous",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      setIsSubmitting(true);
      await AppointmentsService.delete(selectedAppointment.id);
      await loadAppointments();
      closeDeleteModal();
      toast({
        title: "Succès",
        description: "Le rendez-vous a été supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le rendez-vous",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modal handlers
  const openCreateModal = () => {
    setSelectedAppointment(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (appointment: RendezVous) => {
    // Close any open modals first
    closeModals();
    setTimeout(() => {
      setSelectedAppointment(appointment);
      setIsFormModalOpen(true);
    }, 100);
  };

  const openDetailsModal = (appointment: RendezVous) => {
    closeModals();
    setTimeout(() => {
      setSelectedAppointment(appointment);
      setIsDetailsModalOpen(true);
    }, 100);
  };

  const openDeleteModal = (appointment: RendezVous) => {
    closeModals();
    setTimeout(() => {
      setSelectedAppointment(appointment);
      setIsDeleteModalOpen(true);
    }, 100);
  };

  // Force close all modals - can be used as emergency escape
  const forceCloseAllModals = () => {
    setIsFormModalOpen(false);
    setIsDetailsModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedAppointment(null);
    setIsSubmitting(false);
  };

  const closeModals = () => {
    // Use setTimeout to ensure proper cleanup order
    setTimeout(() => {
      setIsFormModalOpen(false);
      setIsDetailsModalOpen(false);
      setIsDeleteModalOpen(false);
      setSelectedAppointment(null);
    }, 0);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedAppointment(null);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedAppointment(null);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedAppointment(null);
  };

  const getNextStatus = (status?: RendezVous["status"]) => {
    if (status === "programmé")
      return { next: "confirmé", label: "Marquer comme confirmé" } as const;
    if (status === "confirmé")
      return { next: "terminé", label: "Marquer comme terminé" } as const;
    return null;
  };

  // Open invoice modal prefilled from appointment
  const openInvoicePrefill = (appointment: RendezVous) => {
    // find soin
    const soin = soins.find((s) => s.id === appointment.soin_id);
    const item: FactureItem = {
      id_bien: soin?.id || appointment.soin_id || 0,
      type_bien: TypeBien.SOIN,
      quantite: 1,
      prix_unitaire: soin?.prix || 0,
      nom_bien: soin?.Nom || appointment.soin_nom || appointment.sujet,
    };

    const draft: FactureWithDetails = {
      id: 0,
      CIN: appointment.CIN,
      date: new Date().toISOString(),
      prix_total: item.prix_unitaire,
      prix_ht: item.prix_unitaire,
      tva_amount: 0,
      tva_rate: 0,
      statut: FactureStatut.BROUILLON,
      notes: `Facture préremplie depuis rendez-vous #${appointment.id}`,
      Cree_par: appointment.Cree_par,
      created_at: new Date().toISOString(),
      items: [
        {
          id: 0,
          id_facture: 0,
          id_bien: item.id_bien,
          type_bien: item.type_bien,
          quantite: item.quantite,
          Cree_par: appointment.Cree_par,
          prix_unitaire: item.prix_unitaire,
          nom_bien: item.nom_bien,
        },
      ],
    };

    setInvoiceDraft(draft);
    setIsInvoiceModalOpen(true);
  };

  const handleCreateInvoice = async (data: FactureFormData) => {
    try {
      setIsInvoiceSubmitting(true);
      await InvoicesService.create(data);
      setIsInvoiceModalOpen(false);
      setInvoiceDraft(null);
      toast({ title: "Succès", description: "Facture créée avec succès" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la facture",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsInvoiceSubmitting(false);
    }
  };

  const handleChangeStatus = async (appointment: RendezVous) => {
    const transition = getNextStatus(appointment.status);
    if (!transition) return;
    try {
      setIsSubmitting(true);
      const payload: AppointmentFormData = {
        client_id: appointment.client_id || 0,
        CIN: appointment.CIN,
        sujet: appointment.sujet,
        date_rendez_vous: appointment.date_rendez_vous,
        Cree_par: appointment.Cree_par,
        status: transition.next,
        Cabinet: appointment.Cabinet || "Biohacking",
        soin_id: appointment.soin_id || 0,
      };
      await AppointmentsService.update(appointment.id, payload);
      await loadAppointments();
      toast({
        title: "Statut mis à jour",
        description: `Rendez-vous ${transition.next}`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rendez-vous</h1>
            <p className="text-muted-foreground">
              Gestion et planification des rendez-vous patients
            </p>
          </div>
          <Button className="gap-2" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Nouveau Rendez-vous
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rechercher et Filtrer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, CIN ou sujet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les statuts</SelectItem>
                  <SelectItem value="programmé">Programmé</SelectItem>
                  <SelectItem value="confirmé">Confirmé</SelectItem>
                  <SelectItem value="terminé">Terminé</SelectItem>
                  <SelectItem value="annulé">Annulé</SelectItem>
                </SelectContent>
              </Select>

              {/* Creator Filter */}
              <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Créé par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les créateurs</SelectItem>
                  {creators.map((creator) => (
                    <SelectItem key={creator} value={creator}>
                      {getUserName(creator)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Toutes les dates</SelectItem>
                  <SelectItem value="aujourd'hui">Aujourd'hui</SelectItem>
                  <SelectItem value="demain">Demain</SelectItem>
                  <SelectItem value="cette-semaine">Cette semaine</SelectItem>
                </SelectContent>
              </Select>

              {/* Cabinet Filter */}
              <Select value={cabinetFilter} onValueChange={setCabinetFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Cabinet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les cabinets</SelectItem>
                  {cabinets.map((cab) => (
                    <SelectItem key={cab} value={cab}>
                      {cab}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary and View Toggle */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Chargement..."
              : `${filteredAppointments.length} rendez-vous trouvé(s)`}
          </p>
          <div className="flex rounded-lg border border-border p-1">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-8 gap-2"
            >
              <TableIcon className="h-4 w-4" />
              Tableau
            </Button>
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
              className="h-8 gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              Cartes
            </Button>
          </div>
        </div>

        {/* Appointments Display - Table or Cards */}
        {viewMode === "table" ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                {isLoading ? (
                  <TableLoader columns={10} rows={6} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>CIN</TableHead>
                        <TableHead>Sujet</TableHead>
                        <TableHead>Soin</TableHead>
                        <TableHead>Date & Heure</TableHead>
                        <TableHead>Cabinet</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Créé par</TableHead>
                        <TableHead>Créé le</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.length > 0 ? (
                        filteredAppointments.map((appointment) => (
                          <TableRow
                            key={appointment.id}
                            className="hover:bg-muted/50"
                          >
                            <TableCell className="font-medium">
                              {appointment.patient_nom}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {appointment.CIN}
                            </TableCell>
                            <TableCell>{appointment.sujet}</TableCell>
                            <TableCell>
                              {getSoinName(
                                appointment.soin_id,
                                appointment.soin_nom,
                              )}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(appointment.date_rendez_vous)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  cabinetColors[appointment.Cabinet || ""] ||
                                  "bg-amber-100 text-amber-700 border-amber-200"
                                }
                              >
                                {appointment.Cabinet}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  statusColors[
                                    appointment.status as keyof typeof statusColors
                                  ]
                                }
                              >
                                {appointment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {getUserName(appointment.Cree_par)}
                            </TableCell>
                            <TableCell>
                              {formatDate(appointment.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {getNextStatus(appointment.status) && (
                                    <DropdownMenuItem
                                      className="gap-2"
                                      onClick={() =>
                                        handleChangeStatus(appointment)
                                      }
                                    >
                                      <Check className="h-4 w-4" />
                                      {getNextStatus(appointment.status)!.label}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() =>
                                      openDetailsModal(appointment)
                                    }
                                  >
                                    <Eye className="h-4 w-4" />
                                    Voir détails
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => openEditModal(appointment)}
                                  >
                                    <Edit className="h-4 w-4" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2 text-red-600"
                                    onClick={() => openDeleteModal(appointment)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <Calendar className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                Aucun rendez-vous trouvé avec les critères
                                sélectionnés
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
        ) : (
          /* Cards View */
          <div className="space-y-6">
            {isLoading ? (
              <GridLoader items={6} />
            ) : filteredAppointments.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredAppointments.map((appointment) => (
                  <Card
                    key={appointment.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            {appointment.patient_nom}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground font-mono">
                            CIN: {appointment.CIN}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            statusColors[
                              appointment.status as keyof typeof statusColors
                            ]
                          }
                        >
                          {appointment.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Sujet:</span>
                          <span>{appointment.sujet}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Soin:</span>
                          <span>
                            {getSoinName(
                              appointment.soin_id,
                              appointment.soin_nom,
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Date:</span>
                          <span>
                            {formatDateTime(appointment.date_rendez_vous)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Créé par:</span>
                          <span>{getUserName(appointment.Cree_par)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Cabinet:</span>
                          <Badge
                            variant="secondary"
                            className={
                              cabinetColors[appointment.Cabinet || ""] ||
                              "bg-amber-100 text-amber-700 border-amber-200"
                            }
                          >
                            {appointment.Cabinet}
                          </Badge>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Créé le {formatDate(appointment.created_at)}
                          </p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {getNextStatus(appointment.status) && (
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() =>
                                    handleChangeStatus(appointment)
                                  }
                                >
                                  <Check className="h-4 w-4" />
                                  {getNextStatus(appointment.status)!.label}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => openDetailsModal(appointment)}
                              >
                                <Eye className="h-4 w-4" />
                                Voir détails
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => openEditModal(appointment)}
                              >
                                <Edit className="h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 text-red-600"
                                onClick={() => openDeleteModal(appointment)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <Calendar className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-medium">
                        Aucun rendez-vous trouvé
                      </h3>
                      <p className="text-muted-foreground">
                        Aucun rendez-vous ne correspond aux critères
                        sélectionnés
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Modals */}
        <AppointmentFormModal
          isOpen={isFormModalOpen}
          onClose={closeFormModal}
          onSubmit={
            selectedAppointment
              ? handleUpdateAppointment
              : handleCreateAppointment
          }
          appointment={selectedAppointment}
          isLoading={isSubmitting}
          users={users}
        />

        <AppointmentDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={closeDetailsModal}
          appointment={selectedAppointment}
          onEdit={openEditModal}
          onDelete={openDeleteModal}
          onPrefillInvoice={openInvoicePrefill}
          users={users}
          soins={soins}
        />

        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteAppointment}
          appointment={selectedAppointment}
          isLoading={isSubmitting}
        />

        <InvoiceFormModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setInvoiceDraft(null);
          }}
          onSubmit={handleCreateInvoice}
          invoice={invoiceDraft}
          isLoading={isInvoiceSubmitting}
          users={users}
        />
      </div>
    </DashboardLayout>
  );
}
