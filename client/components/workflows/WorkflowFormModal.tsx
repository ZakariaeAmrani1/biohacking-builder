import { useState, useEffect } from "react";
import {
  CalendarDays,
  Search,
  Clock,
  Stethoscope,
  User,
  Users,
  UserPlus,
  Building2,
  Package,
  Receipt,
  Trash2,
  Plus,
  ChevronRight,
  FileText,
  Hash,
} from "lucide-react";
import TimeSlotPicker from "@/components/appointments/TimeSlotPicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import {
  WorkflowService,
  Workflow,
  WorkflowFormData,
  WorkflowWithDetails,
  validateWorkflowData,
} from "@/services/workflowService";
import {
  ClientsService,
  Client,
  ClientFormData,
  validateClientData,
  calculateAge,
} from "@/services/clientsService";
import {
  AppointmentsService,
  AppointmentFormData,
  validateAppointmentData,
  getAppointmentTypes,
} from "@/services/appointmentsService";
import {
  InvoicesService,
  FactureFormData,
  validateFactureData,
  FactureItem,
  TypeBien,
  FactureStatut,
  calculateInvoiceTotals,
  createEmptyFacture,
} from "@/services/invoicesService";
import { ProductsService, Product } from "@/services/productsService";
import { SoinsService, Soin } from "@/services/soinsService";
import { AuthService } from "@/services/authService";
import { OptionsService } from "@/services/optionsService";
import { useToast } from "@/components/ui/use-toast";

interface WorkflowFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  workflow?: Workflow;
  workflowDetails?: WorkflowWithDetails;
  initialStep?: number;
}

type Step = 1 | 2 | 3 | 4;

export default function WorkflowFormModal({
  isOpen,
  onClose,
  onSubmit,
  workflow,
  workflowDetails,
  initialStep = 1,
}: WorkflowFormModalProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  // Shared data
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [soins, setSoins] = useState<Soin[]>([]);

  // Step 1: Client selection
  const [isNewPatientMode, setIsNewPatientMode] = useState(false);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  const [newPatientData, setNewPatientData] = useState<Partial<ClientFormData>>(
    {
      nom: "",
      prenom: "",
      CIN: "",
      numero_telephone: "",
    },
  );

  // Step 2: Appointment
  const [appointmentFormData, setAppointmentFormData] =
    useState<AppointmentFormData>({
      client_id: 0,
      CIN: "",
      sujet: "",
      date_rendez_vous: "",
      Cree_par: "",
      status: "confirmé",
      Cabinet: "Biohacking",
      soin_id: 0,
    });

  const [appointmentTypes, setAppointmentTypes] = useState<string[]>([]);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<
    number | null
  >(null);

  // Step 3: Invoice
  const [invoiceFormData, setInvoiceFormData] = useState<FactureFormData>(
    () => {
      const empty = createEmptyFacture();
      return {
        ...empty,
        statut: FactureStatut.BROUILLON,
      };
    },
  );
  const [invoiceItems, setInvoiceItems] = useState<FactureItem[]>([]);
  const [bankNames, setBankNames] = useState<string[]>([]);

  // Load data on modal open
  useEffect(() => {
    if (isOpen) {
      loadClients();
      loadProducts();
      loadSoins();
      OptionsService.getBankNames()
        .then(setBankNames)
        .catch(() => setBankNames([]));

      // Determine if we're editing
      const editing = !!workflow || !!workflowDetails;
      setIsEditMode(editing);

      // Reset form when creating new
      if (!editing) {
        setSelectedClient(null);
        setAppointmentFormData({
          client_id: 0,
          CIN: "",
          sujet: "",
          date_rendez_vous: "",
          Cree_par: "",
          status: "confirmé",
          Cabinet: "Biohacking",
          soin_id: 0,
        });
        setInvoiceFormData(() => {
          const empty = createEmptyFacture();
          return {
            ...empty,
            statut: FactureStatut.BROUILLON,
          };
        });
        setInvoiceItems([]);
      }

      // If editing, load existing data
      if (editing && workflowDetails) {
        loadExistingWorkflowData(workflowDetails);
      }

      const step = (initialStep as Step) || 1;
      setCurrentStep(step);
      setErrors([]);
      setCreatedAppointmentId(null);
    }
  }, [isOpen, initialStep, workflowDetails, workflow]);

  // Load appointment types
  useEffect(() => {
    if (isOpen && currentStep === 2) {
      SoinsService.getAll()
        .then((data) => setAppointmentTypes(data.map((s) => s.Nom)))
        .catch(() => setAppointmentTypes([]));
    }
  }, [isOpen, currentStep]);

  const loadClients = async () => {
    try {
      const data = await ClientsService.getAll();
      setClients(data);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await ProductsService.getAll();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const loadSoins = async () => {
    try {
      const data = await SoinsService.getAll();
      setSoins(data);
    } catch (error) {
      console.error("Error loading soins:", error);
    }
  };

  const loadExistingWorkflowData = (workflowDetails: WorkflowWithDetails) => {
    // Load client data
    if (workflowDetails.client) {
      setSelectedClient(workflowDetails.client);
    }

    // Load appointment data
    if (workflowDetails.appointment) {
      setAppointmentFormData((prev) => ({
        ...prev,
        client_id: workflowDetails.client?.id || 0,
        CIN: workflowDetails.client_CIN,
        sujet: workflowDetails.appointment?.sujet || "",
        date_rendez_vous: workflowDetails.appointment?.date_rendez_vous || "",
        Cree_par: workflowDetails.Cree_par,
        status: workflowDetails.appointment?.status || "confirmé",
        Cabinet: workflowDetails.appointment?.Cabinet || "Biohacking",
        soin_id: workflowDetails.appointment?.soin_id || 0,
      }));
      setCreatedAppointmentId(workflowDetails.rendez_vous_id);
    }

    // Load invoice data
    if (workflowDetails.invoice) {
      setInvoiceFormData((prev) => ({
        ...prev,
        CIN: workflowDetails.client_CIN,
        date:
          workflowDetails.invoice?.date ||
          new Date().toISOString().slice(0, 16),
        statut: workflowDetails.invoice?.statut || FactureStatut.BROUILLON,
        notes: workflowDetails.invoice?.notes || "",
        Cree_par: workflowDetails.Cree_par,
        date_paiement: workflowDetails.invoice?.date_paiement,
        methode_paiement: workflowDetails.invoice?.methode_paiement,
        cheque_numero: workflowDetails.invoice?.cheque_numero,
        cheque_banque: workflowDetails.invoice?.cheque_banque,
        cheque_date_tirage: workflowDetails.invoice?.cheque_date_tirage,
        items: [],
      }));

      // Load invoice items
      if (workflowDetails.invoice.items) {
        setInvoiceItems(
          workflowDetails.invoice.items.map((item) => ({
            id_bien: item.id_bien,
            type_bien: item.type_bien,
            quantite: item.quantite,
            prix_unitaire: item.prix_unitaire,
            nom_bien: item.nom_bien,
          })),
        );
      }
    }
  };

  const filteredClients = clients.filter((client) => {
    const searchTerm = clientSearchQuery.toLowerCase();
    return (
      client.nom.toLowerCase().includes(searchTerm) ||
      client.prenom.toLowerCase().includes(searchTerm) ||
      client.CIN.toLowerCase().includes(searchTerm) ||
      client.email.toLowerCase().includes(searchTerm)
    );
  });

  // Step 1 handlers
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setAppointmentFormData((prev) => ({
      ...prev,
      client_id: client.id,
      CIN: client.CIN,
    }));
    setInvoiceFormData((prev) => ({
      ...prev,
      CIN: client.CIN,
    }));
    setIsClientSelectorOpen(false);
    setClientSearchQuery("");
    setErrors([]);
  };

  const handleCreateNewPatient = async () => {
    const validationErrors = validateClientData({
      nom: newPatientData.nom || "",
      prenom: newPatientData.prenom || "",
      CIN: newPatientData.CIN || "",
      numero_telephone: newPatientData.numero_telephone || "",
      date_naissance: "2009-09-02T19:30",
      adresse: "",
      grupo_sanguin: "A+",
      email: "",
      commentaire: "",
      allergies: "",
      antecedents: "",
      Cree_par: AuthService.getCurrentUser().CIN,
    } as ClientFormData);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const requiredPatientData: ClientFormData = {
        nom: newPatientData.nom || "",
        prenom: newPatientData.prenom || "",
        CIN: newPatientData.CIN || "",
        numero_telephone: newPatientData.numero_telephone || "",
        date_naissance: "2009-09-02T19:30",
        adresse: "",
        groupe_sanguin: "A+",
        email: "",
        commentaire: "",
        allergies: "",
        antecedents: "",
        Cree_par: AuthService.getCurrentUser().CIN,
      };

      const newClient = await ClientsService.create(requiredPatientData);
      handleClientSelect(newClient);
      setIsNewPatientMode(false);
      setNewPatientData({
        nom: "",
        prenom: "",
        CIN: "",
        numero_telephone: "",
      });
      toast({
        title: "Succès",
        description: "Patient créé avec succès",
      });
    } catch (error: any) {
      setErrors([error.message || "Erreur lors de la création du patient"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextFromStep1 = () => {
    if (!selectedClient) {
      setErrors(["Veuillez sélectionner ou créer un patient"]);
      return;
    }
    setErrors([]);
    setCurrentStep(2);
  };

  // Step 2 handlers
  const handleAppointmentChange = (
    field: keyof AppointmentFormData,
    value: any,
  ) => {
    setAppointmentFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors([]);
  };

  const handleSaveAndQuit = async () => {
    const currentUser = AuthService.getCurrentUser();
    const updatedFormData = {
      ...appointmentFormData,
      Cree_par: currentUser.CIN,
    };

    const validationErrors = validateAppointmentData(updatedFormData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);

      let appointmentId: number;

      // If editing, update appointment; otherwise create new
      if (isEditMode && createdAppointmentId) {
        await AppointmentsService.update(createdAppointmentId, updatedFormData);
        appointmentId = createdAppointmentId;
      } else {
        const appointment = await AppointmentsService.create(updatedFormData);
        appointmentId = appointment.id;
      }

      // If editing, update workflow; otherwise create new
      if (isEditMode && workflow?.id) {
        await WorkflowService.update(workflow.id, {
          client_CIN: updatedFormData.CIN,
          rendez_vous_id: appointmentId,
          Cree_par: currentUser.CIN,
        });
      } else {
        await WorkflowService.create({
          client_CIN: updatedFormData.CIN,
          rendez_vous_id: appointmentId,
          Cree_par: currentUser.CIN,
        });
      }

      toast({
        title: "Succès",
        description: isEditMode ? "Flux mis à jour" : "Flux créé et enregistré",
      });

      onSubmit();
      onClose();
    } catch (error: any) {
      setErrors([error.message || "Erreur lors de la création du flux"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextFromStep2 = async () => {
    const currentUser = AuthService.getCurrentUser();
    const updatedFormData = {
      ...appointmentFormData,
      Cree_par: currentUser.CIN,
    };

    const validationErrors = validateAppointmentData(updatedFormData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);

      let appointmentId: number;

      // If editing, update appointment; otherwise create new
      if (isEditMode && createdAppointmentId) {
        await AppointmentsService.update(createdAppointmentId, updatedFormData);
        appointmentId = createdAppointmentId;
      } else {
        const appointment = await AppointmentsService.create(updatedFormData);
        appointmentId = appointment.id;
        setCreatedAppointmentId(appointmentId);
      }

      setErrors([]);

      // Auto-populate the selected service/soin in the invoice items
      if (appointmentFormData.soin_id) {
        const selectedSoin = soins.find(
          (s) => s.id === appointmentFormData.soin_id,
        );
        if (selectedSoin) {
          setInvoiceItems([
            {
              id_bien: selectedSoin.id,
              type_bien: TypeBien.SOIN,
              quantite: 1,
              prix_unitaire: selectedSoin.prix,
              nom_bien: selectedSoin.Nom,
            },
          ]);
        }
      }

      setCurrentStep(3);
    } catch (error: any) {
      setErrors([error.message || "Erreur lors de la création du rendez-vous"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3 handlers
  const handleAddInvoiceItem = () => {
    setInvoiceItems((prev) => [
      ...prev,
      {
        id_bien: 0,
        type_bien: TypeBien.PRODUIT,
        quantite: 1,
        prix_unitaire: 0,
        nom_bien: "",
      },
    ]);
  };

  const handleRemoveInvoiceItem = (index: number) => {
    setInvoiceItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInvoiceItemChange = (
    index: number,
    field: keyof FactureItem,
    value: any,
  ) => {
    setInvoiceItems((prev) => {
      const updated = [...prev];
      if (field === "id_bien") {
        const product = products.find((p) => p.id === value);
        if (product) {
          updated[index] = {
            ...updated[index],
            id_bien: value,
            nom_bien: product.Nom,
            prix_unitaire: product.prix,
          };
        }
      } else {
        (updated[index] as any)[field] = value;
      }
      return updated;
    });
    setErrors([]);
  };

  const handleNextFromStep3 = async () => {
    if (invoiceItems.length === 0) {
      setErrors(["Au moins un article est requis pour la facture"]);
      return;
    }

    // Move to step 4
    setErrors([]);
    setCurrentStep(4);
  };

  const handleSaveAndQuitStep3 = async () => {
    if (invoiceItems.length === 0) {
      setErrors(["Au moins un article est requis pour la facture"]);
      return;
    }

    const currentUser = AuthService.getCurrentUser();
    const draftInvoiceData = {
      ...invoiceFormData,
      statut: FactureStatut.BROUILLON,
      Cree_par: currentUser.CIN,
      items: invoiceItems,
    };

    const validationErrors = validateFactureData(draftInvoiceData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);

      let invoiceId: number;

      // If editing and invoice exists, update it; otherwise create new
      if (isEditMode && workflow?.facture_id) {
        const updatedInvoice = await InvoicesService.update(
          workflow.facture_id,
          draftInvoiceData,
        );
        invoiceId = updatedInvoice?.id || workflow.facture_id;
      } else {
        const invoice = await InvoicesService.create(draftInvoiceData);
        invoiceId = invoice.id;
      }

      let appointmentId = createdAppointmentId;
      if (!appointmentId) {
        const appointment =
          await AppointmentsService.create(appointmentFormData);
        appointmentId = appointment.id;
      }

      // If editing, update workflow; otherwise create new
      if (isEditMode && workflow?.id) {
        await WorkflowService.update(workflow.id, {
          client_CIN: appointmentFormData.CIN,
          rendez_vous_id: appointmentId,
          facture_id: invoiceId,
          Cree_par: currentUser.CIN,
        });
      } else {
        await WorkflowService.create({
          client_CIN: appointmentFormData.CIN,
          rendez_vous_id: appointmentId,
          facture_id: invoiceId,
          Cree_par: currentUser.CIN,
        });
      }

      toast({
        title: "Succès",
        description: isEditMode
          ? "Flux mis à jour"
          : "Flux enregistré en brouillon",
      });

      onSubmit();
      onClose();
    } catch (error: any) {
      setErrors([error.message || "Erreur lors de l'enregistrement du flux"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteWorkflow = async () => {
    if (invoiceItems.length === 0) {
      setErrors(["Au moins un article est requis pour la facture"]);
      return;
    }

    const currentUser = AuthService.getCurrentUser();

    // Ensure payment details are present if status is PAYEE
    if (invoiceFormData.statut === FactureStatut.PAYEE) {
      if (!invoiceFormData.date_paiement) {
        setErrors(["La date de paiement est requise"]);
        return;
      }
      if (!invoiceFormData.methode_paiement) {
        setErrors(["La méthode de paiement est requise"]);
        return;
      }
      if (invoiceFormData.methode_paiement === "Par chéque") {
        if (
          !invoiceFormData.cheque_numero ||
          !invoiceFormData.cheque_banque ||
          !invoiceFormData.cheque_date_tirage
        ) {
          setErrors(["Les informations de chèque sont incomplètes"]);
          return;
        }
      }
    }

    const validationErrors = validateFactureData({
      ...invoiceFormData,
      Cree_par: currentUser.CIN,
      items: invoiceItems,
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);

      let invoiceId: number;

      // If editing and invoice exists, update it; otherwise create new
      if (isEditMode && workflow?.facture_id) {
        const updatedInvoice = await InvoicesService.update(
          workflow.facture_id,
          {
            ...invoiceFormData,
            Cree_par: currentUser.CIN,
            items: invoiceItems,
          },
        );
        invoiceId = updatedInvoice?.id || workflow.facture_id;
      } else {
        const invoice = await InvoicesService.create({
          ...invoiceFormData,
          Cree_par: currentUser.CIN,
          items: invoiceItems,
        });
        invoiceId = invoice.id;
      }

      let appointmentId = createdAppointmentId;
      if (!appointmentId) {
        const appointment =
          await AppointmentsService.create(appointmentFormData);
        appointmentId = appointment.id;
      }

      // If editing, update workflow; otherwise create new
      if (isEditMode && workflow?.id) {
        await WorkflowService.update(workflow.id, {
          client_CIN: appointmentFormData.CIN,
          rendez_vous_id: appointmentId,
          facture_id: invoiceId,
          Cree_par: currentUser.CIN,
        });
      } else {
        await WorkflowService.create({
          client_CIN: appointmentFormData.CIN,
          rendez_vous_id: appointmentId,
          facture_id: invoiceId,
          Cree_par: currentUser.CIN,
        });
      }

      toast({
        title: "Succès",
        description: isEditMode
          ? "Flux mis à jour avec succès"
          : "Flux complété avec succès",
      });

      onSubmit();
      onClose();
    } catch (error: any) {
      setErrors([error.message || "Erreur lors de la complétion du flux"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
      setErrors([]);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-3 mb-6 px-6 py-4 bg-gradient-to-r from-[hsl(165,20%,96%)] to-[hsl(165,50%,96%)] rounded-lg border border-[hsl(165,88%,15%,0.2)]">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold transition-all ${
              step < currentStep
                ? "bg-[hsl(165,88%,15%)] text-white ring-2 ring-[hsl(165,88%,15%,0.2)]"
                : step === currentStep
                  ? "bg-[hsl(165,88%,15%)] text-white ring-2 ring-[hsl(165,88%,15%,0.3)] scale-110"
                  : "bg-gray-200 text-gray-600"
            }`}
          >
            {step < currentStep ? "✓" : step}
          </div>
          <div className="text-sm font-medium">
            {step === 1 && "Patient"}
            {step === 2 && "Rendez-vous"}
            {step === 3 && "Facturation"}
            {step === 4 && "Paiement"}
          </div>
          {step < 4 && (
            <div
              className={`h-1 w-12 rounded-full transition-all ${
                step < currentStep ? "bg-[hsl(165,88%,15%)]" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-semibold">
          <Users className="h-5 w-5" />
          Sélectionner le Patient
        </Label>
        <div className="flex items-center space-x-2">
          <Label htmlFor="new-patient-mode" className="text-sm">
            Nouveau patient
          </Label>
          <Switch
            id="new-patient-mode"
            checked={isNewPatientMode}
            onCheckedChange={setIsNewPatientMode}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <Separator />

      {!isNewPatientMode ? (
        <>
          <Popover
            open={isClientSelectorOpen}
            onOpenChange={setIsClientSelectorOpen}
            modal={true}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={isClientSelectorOpen}
                className="w-full justify-between"
                disabled={isSubmitting}
              >
                {selectedClient ? (
                  <div className="flex items-center gap-2">
                    <span>
                      {selectedClient.prenom} {selectedClient.nom}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {selectedClient.CIN}
                    </Badge>
                  </div>
                ) : (
                  "Rechercher et sélectionner un patient..."
                )}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[500px] p-0 z-[60] shadow-lg border-2"
              sideOffset={5}
              align="start"
            >
              <Command>
                <CommandInput
                  placeholder="Rechercher par nom, prénom, CIN, email..."
                  value={clientSearchQuery}
                  onValueChange={setClientSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>Aucun patient trouvé.</CommandEmpty>
                  <CommandGroup>
                    {filteredClients.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={`${client.prenom} ${client.nom} ${client.CIN} ${client.email}`}
                        onSelect={() => handleClientSelect(client)}
                        className="flex items-center justify-between p-3"
                      >
                        <div className="flex flex-col">
                          <div className="font-medium">
                            {client.prenom} {client.nom}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {client.CIN} • {calculateAge(client.date_naissance)}{" "}
                            ans • {client.email}
                          </div>
                        </div>
                        <Badge variant="outline">{client.groupe_sanguin}</Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedClient && (
            <Card className="border-2 border-[hsl(165,88%,15%,0.3)] bg-[hsl(165,20%,96%)]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold text-base text-[hsl(165,88%,15%)]">
                      {selectedClient.prenom} {selectedClient.nom}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      CIN: {selectedClient.CIN} • Âge:{" "}
                      {calculateAge(selectedClient.date_naissance)} ans
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Email: {selectedClient.email} • Tél:{" "}
                      {selectedClient.numero_telephone}
                    </div>
                  </div>
                  <Badge variant="outline" className="gap-1 text-base">
                    {selectedClient.groupe_sanguin}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-4 w-4" />
                <span className="font-semibold">Créer un nouveau patient</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-patient-prenom">Prénom *</Label>
                  <Input
                    id="new-patient-prenom"
                    type="text"
                    value={newPatientData.prenom || ""}
                    onChange={(e) =>
                      setNewPatientData((prev) => ({
                        ...prev,
                        prenom: e.target.value,
                      }))
                    }
                    placeholder="Entrez le prénom"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-patient-nom">Nom *</Label>
                  <Input
                    id="new-patient-nom"
                    type="text"
                    value={newPatientData.nom || ""}
                    onChange={(e) =>
                      setNewPatientData((prev) => ({
                        ...prev,
                        nom: e.target.value,
                      }))
                    }
                    placeholder="Entrez le nom"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-patient-cin">CIN *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-patient-cin"
                      type="text"
                      value={newPatientData.CIN || ""}
                      onChange={(e) =>
                        setNewPatientData((prev) => ({
                          ...prev,
                          CIN: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="Ex: B1234567"
                      disabled={isSubmitting}
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const bytes = crypto.getRandomValues(new Uint8Array(6));
                        let digits = "";
                        for (let i = 0; i < bytes.length; i++) {
                          digits += String(bytes[i] % 10);
                        }
                        setNewPatientData((prev) => ({
                          ...prev,
                          CIN: `BH${digits}`,
                        }));
                      }}
                      disabled={isSubmitting}
                      className="whitespace-nowrap"
                    >
                      Générer
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-patient-phone">
                    Numéro de téléphone *
                  </Label>
                  <Input
                    id="new-patient-phone"
                    type="tel"
                    value={newPatientData.numero_telephone || ""}
                    onChange={(e) =>
                      setNewPatientData((prev) => ({
                        ...prev,
                        numero_telephone: e.target.value,
                      }))
                    }
                    placeholder="Ex: 0612345678"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                * Champs obligatoires. Le patient sera créé avec ces
                informations de base.
              </div>

              <Button
                onClick={handleCreateNewPatient}
                disabled={isSubmitting}
                className="w-full"
              >
                Créer Patient
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStep2 = () => (
    <form className="space-y-6">
      {selectedClient && (
        <Card className="border-[hsl(165,88%,15%,0.2)] bg-[hsl(165,20%,96%)]">
          <CardContent className="pt-6">
            <div className="text-sm">
              Patient:{" "}
              <span className="font-semibold text-[hsl(165,88%,15%)]">
                {selectedClient.prenom} {selectedClient.nom}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <Label htmlFor="sujet" className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4" />
          Type de rendez-vous *
        </Label>
        <Select
          value={appointmentFormData.sujet}
          onValueChange={(value) => handleAppointmentChange("sujet", value)}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez le type de rendez-vous" />
          </SelectTrigger>
          <SelectContent>
            {appointmentTypes.length > 0 ? (
              appointmentTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="Consultation">Consultation</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="appointment-date" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Date et heure du rendez-vous *
        </Label>
        <TimeSlotPicker
          value={appointmentFormData.date_rendez_vous}
          onChange={(datetime) =>
            handleAppointmentChange("date_rendez_vous", datetime)
          }
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cabinet" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Cabinet *
        </Label>
        <Select
          value={appointmentFormData.Cabinet}
          onValueChange={(value) => handleAppointmentChange("Cabinet", value)}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez le cabinet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Biohacking">Biohacking</SelectItem>
            <SelectItem value="Nassens">Nassens</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="soin-id" className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4" />
          Soin/Service *
        </Label>
        <Select
          value={
            appointmentFormData.soin_id
              ? String(appointmentFormData.soin_id)
              : ""
          }
          onValueChange={(value) =>
            handleAppointmentChange("soin_id", parseInt(value))
          }
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez un soin" />
          </SelectTrigger>
          <SelectContent>
            {soins.map((soin) => (
              <SelectItem key={soin.id} value={String(soin.id)}>
                {soin.Nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Statut
        </Label>
        <Select
          value={appointmentFormData.status}
          onValueChange={(value) => handleAppointmentChange("status", value)}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="programmé">Programmé</SelectItem>
            <SelectItem value="confirmé">Confirmé</SelectItem>
            <SelectItem value="terminé">Terminé</SelectItem>
            <SelectItem value="annulé">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </form>
  );

  const renderStep3 = () => {
    const totals = calculateInvoiceTotals(invoiceItems);
    return (
      <div className="space-y-6 max-h-96 overflow-y-auto pr-4">
        <Card className="border-[hsl(165,88%,15%,0.3)] bg-[hsl(165,20%,96%)]">
          <CardContent className="pt-6">
            <div className="text-sm">
              Patient:{" "}
              <span className="font-semibold text-[hsl(165,88%,15%)]">
                {selectedClient?.prenom} {selectedClient?.nom}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label htmlFor="invoice-date" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Date de Facture
          </Label>
          <Input
            id="invoice-date"
            type="datetime-local"
            value={invoiceFormData.date}
            onChange={(e) =>
              setInvoiceFormData((prev) => ({
                ...prev,
                date: e.target.value,
              }))
            }
            disabled={isSubmitting}
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 font-semibold">
              <Package className="h-4 w-4" />
              Articles *
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddInvoiceItem}
              disabled={isSubmitting}
            >
              <Plus className="h-3 w-3 mr-1" />
              Ajouter
            </Button>
          </div>

          {invoiceItems.length === 0 ? (
            <div className="text-center p-6 text-muted-foreground border-2 border-dashed rounded-lg">
              Aucun article ajouté. Cliquez sur "Ajouter" pour commencer.
            </div>
          ) : (
            <div className="space-y-2">
              {invoiceItems.map((item, index) => (
                <Card key={index} className="border">
                  <CardContent className="pt-4 pb-4">
                    <div className="space-y-3">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Type d'article</Label>
                            <Select
                              value={item.type_bien}
                              onValueChange={(value) => {
                                handleInvoiceItemChange(
                                  index,
                                  "type_bien",
                                  value as TypeBien,
                                );
                                handleInvoiceItemChange(index, "id_bien", 0);
                              }}
                              disabled={isSubmitting}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={TypeBien.PRODUIT}>
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Produit
                                  </div>
                                </SelectItem>
                                <SelectItem value={TypeBien.SOIN}>
                                  <div className="flex items-center gap-2">
                                    <Stethoscope className="h-4 w-4" />
                                    Soin
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Article</Label>
                            <Select
                              value={item.id_bien ? String(item.id_bien) : ""}
                              onValueChange={(value) => {
                                const itemId = parseInt(value);
                                const availableItems =
                                  item.type_bien === TypeBien.PRODUIT
                                    ? products
                                    : soins;
                                const selected = availableItems.find(
                                  (i) => i.id === itemId,
                                );
                                if (selected) {
                                  handleInvoiceItemChange(
                                    index,
                                    "id_bien",
                                    itemId,
                                  );
                                  handleInvoiceItemChange(
                                    index,
                                    "nom_bien",
                                    selected.Nom,
                                  );
                                  handleInvoiceItemChange(
                                    index,
                                    "prix_unitaire",
                                    selected.prix,
                                  );
                                }
                              }}
                              disabled={isSubmitting || !item.type_bien}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez un article" />
                              </SelectTrigger>
                              <SelectContent>
                                {(item.type_bien === TypeBien.PRODUIT
                                  ? products
                                  : soins
                                ).map((availableItem) => (
                                  <SelectItem
                                    key={availableItem.id}
                                    value={String(availableItem.id)}
                                  >
                                    {availableItem.Nom} - {availableItem.prix}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Quantité</Label>
                              <Input
                                type="number"
                                value={item.quantite}
                                onChange={(e) =>
                                  handleInvoiceItemChange(
                                    index,
                                    "quantite",
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                                min="1"
                                disabled={
                                  isSubmitting ||
                                  item.type_bien === TypeBien.SOIN
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Prix unitaire</Label>
                              <Input
                                type="number"
                                value={item.prix_unitaire}
                                onChange={(e) =>
                                  handleInvoiceItemChange(
                                    index,
                                    "prix_unitaire",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                min="0"
                                step="0.01"
                                disabled={isSubmitting}
                              />
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveInvoiceItem(index)}
                          disabled={isSubmitting}
                          className="mt-7"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {invoiceItems.length > 0 && (
          <>
            <Separator />
            <Card className="bg-[hsl(165,20%,96%)] border-[hsl(165,88%,15%,0.2)]">
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total HT:</span>
                    <span className="font-medium">
                      {totals.prix_ht.toFixed(2)} DH
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TVA (20%):</span>
                    <span className="font-medium">
                      {totals.tva_amount.toFixed(2)} DH
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base">
                    <span className="font-semibold">Total TTC:</span>
                    <span className="font-bold text-[hsl(165,88%,15%)]">
                      {totals.prix_total.toFixed(2)} DH
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="invoice-notes">Notes</Label>
          <Textarea
            id="invoice-notes"
            value={invoiceFormData.notes}
            onChange={(e) =>
              setInvoiceFormData((prev) => ({
                ...prev,
                notes: e.target.value,
              }))
            }
            placeholder="Notes additionnelles..."
            disabled={isSubmitting}
            className="min-h-24"
          />
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    const totals = calculateInvoiceTotals(invoiceItems);
    return (
      <div className="space-y-6 max-h-96 overflow-y-auto pr-4">
        <Card className="border-[hsl(165,88%,15%,0.3)] bg-[hsl(165,20%,96%)]">
          <CardContent className="pt-6">
            <div className="text-sm space-y-2">
              <div>
                Patient:{" "}
                <span className="font-semibold text-[hsl(165,88%,15%)]">
                  {selectedClient?.prenom} {selectedClient?.nom}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {invoiceItems.length} article(s) - Total:{" "}
                {totals.prix_total.toFixed(2)} DH
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label htmlFor="invoice-status" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Statut de la Facture *
          </Label>
          <Select
            value={invoiceFormData.statut}
            onValueChange={(value) =>
              setInvoiceFormData((prev) => ({
                ...prev,
                statut: value as FactureStatut,
                date_paiement:
                  value === FactureStatut.PAYEE
                    ? prev.date_paiement ||
                      new Date().toISOString().slice(0, 16)
                    : undefined,
              }))
            }
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez le statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FactureStatut.BROUILLON}>Brouillon</SelectItem>
              <SelectItem value={FactureStatut.PAYEE}>Payée</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {invoiceFormData.statut === FactureStatut.PAYEE && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="date_paiement">Date de paiement *</Label>
              <Input
                id="date_paiement"
                type="datetime-local"
                value={invoiceFormData.date_paiement || ""}
                onChange={(e) =>
                  setInvoiceFormData((prev) => ({
                    ...prev,
                    date_paiement: e.target.value,
                  }))
                }
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="methode_paiement">Méthode de paiement *</Label>
              <Select
                value={invoiceFormData.methode_paiement || ""}
                onValueChange={(value) =>
                  setInvoiceFormData((prev) => ({
                    ...prev,
                    methode_paiement: value,
                    cheque_numero:
                      value !== "Chèque" ? undefined : prev.cheque_numero,
                    cheque_banque:
                      value !== "Chèque" ? undefined : prev.cheque_banque,
                    cheque_date_tirage:
                      value !== "Chèque" ? undefined : prev.cheque_date_tirage,
                  }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez la méthode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="En Espece">En Espece</SelectItem>
                  <SelectItem value="Paiment Bancaire">
                    Paiment Bancaire
                  </SelectItem>
                  <SelectItem value="Par chéque">Par chéque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {invoiceFormData.methode_paiement === "Par chéque" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="space-y-2">
                  <Label
                    htmlFor="cheque_numero"
                    className="flex items-center gap-2"
                  >
                    <Hash className="h-4 w-4" />
                    Numéro de chèque
                  </Label>
                  <Input
                    id="cheque_numero"
                    type="text"
                    value={invoiceFormData.cheque_numero || ""}
                    onChange={(e) =>
                      setInvoiceFormData((prev) => ({
                        ...prev,
                        cheque_numero: e.target.value,
                      }))
                    }
                    placeholder="Numéro"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cheque_banque">Nom de la banque</Label>
                  <Select
                    value={invoiceFormData.cheque_banque || ""}
                    onValueChange={(value) =>
                      setInvoiceFormData((prev) => ({
                        ...prev,
                        cheque_banque: value,
                      }))
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez la banque" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="cheque_date_tirage"
                    className="flex items-center gap-2"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Date de tirage
                  </Label>
                  <Input
                    id="cheque_date_tirage"
                    type="date"
                    value={invoiceFormData.cheque_date_tirage || ""}
                    onChange={(e) =>
                      setInvoiceFormData((prev) => ({
                        ...prev,
                        cheque_date_tirage: e.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-[950px] max-h-[95vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {workflow ? "Modifier Flux" : "Créer Nouveau Flux"}
          </DialogTitle>
          <DialogDescription>
            {workflow
              ? "Modifiez les informations du flux"
              : "Créez un nouveau flux en suivant les étapes"}
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="py-4 px-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        <DialogFooter className="flex justify-between gap-2 px-6">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePreviousStep}
                disabled={isSubmitting}
              >
                Précédent
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {currentStep === 1 && (
              <Button
                onClick={handleNextFromStep1}
                disabled={isSubmitting || !selectedClient}
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {currentStep === 2 && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSaveAndQuit}
                  disabled={isSubmitting}
                >
                  Enregistrer et Quitter
                </Button>
                <Button onClick={handleNextFromStep2} disabled={isSubmitting}>
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}

            {currentStep === 3 && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSaveAndQuitStep3}
                  disabled={isSubmitting || invoiceItems.length === 0}
                >
                  Enregistrer et Quitter
                </Button>
                <Button
                  onClick={handleNextFromStep3}
                  disabled={isSubmitting || invoiceItems.length === 0}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}

            {currentStep === 4 && (
              <Button onClick={handleCompleteWorkflow} disabled={isSubmitting}>
                Terminer
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
