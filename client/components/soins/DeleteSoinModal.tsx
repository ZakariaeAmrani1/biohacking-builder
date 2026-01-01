import { AlertTriangle, Stethoscope, Euro, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Soin, formatPrice, getSoinTypeColor } from "@/services/soinsService";

interface DeleteSoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  soin: Soin | null;
  isLoading?: boolean;
}

export default function DeleteSoinModal({
  isOpen,
  onClose,
  onConfirm,
  soin,
  isLoading = false,
}: DeleteSoinModalProps) {
  if (!soin) return null;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      // Error is handled by parent component
    }
  };

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Supprimer le soin
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Le service sera définitivement
            supprimé.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Attention:</strong> Cette action ne peut pas être annulée.
              Ce service ne sera plus disponible dans le système.
            </AlertDescription>
          </Alert>

          {/* Soin details */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Service à supprimer:</span>
            </div>

            <div className="space-y-2 ml-7">
              <div>
                <span className="text-sm font-medium">Nom:</span>
                <span className="ml-2">{soin.Nom}</span>
              </div>

              <div>
                <span className="text-sm font-medium">ID:</span>
                <span className="ml-2 font-mono">#{soin.id}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Type:</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSoinTypeColor(soin.Type)}`}
                >
                  {soin.Type}
                </span>
              </div>

              <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                <span className="text-sm font-medium">Prix:</span>
                <div className="font-mono font-bold text-blue-700 dark:text-blue-300">
                  {formatPrice(soin.prix)}
                </div>
              </div>

              <div>
                <span className="text-sm font-medium">Créé par:</span>
                <span className="ml-2">{soin.Cree_par}</span>
              </div>

              <div>
                <span className="text-sm font-medium">Date de création:</span>
                <span className="ml-2">{formatDate(soin.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg">
            <div className="text-sm">
              <span className="font-medium text-yellow-700 dark:text-yellow-300">
                Impact de la suppression:
              </span>
              <div className="mt-1 text-yellow-600 dark:text-yellow-400">
                • Ce service ne sera plus disponible pour de nouveaux
                rendez-vous
                <br />
                • Les rendez-vous existants utilisant ce service ne seront pas
                affectés
                <br />• Cette action ne peut pas être annulée
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer ce service ?
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Suppression...
              </div>
            ) : (
              "Supprimer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
