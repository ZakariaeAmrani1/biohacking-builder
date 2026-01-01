import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScannedDocument } from "@/services/scannedDocumentsService";
import { FileText } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: ScannedDocument | null;
}

export default function ScannedDocumentViewerModal({ isOpen, onClose, document }: Props) {
  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {document.title}
          </DialogTitle>
          <DialogDescription>{document.description || "Aperçu du PDF"}</DialogDescription>
        </DialogHeader>
        <div className="h-[70vh]">
          {document.file_url ? (
            <iframe src={document.file_url} title={document.title} className="w-full h-full rounded-md border" />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">Aucun aperçu disponible</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
