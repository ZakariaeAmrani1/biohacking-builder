import {
  Users,
  User,
  FileText,
  Clock,
  Mail,
  Phone,
  MapPin,
  Heart,
  Stethoscope,
  AlertTriangle,
  UserCheck,
  Calendar,
  Edit,
  Trash2,
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
import { Client, Utilisateur, calculateAge } from "@/services/clientsService";

interface ClientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onEdit?: (client: Client) => void;
  onDelete?: (client: Client) => void;
  users: Utilisateur[] | null;
}

export default function ClientDetailsModal({
  isOpen,
  onClose,
  client,
  onEdit,
  onDelete,
  users,
}: ClientDetailsModalProps) {
  if (!client) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(client);
    }
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(client);
    }
    onClose();
  };

  const getUserName = (CIN: string) => {
    const user = users.find((user) => user.CIN === CIN);
    return user.nom || CIN;
  };

  const age = calculateAge(client.date_naissance);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Dossier Patient
          </DialogTitle>
          <DialogDescription>
            Informations complètes du patient #{client.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">
              {client.prenom} {client.nom}
            </h2>
            <div className="flex justify-center gap-4 text-sm text-muted-foreground">
              <span>CIN: {client.CIN}</span>
              <span>•</span>
              <span>{age} ans</span>
              <span>•</span>
              <Badge variant="outline" className="gap-1">
                <Heart className="h-3 w-3" />
                {client.groupe_sanguin}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations Personnelles
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
              <div>
                <Label>Date de naissance</Label>
                <Value className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(client.date_naissance)} ({age} ans)
                </Value>
              </div>
              <div>
                <Label>Groupe sanguin</Label>
                <Value className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  {client.groupe_sanguin}
                </Value>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Informations de Contact
            </h3>

            <div className="space-y-3 pl-7">
              <div>
                <Label>Adresse</Label>
                <Value className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {client.adresse}
                </Value>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Téléphone</Label>
                  <Value className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <a
                      href={`tel:${client.numero_telephone}`}
                      className="text-primary hover:underline"
                    >
                      {client.numero_telephone}
                    </a>
                  </Value>
                </div>
                <div>
                  <Label>Email</Label>
                  <Value className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <a
                      href={`mailto:${client.email}`}
                      className="text-primary hover:underline"
                    >
                      {client.email}
                    </a>
                  </Value>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Medical Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Informations Médicales
            </h3>

            <div className="space-y-4 pl-7">
              <div>
                <Label>Antécédents médicaux</Label>
                <Value className="whitespace-pre-wrap">
                  {client.antecedents || "Aucun antécédent médical renseigné"}
                </Value>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Allergies
                </Label>
                <Value className="whitespace-pre-wrap">
                  {client.allergies || "Aucune allergie connue"}
                </Value>
              </div>

              {client.commentaire && (
                <div>
                  <Label>Commentaires</Label>
                  <Value className="whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                    {client.commentaire}
                  </Value>
                </div>
              )}
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
                <Label>Créé par</Label>
                <Value className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  {getUserName(client.Cree_par)}
                </Value>
              </div>
              <div>
                <Label>Date de création</Label>
                <Value className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatDateTime(client.created_at)}
                </Value>
              </div>
            </div>
          </div>

          {/* Footer Information */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>ID du patient: #{client.id}</span>
              <span>
                Ajouté le{" "}
                {new Date(client.created_at).toLocaleDateString("fr-FR")}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>

          {onEdit && (
            <Button variant="outline" onClick={handleEdit} className="gap-2">
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          )}

          {onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper components for consistent styling
function Label({
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

function Value({
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
