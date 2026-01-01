import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ScanText } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onChoose: (type: "normal" | "scanned") => void;
}

export default function NewDocumentTypeModal({ isOpen, onClose, onChoose }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Choisir le type de document</DialogTitle>
          <DialogDescription>Sélectionnez le type de document à créer</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onChoose("normal")}> 
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Document normal
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Créer un document basé sur un modèle et remplir le formulaire.
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onChoose("scanned")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ScanText className="h-5 w-5 text-primary" />
                Document scanné (PDF)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Importer un fichier PDF scanné avec les infos du patient.
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
