import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Check,
  X,
  AlertCircle,
  Eye,
  Edit,
  Search,
  Filter,
  Package,
  Calendar,
  User,
  DollarSign,
  CreditCard,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import TimeSlotPicker from "@/components/appointments/TimeSlotPicker";
import {
  ClientsService,
  Client,
  ClientFormData,
} from "@/services/clientsService";
import {
  AppointmentsService,
  RendezVous,
  AppointmentFormData,
} from "@/services/appointmentsService";
import {
  InvoicesService,
  FactureFormData,
  FactureStatut,
  TypeBien,
  FactureItem,
  FactureWithDetails,
} from "@/services/invoicesService";
import { ProductsService, Product } from "@/services/productsService";
import { SoinsService, Soin } from "@/services/soinsService";
import { AuthService } from "@/services/authService";
import { cn } from "@/lib/utils";

interface WorkflowFormData {
  selectedClientId?: number;
  clientCIN: string;
  clientNom: string;
  clientPrenom: string;
  clientDateNaissance: string;
  clientAdresse: string;
  clientTelephone: string;
  clientEmail: string;
  clientGroupSanguin: string;
  clientAntecedents: string;
  clientAllergies: string;
  isNewClient: boolean;

  appointmentDate: string;
  appointmentSubject: string;
  appointmentCabinet: string;
  appointmentSoinId: string;
  appointmentStatus: "programmé" | "confirmé" | "terminé" | "annulé";

  invoiceItems: FactureItem[];

  invoiceDate: string;
  invoiceNotes: string;
  invoiceStatut: FactureStatut;

  paymentDate: string;
  paymentMethod: string;
  paymentAmount: number;
  chequeNumero?: string;
  chequeBanque?: string;
  chequeDateTirage?: string;
}

interface WorkflowRecord {
  appointment: RendezVous;
  invoice: FactureWithDetails;
  client: Client;
}

interface WorkflowDraft {
  id?: string;
  stage:
    | "client"
    | "appointment"
    | "products"
    | "invoice"
    | "payment"
    | "completed";
  clientId?: number;
  appointmentId?: number;
  invoiceId?: number;
  formData: Partial<WorkflowFormData>;
  createdAt: string;
  updatedAt: string;
}

const STEPS = [
  { id: 1, label: "Client", description: "Sélectionner ou créer un client" },
  { id: 2, label: "Rendez-vous", description: "Créer un rendez-vous" },
  { id: 3, label: "Produits", description: "Sélectionner les produits" },
  { id: 4, label: "Facture", description: "Créer la facture" },
  { id: 5, label: "Paiement", description: "Traiter le paiement" },
];

const statusLabels: Record<string, string> = {
  programmé: "Programmé",
  confirmé: "Confirmé",
  terminé: "Terminé",
  annulé: "Annulé",
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Espèces",
  cheque: "Chèque",
  bank: "Virement bancaire",
  card: "Carte bancaire",
};

const statusColors = {
  programmé: "bg-blue-100 text-blue-700 border-blue-200",
  confirmé: "bg-green-100 text-green-700 border-green-200",
  terminé: "bg-gray-100 text-gray-700 border-gray-200",
  annulé: "bg-red-100 text-red-700 border-red-200",
};

const paymentStatusLabels: Record<string, string> = {
  [FactureStatut.BROUILLON]: "Brouillon",
  [FactureStatut.ENVOYEE]: "Envoyée",
  [FactureStatut.PAYEE]: "Payée",
  [FactureStatut.ANNULEE]: "Annulée",
};

export default function Workflow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [soins, setSoins] = useState<Soin[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [workflowDrafts, setWorkflowDrafts] = useState<WorkflowDraft[]>([]);
  const [currentDraft, setCurrentDraft] = useState<WorkflowDraft | null>(null);
  const [showWorkflowDetailsModal, setShowWorkflowDetailsModal] =
    useState(false);
  const [selectedWorkflowDetails, setSelectedWorkflowDetails] =
    useState<WorkflowRecord | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("tous");
  const [filterPaymentMethod, setFilterPaymentMethod] =
    useState<string>("tous");
  const [filterPaymentStatus, setFilterPaymentStatus] =
    useState<string>("tous");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Product details modal
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowRecord | null>(null);
  const [showProductsModal, setShowProductsModal] = useState(false);

  const { toast } = useToast();

  const form = useForm<WorkflowFormData>({
    defaultValues: {
      // Client fields
      selectedClientId: undefined,
      clientCIN: "",
      clientNom: "",
      clientPrenom: "",
      clientDateNaissance: "",
      clientAdresse: "",
      clientTelephone: "",
      clientEmail: "",
      clientGroupSanguin: "O+",
      clientAntecedents: "",
      clientAllergies: "",
      isNewClient: true,

      // Appointment fields
      appointmentDate: "",
      appointmentSubject: "",
      appointmentCabinet: "",
      appointmentSoinId: "",
      appointmentStatus: "programmé",

      // Products/Services
      invoiceItems: [],

      // Invoice fields
      invoiceDate: "",
      invoiceNotes: "",
      invoiceStatut: FactureStatut.BROUILLON,

      // Payment fields
      paymentDate: "",
      paymentMethod: "cash",
      paymentAmount: 0,
      chequeNumero: "",
      chequeBanque: "",
      chequeDateTirage: "",
    },
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [
        clientsData,
        soinsData,
        productsData,
        appointmentsData,
        invoicesData,
      ] = await Promise.all([
        ClientsService.getAll(),
        SoinsService.getAll(),
        ProductsService.getAll(),
        AppointmentsService.getAll(),
        InvoicesService.getAll(),
      ]);

      setClients(clientsData);
      setSoins(soinsData);
      setProducts(productsData);

      // Combine appointments and invoices into workflow records
      const workflows: WorkflowRecord[] = [];
      for (const appointment of appointmentsData) {
        const invoice = invoicesData.find((inv) => inv.CIN === appointment.CIN);
        const client = clientsData.find((c) => c.CIN === appointment.CIN);
        if (invoice && client) {
          workflows.push({
            appointment,
            invoice: invoice as FactureWithDetails,
            client,
          });
        }
      }
      setWorkflows(workflows);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erreur",
        description: "Échec du chargement des données",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientSelect = (clientId: string) => {
    const selected = clients.find((c) => c.id === parseInt(clientId));
    if (selected) {
      form.setValue("selectedClientId", selected.id);
      form.setValue("clientCIN", selected.CIN);
      form.setValue("clientNom", selected.nom);
      form.setValue("clientPrenom", selected.prenom);
      form.setValue("clientEmail", selected.email);
      form.setValue("clientTelephone", selected.numero_telephone);
      form.setValue("clientDateNaissance", selected.date_naissance);
      form.setValue("clientAdresse", selected.adresse);
      form.setValue("clientGroupSanguin", selected.groupe_sanguin);
      form.setValue("clientAntecedents", selected.antecedents);
      form.setValue("clientAllergies", selected.allergies);
      form.setValue("isNewClient", false);
    }
  };

  const addInvoiceItem = (itemData: {
    productId: string;
    quantity: number;
    itemType: string;
  }) => {
    const currentItems = form.getValues("invoiceItems") || [];

    let selectedItem: Product | Soin | undefined;
    let itemType = itemData.itemType;

    if (itemType === "produit") {
      selectedItem = products.find(
        (p) => p.id === parseInt(itemData.productId),
      );
    } else {
      selectedItem = soins.find((s) => s.id === parseInt(itemData.productId));
    }

    if (!selectedItem) {
      toast({
        title: "Erreur",
        description: "Produit ou service non trouvé",
        variant: "destructive",
      });
      return;
    }

    const newItem: FactureItem = {
      id_bien: parseInt(itemData.productId),
      type_bien: itemType === "produit" ? TypeBien.PRODUIT : TypeBien.SOIN,
      quantite: itemData.quantity,
      prix_unitaire: selectedItem.prix,
      nom_bien: selectedItem.Nom,
    };

    form.setValue("invoiceItems", [...currentItems, newItem]);
    toast({
      title: "Succès",
      description: `${selectedItem.Nom} ajouté à la facture`,
    });
  };

  const removeInvoiceItem = (index: number) => {
    const currentItems = form.getValues("invoiceItems") || [];
    form.setValue(
      "invoiceItems",
      currentItems.filter((_, i) => i !== index),
    );
  };

  const calculateTotal = () => {
    const items = form.getValues("invoiceItems") || [];
    const subtotal = items.reduce(
      (total, item) => total + item.prix_unitaire * item.quantite,
      0,
    );
    const tva = subtotal * 0.2;
    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tva: parseFloat(tva.toFixed(2)),
      total: parseFloat((subtotal + tva).toFixed(2)),
    };
  };

  const handleViewWorkflow = (workflow: WorkflowRecord) => {
    setSelectedWorkflowDetails(workflow);
    setShowWorkflowDetailsModal(true);
  };

  const handleDeleteWorkflow = async (workflow: WorkflowRecord) => {
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le flux pour ${workflow.client.prenom} ${workflow.client.nom}? Cette action supprimera le rendez-vous et la facture.`,
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      // Delete the appointment and invoice
      if (workflow.appointment.id) {
        await AppointmentsService.delete(workflow.appointment.id);
      }
      if (workflow.invoice.id) {
        await InvoicesService.delete(workflow.invoice.id);
      }

      toast({
        title: "Succès",
        description: `Le flux pour ${workflow.client.prenom} ${workflow.client.nom} a été supprimé.`,
      });

      await loadInitialData();
    } catch (error) {
      console.error("Error deleting workflow:", error);
      toast({
        title: "Erreur",
        description: "Échec de la suppression du flux. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveDraft = (draft: WorkflowDraft) => {
    const existingIndex = workflowDrafts.findIndex((d) => d.id === draft.id);
    if (existingIndex >= 0) {
      const updated = [...workflowDrafts];
      updated[existingIndex] = draft;
      setWorkflowDrafts(updated);
    } else {
      setWorkflowDrafts([...workflowDrafts, draft]);
    }
    setCurrentDraft(draft);
  };

  const saveAndQuitStep = async (stepToSave: WorkflowDraft["stage"]) => {
    try {
      setIsLoading(true);
      const currentUser = AuthService.getCurrentUser();
      const formData = form.getValues();
      let draftData: WorkflowDraft = {
        id: currentDraft?.id || `draft-${Date.now()}`,
        stage: stepToSave,
        formData,
        createdAt: currentDraft?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (stepToSave === "client") {
        // Just save client info
        let clientId: number;
        if (formData.isNewClient) {
          const clientData: ClientFormData = {
            CIN: formData.clientCIN,
            nom: formData.clientNom,
            prenom: formData.clientPrenom,
            date_naissance: formData.clientDateNaissance,
            adresse: formData.clientAdresse,
            numero_telephone: formData.clientTelephone,
            email: formData.clientEmail,
            groupe_sanguin: formData.clientGroupSanguin,
            antecedents: formData.clientAntecedents,
            allergies: formData.clientAllergies,
            commentaire: "",
            Cree_par: currentUser.CIN,
          };
          const newClient = await ClientsService.create(clientData);
          clientId = newClient.id;
          draftData.clientId = newClient.id;
        } else {
          clientId = formData.selectedClientId!;
          draftData.clientId = clientId;
        }
      } else if (stepToSave === "appointment") {
        // Save client first if needed, then appointment
        let clientId: number;
        if (formData.isNewClient) {
          const clientData: ClientFormData = {
            CIN: formData.clientCIN,
            nom: formData.clientNom,
            prenom: formData.clientPrenom,
            date_naissance: formData.clientDateNaissance,
            adresse: formData.clientAdresse,
            numero_telephone: formData.clientTelephone,
            email: formData.clientEmail,
            groupe_sanguin: formData.clientGroupSanguin,
            antecedents: formData.clientAntecedents,
            allergies: formData.clientAllergies,
            commentaire: "",
            Cree_par: currentUser.CIN,
          };
          const newClient = await ClientsService.create(clientData);
          clientId = newClient.id;
          draftData.clientId = newClient.id;
        } else {
          clientId = formData.selectedClientId!;
          draftData.clientId = clientId;
        }

        // Create appointment
        const appointmentData: AppointmentFormData = {
          client_id: clientId,
          CIN: formData.clientCIN,
          sujet: formData.appointmentSubject,
          date_rendez_vous: new Date(formData.appointmentDate).toISOString(),
          Cree_par: currentUser.CIN,
          status: formData.appointmentStatus,
          Cabinet: formData.appointmentCabinet,
          soin_id: parseInt(formData.appointmentSoinId),
        };
        const newAppointment =
          await AppointmentsService.create(appointmentData);
        draftData.appointmentId = newAppointment.id;
      } else if (stepToSave === "products") {
        // Ensure client and appointment exist, then save as draft with products
        let clientId: number;
        if (!currentDraft?.clientId) {
          if (formData.isNewClient) {
            const clientData: ClientFormData = {
              CIN: formData.clientCIN,
              nom: formData.clientNom,
              prenom: formData.clientPrenom,
              date_naissance: formData.clientDateNaissance,
              adresse: formData.clientAdresse,
              numero_telephone: formData.clientTelephone,
              email: formData.clientEmail,
              groupe_sanguin: formData.clientGroupSanguin,
              antecedents: formData.clientAntecedents,
              allergies: formData.clientAllergies,
              commentaire: "",
              Cree_par: currentUser.CIN,
            };
            const newClient = await ClientsService.create(clientData);
            clientId = newClient.id;
            draftData.clientId = newClient.id;
          } else {
            clientId = formData.selectedClientId!;
            draftData.clientId = clientId;
          }
        } else {
          clientId = currentDraft.clientId;
          draftData.clientId = clientId;
        }

        if (!currentDraft?.appointmentId) {
          const appointmentData: AppointmentFormData = {
            client_id: clientId,
            CIN: formData.clientCIN,
            sujet: formData.appointmentSubject,
            date_rendez_vous: new Date(formData.appointmentDate).toISOString(),
            Cree_par: currentUser.CIN,
            status: formData.appointmentStatus,
            Cabinet: formData.appointmentCabinet,
            soin_id: parseInt(formData.appointmentSoinId),
          };
          const newAppointment =
            await AppointmentsService.create(appointmentData);
          draftData.appointmentId = newAppointment.id;
        } else {
          draftData.appointmentId = currentDraft.appointmentId;
        }
      } else if (stepToSave === "invoice") {
        // Create full workflow up to invoice
        let clientId: number;
        if (!currentDraft?.clientId) {
          if (formData.isNewClient) {
            const clientData: ClientFormData = {
              CIN: formData.clientCIN,
              nom: formData.clientNom,
              prenom: formData.clientPrenom,
              date_naissance: formData.clientDateNaissance,
              adresse: formData.clientAdresse,
              numero_telephone: formData.clientTelephone,
              email: formData.clientEmail,
              groupe_sanguin: formData.clientGroupSanguin,
              antecedents: formData.clientAntecedents,
              allergies: formData.clientAllergies,
              commentaire: "",
              Cree_par: currentUser.CIN,
            };
            const newClient = await ClientsService.create(clientData);
            clientId = newClient.id;
            draftData.clientId = newClient.id;
          } else {
            clientId = formData.selectedClientId!;
            draftData.clientId = clientId;
          }
        } else {
          clientId = currentDraft.clientId;
          draftData.clientId = clientId;
        }

        if (!currentDraft?.appointmentId) {
          const appointmentData: AppointmentFormData = {
            client_id: clientId,
            CIN: formData.clientCIN,
            sujet: formData.appointmentSubject,
            date_rendez_vous: new Date(formData.appointmentDate).toISOString(),
            Cree_par: currentUser.CIN,
            status: formData.appointmentStatus,
            Cabinet: formData.appointmentCabinet,
            soin_id: parseInt(formData.appointmentSoinId),
          };
          const newAppointment =
            await AppointmentsService.create(appointmentData);
          draftData.appointmentId = newAppointment.id;
        } else {
          draftData.appointmentId = currentDraft.appointmentId;
        }

        // Create invoice
        const invoiceData: FactureFormData = {
          CIN: formData.clientCIN,
          date: new Date(formData.invoiceDate).toISOString(),
          statut: formData.invoiceStatut,
          notes: formData.invoiceNotes,
          Cree_par: currentUser.CIN,
          items: formData.invoiceItems,
          date_paiement: undefined,
          methode_paiement: "",
        };
        const newInvoice = await InvoicesService.create(invoiceData);
        draftData.invoiceId = newInvoice.id;
      } else if (stepToSave === "payment") {
        // Complete the entire workflow
        let clientId: number;
        if (!currentDraft?.clientId) {
          if (formData.isNewClient) {
            const clientData: ClientFormData = {
              CIN: formData.clientCIN,
              nom: formData.clientNom,
              prenom: formData.clientPrenom,
              date_naissance: formData.clientDateNaissance,
              adresse: formData.clientAdresse,
              numero_telephone: formData.clientTelephone,
              email: formData.clientEmail,
              groupe_sanguin: formData.clientGroupSanguin,
              antecedents: formData.clientAntecedents,
              allergies: formData.clientAllergies,
              commentaire: "",
              Cree_par: currentUser.CIN,
            };
            const newClient = await ClientsService.create(clientData);
            clientId = newClient.id;
            draftData.clientId = newClient.id;
          } else {
            clientId = formData.selectedClientId!;
            draftData.clientId = clientId;
          }
        } else {
          clientId = currentDraft.clientId;
          draftData.clientId = clientId;
        }

        if (!currentDraft?.appointmentId) {
          const appointmentData: AppointmentFormData = {
            client_id: clientId,
            CIN: formData.clientCIN,
            sujet: formData.appointmentSubject,
            date_rendez_vous: new Date(formData.appointmentDate).toISOString(),
            Cree_par: currentUser.CIN,
            status: formData.appointmentStatus,
            Cabinet: formData.appointmentCabinet,
            soin_id: parseInt(formData.appointmentSoinId),
          };
          const newAppointment =
            await AppointmentsService.create(appointmentData);
          draftData.appointmentId = newAppointment.id;
        } else {
          draftData.appointmentId = currentDraft.appointmentId;
        }

        const invoiceData: FactureFormData = {
          CIN: formData.clientCIN,
          date: new Date(formData.invoiceDate).toISOString(),
          statut: formData.invoiceStatut,
          notes: formData.invoiceNotes,
          Cree_par: currentUser.CIN,
          items: formData.invoiceItems,
          date_paiement: formData.paymentMethod
            ? new Date(formData.paymentDate).toISOString()
            : undefined,
          methode_paiement: formData.paymentMethod,
          cheque_numero: formData.chequeNumero,
          cheque_banque: formData.chequeBanque,
          cheque_date_tirage: formData.chequeDateTirage,
        };
        const newInvoice = !currentDraft?.invoiceId
          ? await InvoicesService.create(invoiceData)
          : await InvoicesService.update(
              currentDraft.invoiceId,
              invoiceData as any,
            );
        draftData.invoiceId = newInvoice.id;
      }

      saveDraft(draftData);

      toast({
        title: "Succès",
        description: `Étape sauvegardée. Vous pouvez continuer plus tard.`,
      });

      setIsDrawerOpen(false);
      await loadInitialData();
    } catch (error) {
      console.error("Error saving draft:", error);
      toast({
        title: "Erreur",
        description: "Échec de la sauvegarde. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: WorkflowFormData) => {
    try {
      setIsLoading(true);
      await saveAndQuitStep("payment");
      // Update draft to mark as completed
      if (currentDraft) {
        const completedDraft: WorkflowDraft = {
          ...currentDraft,
          stage: "completed",
          updatedAt: new Date().toISOString(),
        };
        saveDraft(completedDraft);
      }

      toast({
        title: "Succès",
        description:
          "Flux de travail finalisé avec succès ! Client, rendez-vous et facture créés.",
      });

      // Reload data
      await loadInitialData();

      // Reset form
      form.reset();
      setCurrentStep(1);
      setCurrentDraft(null);
      setIsDrawerOpen(false);
    } catch (error) {
      console.error("Error submitting workflow:", error);
      toast({
        title: "Erreur",
        description:
          "Échec de la création du flux de travail. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1: {
        const isNewClient = form.getValues("isNewClient");
        if (isNewClient) {
          return (
            form.getValues("clientCIN") &&
            form.getValues("clientNom") &&
            form.getValues("clientPrenom") &&
            form.getValues("clientEmail")
          );
        }
        return !!form.getValues("selectedClientId");
      }
      case 2: {
        return (
          form.getValues("appointmentDate") &&
          form.getValues("appointmentSubject") &&
          form.getValues("appointmentCabinet") &&
          form.getValues("appointmentSoinId")
        );
      }
      case 3: {
        const items = form.getValues("invoiceItems");
        return items && items.length > 0;
      }
      case 4: {
        return form.getValues("invoiceDate");
      }
      case 5: {
        return form.getValues("paymentDate") && form.getValues("paymentMethod");
      }
      default:
        return true;
    }
  };

  // Filter and search workflows
  const filteredWorkflows = useMemo(() => {
    return workflows.filter((workflow) => {
      const clientName =
        `${workflow.client.prenom} ${workflow.client.nom}`.toLowerCase();
      const matchesSearch =
        clientName.includes(searchTerm.toLowerCase()) ||
        workflow.client.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === "tous" || workflow.appointment.status === filterStatus;

      const matchesPaymentMethod =
        filterPaymentMethod === "tous" ||
        workflow.invoice.methode_paiement === filterPaymentMethod;

      const matchesPaymentStatus =
        filterPaymentStatus === "tous" ||
        workflow.invoice.statut === filterPaymentStatus;

      const appointmentDate = new Date(workflow.appointment.date_rendez_vous);
      const matchesDateFrom =
        !filterDateFrom || appointmentDate >= new Date(filterDateFrom);
      const matchesDateTo =
        !filterDateTo ||
        appointmentDate <=
          new Date(new Date(filterDateTo).getTime() + 86400000);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPaymentMethod &&
        matchesPaymentStatus &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  }, [
    workflows,
    searchTerm,
    filterStatus,
    filterPaymentMethod,
    filterPaymentStatus,
    filterDateFrom,
    filterDateTo,
  ]);

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Flux Complet</h1>
            <p className="text-muted-foreground">
              Gérer le client de la création au paiement en un seul endroit
            </p>
          </div>
          <Button
            onClick={() => {
              setCurrentStep(1);
              form.reset();
              setIsDrawerOpen(true);
            }}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" /> Ajouter
          </Button>
        </div>

        {/* Filters and Search */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Filtres et Recherche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Statut du RDV" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les statuts</SelectItem>
                  <SelectItem value="programmé">Programmé</SelectItem>
                  <SelectItem value="confirmé">Confirmé</SelectItem>
                  <SelectItem value="terminé">Terminé</SelectItem>
                  <SelectItem value="annulé">Annulé</SelectItem>
                </SelectContent>
              </Select>

              {/* Payment Method Filter */}
              <Select
                value={filterPaymentMethod}
                onValueChange={setFilterPaymentMethod}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Méthode de paiement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Toutes les méthodes</SelectItem>
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                  <SelectItem value="bank">Virement bancaire</SelectItem>
                  <SelectItem value="card">Carte bancaire</SelectItem>
                </SelectContent>
              </Select>

              {/* Payment Status Filter */}
              <Select
                value={filterPaymentStatus}
                onValueChange={setFilterPaymentStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Statut de paiement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les statuts</SelectItem>
                  <SelectItem value={FactureStatut.BROUILLON}>
                    Brouillon
                  </SelectItem>
                  <SelectItem value={FactureStatut.ENVOYEE}>Envoyée</SelectItem>
                  <SelectItem value={FactureStatut.PAYEE}>Payée</SelectItem>
                  <SelectItem value={FactureStatut.ANNULEE}>Annulée</SelectItem>
                </SelectContent>
              </Select>

              {/* Date From */}
              <div>
                <Label className="text-xs mb-2 block">De</Label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>

              {/* Date To */}
              <div>
                <Label className="text-xs mb-2 block">À</Label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
            </div>

            {/* Clear filters button */}
            {(searchTerm ||
              filterStatus !== "tous" ||
              filterPaymentMethod !== "tous" ||
              filterPaymentStatus !== "tous" ||
              filterDateFrom ||
              filterDateTo) && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("tous");
                    setFilterPaymentMethod("tous");
                    setFilterPaymentStatus("tous");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Draft Workflows Section */}
        {workflowDrafts.length > 0 && (
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Flux en cours ({workflowDrafts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflowDrafts.map((draft) => {
                  const stageLabels: Record<string, string> = {
                    client: "Client sélectionné",
                    appointment: "Rendez-vous créé",
                    products: "Produits sélectionnés",
                    invoice: "Facture créée",
                    payment: "Paiement en attente",
                    completed: "Complété",
                  };
                  return (
                    <div
                      key={draft.id}
                      className="p-4 border border-amber-200 rounded-lg bg-white hover:bg-amber-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">
                            {draft.formData.clientNom}{" "}
                            {draft.formData.clientPrenom}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Étape: {stageLabels[draft.stage]}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Modifié:{" "}
                            {new Date(draft.updatedAt).toLocaleDateString(
                              "fr-FR",
                            )}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setCurrentDraft(draft);
                            form.reset(draft.formData as any);
                            setCurrentStep(
                              {
                                client: 1,
                                appointment: 2,
                                products: 3,
                                invoice: 4,
                                payment: 5,
                                completed: 5,
                              }[draft.stage],
                            );
                            setIsDrawerOpen(true);
                          }}
                        >
                          Continuer
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          {filteredWorkflows.length} flux complété(s) trouvé(s)
        </div>

        {/* Table */}
        <Card className="bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Date RDV</TableHead>
                  <TableHead>Statut RDV</TableHead>
                  <TableHead>Produits</TableHead>
                  <TableHead>Montant Total</TableHead>
                  <TableHead>Méthode Paiement</TableHead>
                  <TableHead>Statut Paiement</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkflows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground">
                        Aucun enregistrement trouvé
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorkflows.map((workflow, index) => (
                    <TableRow key={index} className="hover:bg-secondary/50">
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold">
                            {workflow.client.prenom} {workflow.client.nom}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {workflow.client.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(
                          workflow.appointment.date_rendez_vous,
                        ).toLocaleDateString("fr-FR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border",
                            statusColors[
                              workflow.appointment
                                .status as keyof typeof statusColors
                            ],
                          )}
                        >
                          {statusLabels[workflow.appointment.status!]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedWorkflow(workflow);
                            setShowProductsModal(true);
                          }}
                          className="text-primary hover:text-primary/90"
                        >
                          <Package className="w-4 h-4 mr-1" />
                          Voir ({workflow.invoice.items?.length || 0})
                        </Button>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        €{workflow.invoice.prix_total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {paymentMethodLabels[
                            workflow.invoice.methode_paiement ||
                              ("cash" as keyof typeof paymentMethodLabels)
                          ] || "Non spécifié"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            workflow.invoice.statut === FactureStatut.PAYEE
                              ? "default"
                              : "outline"
                          }
                        >
                          {paymentStatusLabels[workflow.invoice.statut]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            title="Voir les détails"
                            onClick={() => handleViewWorkflow(workflow)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            title="Supprimer"
                            onClick={() => handleDeleteWorkflow(workflow)}
                            disabled={isLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Workflow Details Modal */}
      <Dialog
        open={showWorkflowDetailsModal}
        onOpenChange={setShowWorkflowDetailsModal}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Détails du Flux de Travail
            </DialogTitle>
            <DialogDescription>
              Flux complet pour {selectedWorkflowDetails?.client.prenom}{" "}
              {selectedWorkflowDetails?.client.nom}
            </DialogDescription>
          </DialogHeader>

          {selectedWorkflowDetails && (
            <div className="space-y-6">
              {/* Client Info */}
              <div className="border border-border rounded-lg p-4 bg-secondary/5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" /> Informations Client
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Nom</p>
                    <p className="font-medium">
                      {selectedWorkflowDetails.client.prenom}{" "}
                      {selectedWorkflowDetails.client.nom}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">CIN</p>
                    <p className="font-medium">
                      {selectedWorkflowDetails.client.CIN}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">
                      {selectedWorkflowDetails.client.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Téléphone</p>
                    <p className="font-medium">
                      {selectedWorkflowDetails.client.numero_telephone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Appointment Info */}
              <div className="border border-border rounded-lg p-4 bg-secondary/5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Rendez-vous
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Date et Heure</p>
                    <p className="font-medium">
                      {new Date(
                        selectedWorkflowDetails.appointment.date_rendez_vous,
                      ).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Statut</p>
                    <p className="font-medium capitalize">
                      {selectedWorkflowDetails.appointment.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cabinet</p>
                    <p className="font-medium">
                      {selectedWorkflowDetails.appointment.Cabinet}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sujet</p>
                    <p className="font-medium">
                      {selectedWorkflowDetails.appointment.sujet}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoice Info */}
              <div className="border border-border rounded-lg p-4 bg-secondary/5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Facture
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <p className="text-muted-foreground">Montant Total</p>
                    <p className="font-semibold text-primary">
                      €{selectedWorkflowDetails.invoice.prix_total.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-muted-foreground">Méthode Paiement</p>
                    <p className="font-medium">
                      {selectedWorkflowDetails.invoice.methode_paiement ||
                        "Non spécifiée"}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-muted-foreground">Statut Facture</p>
                    <Badge>
                      {
                        paymentStatusLabels[
                          selectedWorkflowDetails.invoice.statut
                        ]
                      }
                    </Badge>
                  </div>
                  {selectedWorkflowDetails.invoice.items &&
                    selectedWorkflowDetails.invoice.items.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="font-semibold mb-2">
                          Produits & Services
                        </p>
                        <div className="space-y-2">
                          {selectedWorkflowDetails.invoice.items.map(
                            (item, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span>
                                  {item.nom_bien} (x{item.quantite})
                                </span>
                                <span className="font-medium">
                                  €
                                  {(item.quantite * item.prix_unitaire).toFixed(
                                    2,
                                  )}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Products Modal */}
      <Dialog open={showProductsModal} onOpenChange={setShowProductsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Produits et Services</DialogTitle>
            <DialogDescription>
              Produits achetés par {selectedWorkflow?.client.prenom}{" "}
              {selectedWorkflow?.client.nom}
            </DialogDescription>
          </DialogHeader>

          {selectedWorkflow && (
            <div className="space-y-4">
              {!selectedWorkflow.invoice.items ||
              selectedWorkflow.invoice.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Aucun produit dans cette facture
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedWorkflow.invoice.items.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 border border-border rounded-lg bg-secondary/5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{item.nom_bien}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Type:{" "}
                            {item.type_bien === TypeBien.PRODUIT
                              ? "Produit"
                              : "Service"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            Quantité: {item.quantite}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            €{item.prix_unitaire.toFixed(2)}/unité
                          </p>
                          <p className="font-semibold text-primary mt-2">
                            €{(item.quantite * item.prix_unitaire).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Form Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[98%] md:w-[95%] lg:w-[85%] xl:w-[80%] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>Créer un nouveau flux de travail</SheetTitle>
            <SheetDescription>
              Complétez chaque étape pour créer un client, un rendez-vous et une
              facture
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Step Indicators */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between gap-2 mb-4">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex items-center flex-1">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-xs cursor-pointer transition-all ${
                        currentStep >= step.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground border border-border"
                      }`}
                      onClick={() => {
                        if (currentStep > step.id) {
                          setCurrentStep(step.id);
                        }
                      }}
                    >
                      {currentStep > step.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-1 mx-1 rounded-full transition-all ${
                          currentStep > step.id ? "bg-primary" : "bg-secondary"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {STEPS.map((step) => (
                  <div key={step.id}>
                    <p className="font-medium text-xs">{step.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Steps */}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Step 1: Client Selection */}
                {currentStep === 1 && (
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle>Informations du Client</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <ClientTypeSelector form={form} />

                      {form.getValues("isNewClient") ? (
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="clientCIN"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CIN</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Entrez le CIN"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="clientNom"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nom</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Entrez le nom"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="clientPrenom"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Prénom</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Entrez le prénom"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="clientEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="Entrez l'email"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="clientTelephone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Téléphone</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Entrez le téléphone"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="clientDateNaissance"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date de Naissance</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="clientAdresse"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Adresse</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Entrez l'adresse"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="clientGroupSanguin"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Groupe Sanguin</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="O+">O+</SelectItem>
                                    <SelectItem value="O-">O-</SelectItem>
                                    <SelectItem value="A+">A+</SelectItem>
                                    <SelectItem value="A-">A-</SelectItem>
                                    <SelectItem value="B+">B+</SelectItem>
                                    <SelectItem value="B-">B-</SelectItem>
                                    <SelectItem value="AB+">AB+</SelectItem>
                                    <SelectItem value="AB-">AB-</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="clientAntecedents"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Antécédents Médicaux</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Entrez les antécédents"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="clientAllergies"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Allergies</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Entrez les allergies"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ) : (
                        <FormField
                          control={form.control}
                          name="selectedClientId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sélectionner un Client</FormLabel>
                              <Select
                                onValueChange={(value) =>
                                  handleClientSelect(value)
                                }
                                defaultValue={
                                  field.value ? String(field.value) : ""
                                }
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionnez un client..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {clients.map((client) => (
                                    <SelectItem
                                      key={client.id}
                                      value={String(client.id)}
                                    >
                                      {client.prenom} {client.nom}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Step 2: Appointment */}
                {currentStep === 2 && (
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle>Créer un Rendez-vous</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <FormLabel className="mb-3 block">
                          Date et Heure
                        </FormLabel>
                        <TimeSlotPicker
                          value={form.getValues("appointmentDate")}
                          onChange={(datetime) =>
                            form.setValue("appointmentDate", datetime)
                          }
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="appointmentSubject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sujet/Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Entrez le sujet du rendez-vous"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="appointmentCabinet"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cabinet</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionnez le cabinet" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Biohacking">
                                  Biohacking
                                </SelectItem>
                                <SelectItem value="Nassens">Nassens</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="appointmentSoinId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service/Traitement</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionnez un service" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {soins.map((soin) => (
                                  <SelectItem
                                    key={soin.id}
                                    value={String(soin.id)}
                                  >
                                    {soin.Nom}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="appointmentStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Statut</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="programmé">
                                  Programmé
                                </SelectItem>
                                <SelectItem value="confirmé">
                                  Confirmé
                                </SelectItem>
                                <SelectItem value="terminé">Terminé</SelectItem>
                                <SelectItem value="annulé">Annulé</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Step 3: Products Selection */}
                {currentStep === 3 && (
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle>
                        Sélectionner les Produits et Services
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="border border-dashed border-border rounded-lg p-4 bg-secondary/20">
                          <p className="text-sm font-medium mb-4">
                            Ajouter des Produits ou Services
                          </p>
                          <ProductItemSelector
                            products={products}
                            soins={soins}
                            onAddItem={addInvoiceItem}
                          />
                        </div>

                        {(form.getValues("invoiceItems") || []).length > 0 && (
                          <div className="space-y-3">
                            <p className="text-sm font-medium">
                              Éléments Ajoutés
                            </p>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {(form.getValues("invoiceItems") || []).map(
                                (item, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-3 border border-border rounded-lg bg-card"
                                  >
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">
                                        {item.nom_bien}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Qté: {item.quantite} × €
                                        {item.prix_unitaire.toFixed(2)} = €
                                        {(
                                          item.quantite * item.prix_unitaire
                                        ).toFixed(2)}
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removeInvoiceItem(index)}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 4: Invoice */}
                {currentStep === 4 && (
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle>Détails de la Facture</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="invoiceDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date de la Facture</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="invoiceNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Entrez les notes de la facture"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="invoiceStatut"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Statut de la Facture</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value={FactureStatut.BROUILLON}>
                                  Brouillon
                                </SelectItem>
                                <SelectItem value={FactureStatut.ENVOYEE}>
                                  Envoyée
                                </SelectItem>
                                <SelectItem value={FactureStatut.PAYEE}>
                                  Payée
                                </SelectItem>
                                <SelectItem value={FactureStatut.ANNULEE}>
                                  Annulée
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Invoice Summary */}
                      <div className="border border-border rounded-lg p-4 bg-secondary/10">
                        <p className="text-sm font-semibold mb-3">
                          Résumé de la Facture
                        </p>
                        {(form.getValues("invoiceItems") || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Aucun élément ajouté. Veuillez retourner à l'étape
                            3.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {(() => {
                              const { subtotal, tva, total } = calculateTotal();
                              return (
                                <>
                                  <div className="flex justify-between text-sm">
                                    <span>Sous-total (HT):</span>
                                    <span className="font-medium">
                                      €{subtotal.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>TVA (20%):</span>
                                    <span className="font-medium">
                                      €{tva.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="border-t border-border pt-2 mt-2 flex justify-between">
                                    <span className="font-semibold">
                                      Total:
                                    </span>
                                    <span className="font-bold text-primary">
                                      €{total.toFixed(2)}
                                    </span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 5: Payment */}
                {currentStep === 5 && (
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle>Informations de Paiement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="paymentDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date de Paiement</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Méthode de Paiement</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="cash">Espèces</SelectItem>
                                <SelectItem value="cheque">
                                  Chèque Bancaire
                                </SelectItem>
                                <SelectItem value="bank">
                                  Virement Bancaire
                                </SelectItem>
                                <SelectItem value="card">
                                  Carte Bancaire
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.getValues("paymentMethod") === "cheque" && (
                        <>
                          <FormField
                            control={form.control}
                            name="chequeNumero"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Numéro de Chèque</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Entrez le numéro de chèque"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="chequeBanque"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nom de la Banque</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Entrez le nom de la banque"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="chequeDateTirage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date de Chèque</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}

                      <div className="border border-border rounded-lg p-4 bg-secondary/10">
                        <p className="text-sm font-semibold mb-2">
                          Montant Total à Payer
                        </p>
                        <p className="text-2xl font-bold text-primary">
                          €{calculateTotal().total.toFixed(2)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Navigation Buttons */}
                <div className="space-y-3">
                  <div className="flex justify-between gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setCurrentStep(Math.max(1, currentStep - 1))
                      }
                      disabled={currentStep === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" /> Retour
                    </Button>

                    {currentStep < 5 ? (
                      <Button
                        type="button"
                        onClick={() => setCurrentStep(currentStep + 1)}
                        disabled={!canProceedToNextStep() || isLoading}
                      >
                        Suivant <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={!canProceedToNextStep() || isLoading}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                            Finalisation en cours...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" /> Finaliser
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Save and Quit Button */}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const stageMap = {
                        1: "client" as const,
                        2: "appointment" as const,
                        3: "products" as const,
                        4: "invoice" as const,
                        5: "payment" as const,
                      };
                      saveAndQuitStep(
                        stageMap[currentStep as keyof typeof stageMap],
                      );
                    }}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground mr-2" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" /> Enregistrer et
                        Quitter
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}

// Helper Component for Client Type Selection
function ClientTypeSelector({ form }: { form: any }) {
  const isNewClient = form.watch("isNewClient");

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Type de Client</Label>
      <div className="flex gap-4">
        <Button
          type="button"
          variant={isNewClient ? "default" : "outline"}
          onClick={() => {
            form.setValue("isNewClient", true);
            form.setValue("selectedClientId", undefined);
          }}
          className="flex-1"
        >
          <Plus className="w-4 h-4 mr-2" /> Nouveau Client
        </Button>
        <Button
          type="button"
          variant={!isNewClient ? "default" : "outline"}
          onClick={() => {
            form.setValue("isNewClient", false);
            form.setValue("clientCIN", "");
            form.setValue("clientNom", "");
            form.setValue("clientPrenom", "");
            form.setValue("clientEmail", "");
            form.setValue("clientTelephone", "");
          }}
          className="flex-1"
        >
          Client Existant
        </Button>
      </div>
    </div>
  );
}

// Helper Component for Product/Service Selection
function ProductItemSelector({
  products,
  soins,
  onAddItem,
}: {
  products: Product[];
  soins: Soin[];
  onAddItem: (data: {
    productId: string;
    quantity: number;
    itemType: string;
  }) => void;
}) {
  const [selectedType, setSelectedType] = useState<"produit" | "soin">(
    "produit",
  );
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    if (selectedId) {
      onAddItem({
        productId: selectedId,
        quantity,
        itemType: selectedType,
      });
      setSelectedId("");
      setQuantity(1);
    }
  };

  const currentItems = selectedType === "produit" ? products : soins;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={selectedType === "produit" ? "default" : "outline"}
          onClick={() => setSelectedType("produit")}
        >
          Produits
        </Button>
        <Button
          type="button"
          size="sm"
          variant={selectedType === "soin" ? "default" : "outline"}
          onClick={() => setSelectedType("soin")}
        >
          Services
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue
              placeholder={
                selectedType === "produit"
                  ? "Sélectionnez un produit..."
                  : "Sélectionnez un service..."
              }
            />
          </SelectTrigger>
          <SelectContent>
            {currentItems.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.Nom} - €{item.prix.toFixed(2)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value)))}
            placeholder="Quantité"
          />
        </div>

        <Button type="button" onClick={handleAdd} disabled={!selectedId}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter
        </Button>
      </div>
    </div>
  );
}
