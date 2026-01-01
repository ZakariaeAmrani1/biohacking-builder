import {
  Stethoscope,
  User,
  Clock,
  Edit,
  Trash2,
  Euro,
  Tag,
  Building2,
  Activity,
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Soin, formatPrice, getSoinTypeColor } from "@/services/soinsService";
import { Utilisateur } from "@/services/clientsService";

const cabinetColors: Record<string, string> = {
  Biohacking: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Nassens: "bg-purple-100 text-purple-700 border-purple-200",
};

interface SoinDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soin: Soin | null;
  onEdit: (soin: Soin) => void;
  onDelete: (soin: Soin) => void;
  users: Utilisateur[] | null;
}

export default function SoinDetailsModal({
  isOpen,
  onClose,
  soin,
  onEdit,
  onDelete,
  users,
}: SoinDetailsModalProps) {
  if (!soin) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeDescription = (type: string): string => {
    switch (type) {
      case "Consultation":
        return "Rendez-vous médical pour examen et diagnostic";
      case "Diagnostic":
        return "Procédures d'examen et d'analyse médicale";
      case "Préventif":
        return "Soins de prévention et de santé publique";
      case "Thérapeutique":
        return "Traitements et interventions curatives";
      case "Chirurgie":
        return "Interventions chirurgicales et opérations";
      case "Rééducation":
        return "Soins de rééducation et physiothérapie";
      case "Urgence":
        return "Soins d'urgence et interventions immédiates";
      case "Suivi":
        return "Consultations de suivi et contrôle";
      default:
        return "Service médical spécialisé";
    }
  };

  const getUserName = (CIN: string) => {
    const user = users?.find((user) => user.CIN === CIN);
    return user?.nom || CIN;
  };

  const getTherapeuteName = (cin?: string | null) => {
    if (!cin) return "Non assigné";
    const user = users?.find((user) => user.CIN === cin);
    return user?.nom || cin;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Détails du soin
          </DialogTitle>
          <DialogDescription>
            Informations complètes sur ce service médical
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Soin Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{soin.Nom}</h3>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSoinTypeColor(soin.Type)}`}
              >
                {soin.Type}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">ID: {soin.id}</p>
          </div>

          <Separator />

          {/* Service Information */}
          <div className="space-y-4">
            <h4 className="font-medium">Informations du service</h4>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{soin.Type}</div>
                  <div className="text-sm text-muted-foreground">
                    {getTypeDescription(soin.Type)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Prix du service</div>
                  <div className="text-2xl font-bold text-primary">
                    {formatPrice(soin.prix)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Cabinet</div>
                  <div className="mt-1">
                    <Badge
                      variant="secondary"
                      className={
                        cabinetColors[soin.Cabinet || ""] ||
                        "bg-amber-100 text-amber-700 border-amber-200"
                      }
                    >
                      {soin.Cabinet}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Information tarifaire
              </div>
              <div className="text-xs text-muted-foreground">
                Prix affiché hors taxes et frais supplémentaires éventuels. Le
                tarif peut varier selon la complexité de l'intervention.
              </div>
            </div>
          </div>

          <Separator />

          {/* Administrative Information */}
          <div className="space-y-3">
            <h4 className="font-medium">Informations administratives</h4>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Créé par:</span>
                <span>{getUserName(soin.Cree_par)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Thérapeute:</span>
                <span>{getTherapeuteName(soin.therapeute)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Date de création:</span>
                <span>{formatDate(soin.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Service Category Info */}
          <div className="p-3 border rounded-lg">
            <h5 className="font-medium mb-2">À propos de cette catégorie</h5>
            <div className="space-y-2 text-sm">
              <div className="text-muted-foreground">
                {getTypeDescription(soin.Type)}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>• Catégorie: {soin.Type}</span>
                <span>• Code: {soin.id.toString().padStart(4, "0")}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant="outline"
            onClick={() => onEdit(soin)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Modifier
          </Button>
          <Button
            variant="destructive"
            onClick={() => onDelete(soin)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
