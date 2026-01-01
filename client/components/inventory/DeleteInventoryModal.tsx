import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { InventoryMovement } from "@/services/inventoryService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  movement: InventoryMovement | null;
  isLoading?: boolean;
}

export default function DeleteInventoryModal({
  isOpen,
  onClose,
  onConfirm,
  movement,
  isLoading,
}: Props) {
  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer le mouvement</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p>Êtes-vous sûr de vouloir supprimer ce mouvement d'inventaire ?</p>
          {movement && (
            <p className="text-sm text-muted-foreground">
              [{movement.movementType}] {movement.nom_bien} ×{" "}
              {movement.quantite}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
