import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  WorkflowService,
  Workflow,
  WorkflowFormData,
  validateWorkflowData,
} from "@/services/workflowService";
import {
  ClientsService,
  Client,
  ClientFormData,
  validateClientData,
} from "@/services/clientsService";
import {
  AppointmentsService,
  AppointmentFormData,
  validateAppointmentData,
  getAppointmentTypes,
  generateTimeSlotsForDate,
} from "@/services/appointmentsService";
import {
  InvoicesService,
  FactureFormData,
  validateFactureData,
  FactureItem,
  TypeBien,
  FactureStatut,
  calculateInvoiceTotals,
} from "@/services/invoicesService";
import { ProductsService, Product } from "@/services/productsService";
import { useToast } from "@/components/ui/use-toast";

interface WorkflowFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  workflow?: Workflow;
  initialStep?: number;
}

type Step = 1 | 2 | 3;

export default function WorkflowFormModal({
  isOpen,
  onClose,
  onSubmit,
  workflow,
  initialStep = 1,
}: WorkflowFormModalProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>(
    (initialStep as Step) || 1,
  );
  const [startingStep, setStartingStep] = useState<Step>((initialStep as Step) || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Shared data across steps
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Step 1: Client selection
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientSearch, setClientSearch] = useState("");
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  const [newClientFormData, setNewClientFormData] = useState<ClientFormData>({
    CIN: "",
    nom: "",
    prenom: "",
    date_naissance: "",
    adresse: "",
    numero_telephone: "",
    email: "",
    groupe_sanguin: "",
    antecedents: "",
    allergies: "",
    commentaire: "",
    Cree_par: "",
  });

  // Step 2: Appointment
  const [appointmentFormData, setAppointmentFormData] =
    useState<AppointmentFormData>({
      client_id: 0,
      CIN: "",
      sujet: "",
      date_rendez_vous: "",
      Cree_par: "",
      status: "confirmé",
      Cabinet: "",
      soin_id: 0,
    });

  // Step 3: Invoice (optional)
  const [invoiceFormData, setInvoiceFormData] = useState<FactureFormData>({
    CIN: "",
    date: new Date().toISOString().slice(0, 16),
    statut: FactureStatut.PAYEE,
    notes: "",
    Cree_par: "",
    items: [],
  });

  const [invoiceItems, setInvoiceItems] = useState<FactureItem[]>([]);

  // Track created appointment ID to avoid duplicates
  const [createdAppointmentId, setCreatedAppointmentId] = useState<number | null>(null);

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadClients();
      loadProducts();
      const step = (initialStep as Step) || 1;
      setCurrentStep(step);
      setStartingStep(step);
    }
  }, [isOpen, initialStep]);

  // Update filtered clients when search changes
  useEffect(() => {
    const lowerSearch = clientSearch.toLowerCase();
    const filtered = clients.filter(
      (client) =>
        client.nom.toLowerCase().includes(lowerSearch) ||
        client.prenom.toLowerCase().includes(lowerSearch) ||
        client.CIN.toLowerCase().includes(lowerSearch),
    );
    setFilteredClients(filtered);
  }, [clientSearch, clients]);

  const loadClients = async () => {
    try {
      const data = await ClientsService.getAll();
      setClients(data);
      setFilteredClients(data);
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

  // Step 1 handlers
  const handleSelectExistingClient = (client: Client) => {
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
    setClientSearch("");
    setFilteredClients([]);
  };

  const handleCreateNewClient = async () => {
    const validationErrors = validateClientData(newClientFormData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const newClient = await ClientsService.create(newClientFormData);
      setSelectedClient(newClient);
      setAppointmentFormData((prev) => ({
        ...prev,
        client_id: newClient.id,
        CIN: newClient.CIN,
      }));
      setInvoiceFormData((prev) => ({
        ...prev,
        CIN: newClient.CIN,
      }));
      setClientMode("existing");
      setNewClientFormData({
        CIN: "",
        nom: "",
        prenom: "",
        date_naissance: "",
        adresse: "",
        numero_telephone: "",
        email: "",
        groupe_sanguin: "",
        antecedents: "",
        allergies: "",
        commentaire: "",
        Cree_par: "",
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

  const handleNextFromStep1 = async () => {
    if (!selectedClient) {
      setErrors(["Veuillez sélectionner ou créer un patient"]);
      return;
    }
    setErrors([]);
    setCurrentStep(2);
  };

  // Step 2 handlers
  const handleAppointmentFieldChange = (
    field: keyof AppointmentFormData,
    value: any,
  ) => {
    setAppointmentFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveAndQuit = async () => {
    const validationErrors = validateAppointmentData(appointmentFormData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const appointment = await AppointmentsService.create(
        appointmentFormData,
      );

      await WorkflowService.create({
        client_CIN: appointmentFormData.CIN,
        rendez_vous_id: appointment.id,
        Cree_par: appointmentFormData.Cree_par,
      });

      toast({
        title: "Succès",
        description: "Flux créé et enregistré",
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
    const validationErrors = validateAppointmentData(appointmentFormData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const appointment = await AppointmentsService.create(
        appointmentFormData,
      );

      setInvoiceFormData((prev) => ({
        ...prev,
        CIN: appointmentFormData.CIN,
      }));

      setErrors([]);
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
  };

  const handleCompleteWorkflow = async () => {
    if (invoiceItems.length === 0) {
      setErrors(["Au moins un article est requis pour la facture"]);
      return;
    }

    const validationErrors = validateFactureData({
      ...invoiceFormData,
      items: invoiceItems,
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);

      const invoice = await InvoicesService.create({
        ...invoiceFormData,
        items: invoiceItems,
      });

      const appointmentResult = await AppointmentsService.create(
        appointmentFormData,
      );

      await WorkflowService.create({
        client_CIN: appointmentFormData.CIN,
        rendez_vous_id: appointmentResult.id,
        facture_id: invoice.id,
        Cree_par: appointmentFormData.Cree_par,
      });

      toast({
        title: "Succès",
        description: "Flux complété avec succès",
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
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
              step <= currentStep
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {step}
          </div>
          {step < 3 && (
            <div
              className={`w-8 h-1 ${
                step < currentStep ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Étape 1: Identifier le Patient</h3>

      <div className="flex gap-2 mb-4">
        <Button
          variant={clientMode === "existing" ? "default" : "outline"}
          onClick={() => setClientMode("existing")}
          className="flex-1"
        >
          Sélectionner Patient
        </Button>
        <Button
          variant={clientMode === "new" ? "default" : "outline"}
          onClick={() => setClientMode("new")}
          className="flex-1"
        >
          Créer Nouveau Patient
        </Button>
      </div>

      {clientMode === "existing" ? (
        <div className="space-y-3">
          <div>
            <Label htmlFor="client-search">Rechercher Patient</Label>
            <Input
              id="client-search"
              placeholder="Nom, Prénom ou CIN..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
          </div>

          {clientSearch && filteredClients.length > 0 && (
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleSelectExistingClient(client)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0 transition"
                >
                  <div className="font-medium">
                    {client.prenom} {client.nom}
                  </div>
                  <div className="text-sm text-gray-500">{client.CIN}</div>
                </button>
              ))}
            </div>
          )}

          {selectedClient && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="font-medium">Patient Sélectionné</div>
              <div>
                {selectedClient.prenom} {selectedClient.nom}
              </div>
              <div className="text-sm text-gray-600">{selectedClient.CIN}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor="new-cin">CIN *</Label>
            <Input
              id="new-cin"
              value={newClientFormData.CIN}
              onChange={(e) =>
                setNewClientFormData((prev) => ({
                  ...prev,
                  CIN: e.target.value,
                }))
              }
              placeholder="B1234567"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="new-nom">Nom *</Label>
              <Input
                id="new-nom"
                value={newClientFormData.nom}
                onChange={(e) =>
                  setNewClientFormData((prev) => ({
                    ...prev,
                    nom: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="new-prenom">Prénom *</Label>
              <Input
                id="new-prenom"
                value={newClientFormData.prenom}
                onChange={(e) =>
                  setNewClientFormData((prev) => ({
                    ...prev,
                    prenom: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              type="email"
              value={newClientFormData.email}
              onChange={(e) =>
                setNewClientFormData((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <Label htmlFor="new-phone">Téléphone</Label>
            <Input
              id="new-phone"
              value={newClientFormData.numero_telephone}
              onChange={(e) =>
                setNewClientFormData((prev) => ({
                  ...prev,
                  numero_telephone: e.target.value,
                }))
              }
            />
          </div>

          <Button
            onClick={handleCreateNewClient}
            disabled={isSubmitting}
            className="w-full"
          >
            Créer Patient
          </Button>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Étape 2: Rendez-vous</h3>

      {selectedClient && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="text-sm">Patient: {selectedClient.prenom} {selectedClient.nom}</div>
        </div>
      )}

      <div>
        <Label htmlFor="subject">Sujet du Rendez-vous *</Label>
        <Select
          value={appointmentFormData.sujet}
          onValueChange={(value) =>
            handleAppointmentFieldChange("sujet", value)
          }
        >
          <SelectTrigger id="subject">
            <SelectValue placeholder="Sélectionner le sujet" />
          </SelectTrigger>
          <SelectContent>
            {getAppointmentTypes().map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="appointment-date">Date et Heure *</Label>
        <Input
          id="appointment-date"
          type="datetime-local"
          value={appointmentFormData.date_rendez_vous}
          onChange={(e) =>
            handleAppointmentFieldChange("date_rendez_vous", e.target.value)
          }
        />
      </div>

      <div>
        <Label htmlFor="cabinet">Cabinet *</Label>
        <Input
          id="cabinet"
          value={appointmentFormData.Cabinet}
          onChange={(e) =>
            handleAppointmentFieldChange("Cabinet", e.target.value)
          }
          placeholder="Nom du cabinet"
        />
      </div>

      <div>
        <Label htmlFor="soin-id">Soin/Service *</Label>
        <Input
          id="soin-id"
          type="number"
          value={appointmentFormData.soin_id}
          onChange={(e) =>
            handleAppointmentFieldChange("soin_id", parseInt(e.target.value))
          }
          placeholder="ID du soin"
        />
      </div>
    </div>
  );

  const renderStep3 = () => {
    const totals = calculateInvoiceTotals(invoiceItems);
    return (
      <div className="space-y-4 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold">Étape 3: Facturation (Optionnel)</h3>

        <div>
          <Label htmlFor="invoice-date">Date de Facture</Label>
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
          />
        </div>

        <div>
          <Label>Articles *</Label>
          <div className="space-y-2 mb-3">
            {invoiceItems.map((item, index) => (
              <div key={index} className="flex gap-2 items-start p-2 bg-gray-50 rounded">
                <div className="flex-1 space-y-2">
                  <Select
                    value={item.id_bien?.toString() || ""}
                    onValueChange={(value) =>
                      handleInvoiceItemChange(index, "id_bien", parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Produit/Service" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.Nom} - {product.prix}DH
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Quantité"
                      value={item.quantite}
                      onChange={(e) =>
                        handleInvoiceItemChange(
                          index,
                          "quantite",
                          parseInt(e.target.value),
                        )
                      }
                      min="1"
                    />
                    <Input
                      type="number"
                      placeholder="Prix unitaire"
                      value={item.prix_unitaire}
                      onChange={(e) =>
                        handleInvoiceItemChange(
                          index,
                          "prix_unitaire",
                          parseFloat(e.target.value),
                        )
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveInvoiceItem(index)}
                >
                  Supprimer
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleAddInvoiceItem}
            className="w-full mb-3"
          >
            Ajouter Article
          </Button>
        </div>

        {invoiceItems.length > 0 && (
          <div className="p-3 bg-gray-50 rounded space-y-1">
            <div className="flex justify-between text-sm">
              <span>Total HT:</span>
              <span>{totals.prix_ht.toFixed(2)} DH</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>TVA (20%):</span>
              <span>{totals.tva_amount.toFixed(2)} DH</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Total TTC:</span>
              <span>{totals.prix_total.toFixed(2)} DH</span>
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="payment-method">Méthode de Paiement</Label>
          <Select
            value={invoiceFormData.methode_paiement || ""}
            onValueChange={(value) =>
              setInvoiceFormData((prev) => ({
                ...prev,
                methode_paiement: value,
              }))
            }
          >
            <SelectTrigger id="payment-method">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Espèces">Espèces</SelectItem>
              <SelectItem value="Chèque">Chèque</SelectItem>
              <SelectItem value="Virement">Virement</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
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
          />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {workflow ? "Modifier Flux" : "Créer Nouveau Flux"}
          </DialogTitle>
          <DialogDescription>
            Remplissez les informations du flux étape par étape
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="py-4">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        <DialogFooter className="flex gap-2 justify-between">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePreviousStep}
                disabled={isSubmitting}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
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
                <Button
                  onClick={handleNextFromStep2}
                  disabled={isSubmitting}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}

            {currentStep === 3 && (
              <Button
                onClick={handleCompleteWorkflow}
                disabled={isSubmitting}
              >
                Terminer
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
