import { Package, User, Clock, Edit, Trash2, Euro, Hash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Product,
  formatPrice,
  getStockStatus,
} from "@/services/productsService";
import { Utilisateur } from "@/services/clientsService";

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  users: Utilisateur[] | null;
}

export default function ProductDetailsModal({
  isOpen,
  onClose,
  product,
  onEdit,
  onDelete,
  users,
}: ProductDetailsModalProps) {
  if (!product) return null;

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

  const getUserName = (CIN: string) => {
    const user = users.find((user) => user.CIN === CIN);
    return user.nom || CIN;
  };

  const stockStatus = getStockStatus(product.stock);
  const totalValue = product.prix * product.stock;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Détails du produit
          </DialogTitle>
          <DialogDescription>
            Informations complètes sur ce produit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{product.Nom}</h3>
              <Badge variant={stockStatus.variant}>{stockStatus.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">ID: {product.id}</p>
          </div>

          <Separator />

          {/* Product Information */}
          <div className="space-y-4">
            <h4 className="font-medium">Informations produit</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Euro className="h-4 w-4" />
                  Prix unitaire
                </div>
                <div className="text-xl font-bold">
                  {formatPrice(product.prix)}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  Stock disponible
                </div>
                <div className="text-xl font-bold">{product.stock} unités</div>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Valeur totale du stock
              </div>
              <div className="text-lg font-bold">{formatPrice(totalValue)}</div>
              <div className="text-xs text-muted-foreground">
                {product.prix} × {product.stock} unités
              </div>
            </div>
          </div>

          <Separator />

          {/* Administrative Information */}
          <div className="space-y-3">
            <h4 className="font-medium">Informations administratives</h4>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Créé par:</span>
                <span>{getUserName(product.Cree_par)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Date de création:</span>
                <span>{formatDate(product.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Stock Analysis */}
          <div className="p-3 border rounded-lg">
            <h5 className="font-medium mb-2">Analyse du stock</h5>
            <div className="space-y-2 text-sm">
              {product.stock === 0 && (
                <div className="text-red-600">
                  ⚠️ Produit en rupture de stock - Réapprovisionnement urgent
                  requis
                </div>
              )}
              {product.stock > 0 && product.stock <= 10 && (
                <div className="text-orange-600">
                  ⚠️ Stock faible - Envisager un réapprovisionnement
                </div>
              )}
              {product.stock > 10 && (
                <div className="text-green-600">✅ Stock suffisant</div>
              )}

              <div className="text-muted-foreground">
                • Seuil d'alerte: 10 unités
                <br />• Valeur par unité: {formatPrice(product.prix)}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant="outline"
            onClick={() => onEdit(product)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Modifier
          </Button>
          <Button
            variant="destructive"
            onClick={() => onDelete(product)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
