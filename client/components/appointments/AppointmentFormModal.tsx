import { useState, useEffect } from "react";
import {
  CalendarDays,
  Search,
  FileText,
  Clock,
  Stethoscope,
  User,
  Users,
  UserPlus,
  Building2,
} from "lucide-react";
import TimeSlotPicker from "./TimeSlotPicker";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  AppointmentFormData,
  RendezVous,
  validateAppointmentData,
  getAvailableDoctors,
} from "@/services/appointmentsService";
import {
  ClientsService,
  Client,
  ClientFormData,
  calculateAge,
  validateClientData,
  Utilisateur,
} from "@/services/clientsService";
import { SoinsService, Soin } from "@/services/soinsService";
import { AuthService } from "@/services/authService";
import { OptionsService } from "@/services/optionsService";

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  appointment?: RendezVous | null;
  isLoading?: boolean;
  users: Utilisateur[] | null;
}

export default function AppointmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  appointment,
  isLoading = false,
  users,
}: AppointmentFormModalProps) {
  const [formData, setFormData] = useState<AppointmentFormData>({
    client_id: 0,
    CIN: "",
    sujet: "",
    date_rendez_vous: "",
    Cree_par: "",
    status: "programmé",
    Cabinet: "Biohacking",
    soin_id: 0,
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [soins, setSoins] = useState<Soin[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isNewPatientMode, setIsNewPatientMode] = useState(false);
  const [newPatientData, setNewPatientData] = useState<Partial<ClientFormData>>(
    {
      nom: "",
      prenom: "",
      CIN: "",
      numero_telephone: "",
    },
  );

  const isEditMode = !!appointment;
  const availableDoctors = getAvailableDoctors();
  const [appointmentTypes, setAppointmentTypes] = useState<string[]>([]);

  // Load clients and options when modal opens
  useEffect(() => {
    if (isOpen) {
      loadClients();
      loadSoins();
      OptionsService.getAppointmentTypes()
        .then(setAppointmentTypes)
        .catch(() => setAppointmentTypes([]));
    }
  }, [isOpen]);

  // Initialize form data when appointment changes
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (appointment) {
      // Convert stored ISO to local datetime-local string
      const toLocalInputValue = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      const dateTime = appointment.date_rendez_vous
        ? toLocalInputValue(new Date(appointment.date_rendez_vous))
        : "";

      setFormData({
        client_id: appointment.client_id || 0,
        CIN: appointment.CIN || "",
        sujet: appointment.sujet || "",
        date_rendez_vous: dateTime,
        Cree_par: appointment.Cree_par || "",
        status: appointment.status || "programmé",
        Cabinet: appointment.Cabinet || "Biohacking",
        soin_id: appointment.soin_id || 0,
      });

      // Find and set the selected client if we have a client_id
      if (appointment.client_id) {
        findClientById(appointment.client_id);
      }
    } else {
      // Reset form for new appointment
      setFormData({
        client_id: 0,
        CIN: "",
        sujet: "",
        date_rendez_vous: "",
        Cree_par: user.CIN,
        status: "programmé",
        Cabinet: "Biohacking",
        soin_id: 0,
      });
      setSelectedClient(null);
      setIsNewPatientMode(false);
      setNewPatientData({
        nom: "",
        prenom: "",
        CIN: "",
        numero_telephone: "",
      });
    }
    setErrors([]);
  }, [appointment, isOpen]);

  const loadClients = async () => {
    try {
      const clientsData = await ClientsService.getAll();
      console.log(clientsData);
      setClients(clientsData);
    } catch (error) {
      setErrors(
        Array.isArray(error?.response?.data?.message) &&
          error.response.data.message.length > 0
          ? error.response.data.message
          : [
              error?.response?.data?.message ??
                "Erreur lors du chargement des patients",
            ],
      );
    }
  };

  const loadSoins = async () => {
    try {
      const soinsData = await SoinsService.getAll();
      setSoins(soinsData);
    } catch (error) {
      console.error("Erreur lors du chargement des soins", error);
    }
  };

  const findClientById = async (clientId: number) => {
    try {
      const client = await ClientsService.getById(clientId);
      setSelectedClient(client);
    } catch (error) {
      console.error("Error finding client:", error);
    }
  };

  const handleInputChange = (
    field: keyof AppointmentFormData,
    value: string | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setFormData((prev) => ({ ...prev, client_id: client.id }));
    setIsClientSelectorOpen(false);
    setClientSearchQuery("");
    // Clear errors when client is selected
    if (errors.length > 0) {
      setErrors([]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let clientId = formData.client_id;
    const allErrors: string[] = [];

    // If in new patient mode, create the patient first
    if (isNewPatientMode) {
      // Validate new patient data (only required fields)
      const currentUser = AuthService.getCurrentUser();
      const requiredPatientData: ClientFormData = {
        nom: newPatientData.nom || "",
        prenom: newPatientData.prenom || "",
        date_naissance: "2009-09-02T19:30",
        adresse: "",
        numero_telephone: newPatientData.numero_telephone || "",
        groupe_sanguin: "A+",
        email: "",
        commentaire: "",
        CIN: newPatientData.CIN || "",
        allergies: "",
        antecedents: "",
        Cree_par: currentUser.CIN,
      };

      // Validate required fields for new patient
      if (!newPatientData.nom?.trim()) {
        allErrors.push("Le nom du patient est obligatoire");
      }
      if (!newPatientData.prenom?.trim()) {
        allErrors.push("Le prénom du patient est obligatoire");
      }
      if (!newPatientData.CIN?.trim()) {
        allErrors.push("Le CIN du patient est obligatoire");
      } else if (!/^[A-Z]{1,2}\d{5,}$/.test(newPatientData.CIN)) {
        allErrors.push("Le CIN doit suivre le format B1234567 ou BR54657");
      }

      if (!newPatientData.numero_telephone.trim()) {
        allErrors.push("Le numéro de téléphone est obligatoire");
      } else if (
        !/^(\+212|0|\+33)[1-9]\d{7,8}$/.test(
          newPatientData.numero_telephone.replace(/\s/g, ""),
        )
      ) {
        allErrors.push(
          "Le numéro de téléphone n'est pas au format belge valide",
        );
      }

      if (allErrors.length > 0) {
        setErrors(allErrors);
        return;
      }

      try {
        // Create the new patient
        const newClient = await ClientsService.create(requiredPatientData);
        clientId = newClient.id;
      } catch (error) {
        setErrors(
          Array.isArray(error?.response?.data?.message) &&
            error.response.data.message.length > 0
            ? error.response.data.message
            : [
                error?.response?.data?.message ??
                  "Erreur lors de la création du patient",
              ],
        );
        return;
      }
    }

    // Update form data with the client ID (either selected or newly created)
    const updatedFormData = { ...formData, client_id: clientId };

    // Validate appointment form data
    const validationErrors = validateAppointmentData(
      updatedFormData,
      appointment?.id,
    );
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(updatedFormData);
      // Don't call onClose here - let the parent handle it
    } catch (error) {
      setErrors(
        Array.isArray(error?.response?.data?.message) &&
          error.response.data.message.length > 0
          ? error.response.data.message
          : [
              error?.response?.data?.message ??
                "Une erreur s'est produite lors de l'enregistrement",
            ],
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewPatientToggle = (checked: boolean) => {
    setIsNewPatientMode(checked);
    if (checked) {
      setSelectedClient(null);
      setFormData((prev) => ({ ...prev, client_id: 0 }));
    } else {
      setNewPatientData({
        nom: "",
        prenom: "",
        CIN: "",
        numero_telephone: "",
      });
    }
    // Clear errors when switching modes
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleNewPatientChange = (
    field: keyof ClientFormData,
    value: string,
  ) => {
    setNewPatientData((prev) => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      // Reset form and errors when closing
      setErrors([]);
      setSelectedClient(null);
      setClientSearchQuery("");
      setIsNewPatientMode(false);
      setNewPatientData({
        nom: "",
        prenom: "",
        CIN: "",
        numero_telephone: "",
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[95vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {isEditMode ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifiez les informations du rendez-vous"
              : "Créez un nouveau rendez-vous en sélectionnant un patient et en remplissant les informations"}
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Patient
              </Label>
              <div className="flex items-center space-x-2">
                <Label htmlFor="new-patient-mode" className="text-sm">
                  Nouveau patient
                </Label>
                <Switch
                  id="new-patient-mode"
                  checked={isNewPatientMode}
                  onCheckedChange={handleNewPatientToggle}
                  disabled={isSubmitting || isEditMode}
                />
              </div>
            </div>

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
                                  {client.CIN} •{" "}
                                  {calculateAge(client.date_naissance)} ans •{" "}
                                  {client.email}
                                </div>
                              </div>
                              <Badge variant="outline">
                                {client.groupe_sanguin}
                              </Badge>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedClient && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">
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
                      <Badge variant="outline" className="gap-1">
                        {selectedClient.groupe_sanguin}
                      </Badge>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <UserPlus className="h-4 w-4" />
                      <span className="font-medium">
                        Informations du nouveau patient
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-patient-prenom">Prénom *</Label>
                        <Input
                          id="new-patient-prenom"
                          type="text"
                          value={newPatientData.prenom || ""}
                          onChange={(e) =>
                            handleNewPatientChange("prenom", e.target.value)
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
                            handleNewPatientChange("nom", e.target.value)
                          }
                          placeholder="Entrez le nom"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-patient-cin">CIN *</Label>
                        <Input
                          id="new-patient-cin"
                          type="text"
                          value={newPatientData.CIN || ""}
                          onChange={(e) =>
                            handleNewPatientChange(
                              "CIN",
                              e.target.value.toUpperCase(),
                            )
                          }
                          placeholder="Ex: B1234567"
                          disabled={isSubmitting}
                        />
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
                            handleNewPatientChange(
                              "numero_telephone",
                              e.target.value,
                            )
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
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Appointment Type */}
          <div className="space-y-2">
            <Label htmlFor="sujet" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Type de rendez-vous
            </Label>
            <Select
              value={formData.sujet}
              onValueChange={(value) => handleInputChange("sujet", value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le type de rendez-vous" />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time Slot Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Date et heure du rendez-vous
            </Label>
            <TimeSlotPicker
              value={formData.date_rendez_vous}
              onChange={(datetime) =>
                handleInputChange("date_rendez_vous", datetime)
              }
              excludeAppointmentId={appointment?.id}
              disabled={isSubmitting}
            />
          </div>

          {/* Cabinet */}
          <div className="space-y-2">
            <Label htmlFor="cabinet" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Cabinet
            </Label>
            <Select
              value={formData.Cabinet}
              onValueChange={(value) => handleInputChange("Cabinet", value)}
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

          {/* Soin */}
          <div className="space-y-2">
            <Label htmlFor="soin" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Soin
            </Label>
            <Select
              value={formData.soin_id ? String(formData.soin_id) : "0"}
              onValueChange={(value) => {
                const id = parseInt(value, 10) || 0;
                handleInputChange("soin_id", id);
                const selected = soins.find((s) => s.id === id);
                if (selected && selected.Cabinet) {
                  // auto-fill cabinet from soin
                  handleInputChange("Cabinet", selected.Cabinet);
                }
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un soin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Aucun</SelectItem>
                {soins
                  .filter(
                    (s) => !formData.Cabinet || s.Cabinet === formData.Cabinet,
                  )
                  .map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.Nom}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Created By */}
          <div className="space-y-2">
            <Label htmlFor="Cree_par" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Créé par
            </Label>
            <Select
              value={formData.Cree_par}
              onValueChange={(value) => handleInputChange("Cree_par", value)}
              disabled={true}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le médecin" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(users) && users.length > 0 ? (
                  users.map((user) => (
                    <SelectItem key={user.CIN} value={user.CIN}>
                      {user.nom}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-500">
                    Aucun médecin trouvé
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                handleInputChange(
                  "status",
                  value as AppointmentFormData["status"],
                )
              }
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

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {isEditMode ? "Modification..." : "Création..."}
                </div>
              ) : isEditMode ? (
                "Modifier"
              ) : (
                "Créer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
