import { AlertTriangle, FileText } from "lucide-react";
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
import { DocumentTemplate } from "@/services/documentTemplatesService";

interface DeleteDocumentTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  template: DocumentTemplate | null;
  isLoading?: boolean;
}

export default function DeleteDocumentTemplateModal({
  isOpen,
  onClose,
  onConfirm,
  template,
  isLoading = false,
}: DeleteDocumentTemplateModalProps) {
  if (!template) return null;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      // Error is handled by parent component
    }
  };

  const getSectionCount = () => {
    return template.sections_json.sections.length;
  };

  const getFieldCount = () => {
    return template.sections_json.sections.reduce(
      (total, section) => total + section.fields.length,
      0,
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Supprimer le modèle
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Le modèle de document sera
            définitivement supprimé.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Attention:</strong> Cette action ne peut pas être annulée.
              Tous les documents basés sur ce modèle pourraient être affectés.
            </AlertDescription>
          </Alert>

          {/* Template details */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Modèle à supprimer:</span>
            </div>

            <div className="space-y-2 ml-7">
              <div>
                <span className="text-sm font-medium">Nom:</span>
                <span className="ml-2">{template.name}</span>
              </div>

              <div>
                <span className="text-sm font-medium">Créé par:</span>
                <span className="ml-2">{template.Cree_par}</span>
              </div>

              <div>
                <span className="text-sm font-medium">Structure:</span>
                <span className="ml-2">
                  {getSectionCount()} section(s), {getFieldCount()} champ(s)
                </span>
              </div>

              <div>
                <span className="text-sm font-medium">Créé le:</span>
                <span className="ml-2">
                  {new Date(template.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer ce modèle de document ?
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
