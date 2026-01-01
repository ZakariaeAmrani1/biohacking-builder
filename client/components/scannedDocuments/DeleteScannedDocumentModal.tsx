import { AlertTriangle, FileText, User, Calendar, Hash } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScannedDocument } from "@/services/scannedDocumentsService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  document: ScannedDocument | null;
  isLoading?: boolean;
}

export default function DeleteScannedDocumentModal({ isOpen, onClose, onConfirm, document, isLoading = false }: Props) {
  if (!document) return null;

  const handleConfirm = async () => {
    try { await onConfirm(); } catch {}
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Supprimer le document scanné
          </DialogTitle>
          <DialogDescription>Cette action est irréversible. Le document sera définitivement supprimé.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Attention:</strong> Cette action ne peut pas être annulée.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-muted-foreground" /><span className="font-medium">{document.title}</span></div>
            <div className="text-sm"><span className="font-medium">Fichier:</span> <span className="ml-1">{document.filename}</span></div>
            <div className="text-sm"><span className="font-medium">Patient (CIN):</span> <span className="ml-1 font-mono">{document.CIN}</span></div>
            <div className="text-sm"><span className="font-medium">Créé par:</span> <span className="ml-1">{document.Cree_par}</span></div>
            <div className="text-sm"><span className="font-medium">Date de création:</span> <span className="ml-1">{formatDate(document.createdAt)}</span></div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Annuler</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isLoading} className="min-w-[100px]">{isLoading ? (<div className="flex items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Suppression...</div>) : ("Supprimer")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
