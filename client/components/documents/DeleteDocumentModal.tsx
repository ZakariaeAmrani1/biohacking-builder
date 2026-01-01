import { AlertTriangle, FileText, User, Calendar, Hash } from "lucide-react";
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
import { Document } from "@/services/documentsService";
import { DocumentTemplate } from "@/services/documentTemplatesService";

interface DeleteDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  document: Document | null;
  template: DocumentTemplate | null;
  isLoading?: boolean;
}

export default function DeleteDocumentModal({
  isOpen,
  onClose,
  onConfirm,
  document,
  template,
  isLoading = false,
}: DeleteDocumentModalProps) {
  if (!document) return null;

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

  const getDataFieldsCount = () => {
    return Object.keys(document.data_json).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Supprimer le document
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Le document sera définitivement
            supprimé.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Attention:</strong> Cette action ne peut pas être annulée.
              Toutes les données de ce document seront perdues.
            </AlertDescription>
          </Alert>

          {/* Document details */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Document à supprimer:</span>
            </div>

            <div className="space-y-2 ml-7">
              <div>
                <span className="text-sm font-medium">ID:</span>
                <span className="ml-2 font-mono">#{document.id}</span>
              </div>

              <div>
                <span className="text-sm font-medium">Type:</span>
                <span className="ml-2">
                  {template?.name || "Modèle inconnu"}
                </span>
              </div>

              <div>
                <span className="text-sm font-medium">Patient (CIN):</span>
                <span className="ml-2 font-mono">{document.CIN}</span>
              </div>

              <div>
                <span className="text-sm font-medium">Créé par:</span>
                <span className="ml-2">{document.Cree_par}</span>
              </div>

              <div>
                <span className="text-sm font-medium">Date de création:</span>
                <span className="ml-2">{formatDate(document.created_at)}</span>
              </div>

              <div>
                <span className="text-sm font-medium">Données:</span>
                <span className="ml-2">
                  {getDataFieldsCount()} champ(s) rempli(s)
                </span>
              </div>
            </div>
          </div>

          {/* Template information if available */}
          {template && (
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
              <div className="text-sm">
                <span className="font-medium">Modèle:</span> {template.name}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Le modèle de document ne sera pas affecté par cette suppression
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer ce document ?
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
