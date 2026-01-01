import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  InventoryFormData,
  InventoryMovement,
  MovementType,
} from "@/services/inventoryService";
import { Product } from "@/services/productsService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InventoryFormData) => Promise<void>;
  isLoading?: boolean;
  products: Product[];
  movement?: InventoryMovement | null;
  initialType?: MovementType;
}

const toLocalDateTime = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function InventoryFormModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  products,
  movement,
  initialType,
}: Props) {
  const [movementType, setMovementType] = useState<MovementType>(
    initialType || "IN",
  );
  const [id_bien, setIdBien] = useState<number>(0);
  const [quantite, setQuantite] = useState<number>(1);
  const [prix, setPrix] = useState<number>(0);
  const [date, setDate] = useState<string>(toLocalDateTime());

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === id_bien) || null,
    [products, id_bien],
  );

  useEffect(() => {
    if (movement) {
      setMovementType(movement.movementType);
      setIdBien(movement.id_bien);
      setQuantite(movement.quantite);
      setPrix(movement.prix);
      setDate(toLocalDateTime(movement.date));
    } else {
      setMovementType(initialType || "IN");
      setIdBien(0);
      setQuantite(1);
      setPrix(0);
      setDate(toLocalDateTime());
    }
  }, [movement, isOpen, initialType]);

  // Default price from product on selection (user can edit later)
  useEffect(() => {
    if (!movement && selectedProduct) {
      setPrix(selectedProduct.prix);
    }
  }, [selectedProduct, movement]);

  const qtyOk =
    movementType === "IN" ||
    (selectedProduct ? quantite <= selectedProduct.stock : false);
  const canSubmit = id_bien > 0 && quantite > 0 && prix > 0 && qtyOk;

  const title = movement
    ? `Modifier Mouvement ${movementType}`
    : "Nouveau Mouvement";

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit({ id_bien, quantite, prix, date, movementType });
  };

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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4`}>
            {/* {movement && (
              <div className="space-y-2">
                <Label>Type de mouvement</Label>
                <Select
                  value={movementType}
                  onValueChange={(v) => setMovementType(v as MovementType)}
                  disabled={!!movement}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Entrant</SelectItem>
                    <SelectItem value="OUT">Sortant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )} */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Produit</Label>
              <Select
                value={id_bien ? String(id_bien) : ""}
                onValueChange={(v) => setIdBien(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.Nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedProduct && (
            <div className="text-sm text-muted-foreground">
              Stock actuel:{" "}
              <span className="font-medium">{selectedProduct.stock}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantité</Label>
              <Input
                type="number"
                min={1}
                value={quantite}
                onChange={(e) => setQuantite(Number(e.target.value))}
              />
              {movementType === "OUT" &&
                selectedProduct &&
                quantite > selectedProduct.stock && (
                  <p className="text-xs text-red-600">
                    Quantité supérieure au stock disponible
                  </p>
                )}
            </div>
            <div className="space-y-2">
              <Label>Prix Unitaire</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={prix}
                onChange={(e) => setPrix(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isLoading}>
            {movement ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
