import { useState, useEffect } from "react";
import {
  CalendarDays,
  User,
  FileText,
  Clock,
  Stethoscope,
  UserCheck,
  Calendar,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  RendezVous,
  AppointmentsService,
} from "@/services/appointmentsService";
import { ClientsService, Client, Utilisateur } from "@/services/clientsService";

// Calendar appointment interface
interface CalendarAppointment {
  id: number;
  time: string;
  duration: number;
  patient: string;
  treatment: string;
  status: string;
  date: Date;
}

interface CalendarAppointmentModalProps {
  isOpen: boolean;
  onClose: (statusChanged?: boolean) => void;
  appointment: CalendarAppointment | null;
  users: Utilisateur[] | null;
}

const statusColors = {
  programmé: "bg-blue-100 text-blue-700 border-blue-200",
  confirmé: "bg-green-100 text-green-700 border-green-200",
  terminé: "bg-gray-100 text-gray-700 border-gray-200",
  annulé: "bg-red-100 text-red-700 border-red-200",
};

const statusLabels = {
  programmé: "Programmé",
  confirmé: "Confirmé",
  terminé: "Terminé",
  annulé: "Annulé",
};

export default function CalendarAppointmentModal({
  isOpen,
  onClose,
  appointment,
  users,
}: CalendarAppointmentModalProps) {
  const [fullAppointment, setFullAppointment] = useState<RendezVous | null>(
    null,
  );
  const [client, setClient] = useState<Client | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  // Load additional appointment and client data when appointment changes
  useEffect(() => {
    if (appointment && isOpen) {
      // Set initial status from calendar appointment
      setCurrentStatus(appointment.status);
      // Reset client data
      setClient(null);
      setFullAppointment(null);
      // Load additional data in background
      loadAppointmentData();
    }
  }, [appointment, isOpen]);

  const loadAppointmentData = async () => {
    if (!appointment) return;

    try {
      // Get full appointment data
      const aptData = await AppointmentsService.getById(appointment.id);
      if (aptData) {
        setFullAppointment(aptData);

        // Load client data if client_id exists
        if (aptData.client_id) {
          const clientData = await ClientsService.getById(aptData.client_id);
          setClient(clientData);
        }
      }
    } catch (error) {
      console.error("Error loading appointment data:", error);
    }
  };

  const getUserName = (CIN: string) => {
    const user = users.find((user) => user.CIN === CIN);
    if (user && user.nom) return user.nom;
    return CIN;
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!fullAppointment) return;

    try {
      setUpdating(true);

      // Create update data with new status
      const updateData = {
        client_id: fullAppointment.client_id || 0,
        CIN: fullAppointment.CIN,
        sujet: fullAppointment.sujet,
        date_rendez_vous: fullAppointment.date_rendez_vous,
        Cree_par: fullAppointment.Cree_par,
        status: newStatus as "programmé" | "confirmé" | "terminé" | "annulé",
      };

      const updatedAppointment = await AppointmentsService.update(
        fullAppointment.id,
        updateData,
      );
      if (updatedAppointment) {
        setFullAppointment(updatedAppointment);
        setCurrentStatus(newStatus);
        // Notify parent that status changed so it can reload
        onClose(true);
      }
    } catch (error) {
      console.error("Error updating appointment status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Détails du rendez-vous
          </DialogTitle>
          <DialogDescription>
            Rendez-vous #{appointment.id} - {appointment.patient}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Update Section */}
          <div className="space-y-3">
            <Label htmlFor="status">Statut du rendez-vous</Label>
            <Select
              value={currentStatus}
              onValueChange={handleStatusUpdate}
              disabled={updating || !fullAppointment}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="programmé">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    Programmé
                  </div>
                </SelectItem>
                <SelectItem value="confirmé">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Confirmé
                  </div>
                </SelectItem>
                <SelectItem value="terminé">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                    Terminé
                  </div>
                </SelectItem>
                <SelectItem value="annulé">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    Annulé
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {updating && (
              <div className="text-sm text-muted-foreground">
                Mise à jour en cours...
              </div>
            )}
          </div>

          <Separator />

          {/* Patient Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations Patient
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
              <div>
                <FieldLabel>Nom complet</FieldLabel>
                <FieldValue>{appointment.patient}</FieldValue>
              </div>
              <div>
                <FieldLabel>Numéro CIN</FieldLabel>
                <FieldValue className="font-mono">
                  {fullAppointment?.CIN || "Chargement..."}
                </FieldValue>
              </div>
              {client && (
                <>
                  <div>
                    <FieldLabel>Téléphone</FieldLabel>
                    <FieldValue className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {client.numero_telephone}
                    </FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Email</FieldLabel>
                    <FieldValue className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {client.email}
                    </FieldValue>
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel>Adresse</FieldLabel>
                    <FieldValue className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {client.adresse}
                    </FieldValue>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Appointment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Détails du Rendez-vous
            </h3>

            <div className="space-y-3 pl-7">
              <div>
                <FieldLabel>Type de consultation</FieldLabel>
                <FieldValue className="font-medium">
                  {appointment.treatment}
                </FieldValue>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date
                  </FieldLabel>
                  <FieldValue className="text-lg font-medium text-primary">
                    {appointment.date.toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </FieldValue>
                </div>
                <div>
                  <FieldLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Heure
                  </FieldLabel>
                  <FieldValue className="text-lg font-medium text-primary">
                    {appointment.time}
                  </FieldValue>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Administrative Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informations Administratives
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
              <div>
                <FieldLabel>Créé par</FieldLabel>
                <FieldValue className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  {getUserName(fullAppointment?.Cree_par) || "Chargement..."}
                </FieldValue>
              </div>
              <div>
                <FieldLabel>Date de création</FieldLabel>
                <FieldValue>
                  {fullAppointment
                    ? formatDate(fullAppointment.created_at)
                    : "Chargement..."}
                </FieldValue>
              </div>
            </div>
          </div>

          {/* Additional client info if available */}
          {client &&
            (client.groupe_sanguin ||
              client.allergies ||
              client.antecedents) && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Informations Médicales
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-7">
                    {client.groupe_sanguin && (
                      <div>
                        <FieldLabel>Groupe sanguin</FieldLabel>
                        <FieldValue className="font-medium text-red-600">
                          {client.groupe_sanguin}
                        </FieldValue>
                      </div>
                    )}
                    {client.allergies && (
                      <div className="md:col-span-2">
                        <FieldLabel>Allergies</FieldLabel>
                        <FieldValue>{client.allergies}</FieldValue>
                      </div>
                    )}
                    {client.antecedents && (
                      <div className="md:col-span-3">
                        <FieldLabel>Antécédents</FieldLabel>
                        <FieldValue>{client.antecedents}</FieldValue>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

          {/* Footer Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>ID du rendez-vous: #{appointment.id}</span>
              <Badge
                variant="secondary"
                className={
                  statusColors[currentStatus as keyof typeof statusColors]
                }
              >
                {statusLabels[currentStatus as keyof typeof statusLabels]}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper components for consistent styling
function FieldLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-sm font-medium text-muted-foreground ${className}`}>
      {children}
    </div>
  );
}

function FieldValue({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-sm text-foreground mt-1 ${className}`}>
      {children}
    </div>
  );
}
