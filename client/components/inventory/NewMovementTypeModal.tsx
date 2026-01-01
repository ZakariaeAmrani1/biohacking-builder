import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { MovementType } from "@/services/inventoryService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onChoose: (type: MovementType) => void;
}

export default function NewMovementTypeModal({
  isOpen,
  onClose,
  onChoose,
}: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Choisir le type de mouvement</DialogTitle>
          <DialogDescription>
            Sélectionnez le type de mouvement à créer
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onChoose("IN")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5 text-green-600" />
                Entrant (IN)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Ajouter du stock pour un produit (entrée en stock).
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onChoose("OUT")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-red-600" />
                Sortant (OUT)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Retirer du stock sans facture (sortie libre).
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
