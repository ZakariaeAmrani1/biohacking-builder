import { AlertTriangle, Package, Euro, Hash } from "lucide-react";
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
import { Product, formatPrice } from "@/services/productsService";

interface DeleteProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  product: Product | null;
  isLoading?: boolean;
}

export default function DeleteProductModal({
  isOpen,
  onClose,
  onConfirm,
  product,
  isLoading = false,
}: DeleteProductModalProps) {
  if (!product) return null;

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

  const totalValue = product.prix * product.stock;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Supprimer le produit
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Le produit sera définitivement
            supprimé.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Attention:</strong> Cette action ne peut pas être annulée.
              {product.stock > 0 && (
                <span className="block mt-1">
                  Ce produit a un stock de {product.stock} unités d'une valeur
                  de {formatPrice(totalValue)}.
                </span>
              )}
            </AlertDescription>
          </Alert>

          {/* Product details */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Produit à supprimer:</span>
            </div>

            <div className="space-y-2 ml-7">
              <div>
                <span className="text-sm font-medium">Nom:</span>
                <span className="ml-2">{product.Nom}</span>
              </div>

              <div>
                <span className="text-sm font-medium">ID:</span>
                <span className="ml-2 font-mono">#{product.id}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Prix unitaire:</span>
                  <div className="font-mono">{formatPrice(product.prix)}</div>
                </div>

                <div>
                  <span className="text-sm font-medium">Stock:</span>
                  <div className="font-mono">{product.stock} unités</div>
                </div>
              </div>

              {product.stock > 0 && (
                <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                  <span className="text-sm font-medium">Valeur totale:</span>
                  <div className="font-mono font-bold text-yellow-700 dark:text-yellow-300">
                    {formatPrice(totalValue)}
                  </div>
                </div>
              )}

              <div>
                <span className="text-sm font-medium">Créé par:</span>
                <span className="ml-2">{product.Cree_par}</span>
              </div>

              <div>
                <span className="text-sm font-medium">Date de création:</span>
                <span className="ml-2">{formatDate(product.created_at)}</span>
              </div>
            </div>
          </div>

          {product.stock > 0 && (
            <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
              <div className="text-sm">
                <span className="font-medium text-orange-700 dark:text-orange-300">
                  Note importante:
                </span>
                <div className="mt-1 text-orange-600 dark:text-orange-400">
                  Ce produit contient encore {product.stock} unités en stock.
                  Assurez-vous que cette suppression est intentionnelle.
                </div>
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer ce produit ?
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
