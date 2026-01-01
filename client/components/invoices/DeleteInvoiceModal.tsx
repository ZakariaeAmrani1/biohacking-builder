import {
  AlertTriangle,
  Receipt,
  Euro,
  Hash,
  Package,
  Stethoscope,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  FactureWithDetails,
  formatPrice,
  getStatusColor,
  TypeBien,
} from "@/services/invoicesService";

interface DeleteInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  invoice: FactureWithDetails | null;
  isLoading?: boolean;
}

export default function DeleteInvoiceModal({
  isOpen,
  onClose,
  onConfirm,
  invoice,
  isLoading = false,
}: DeleteInvoiceModalProps) {
  if (!invoice) return null;

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

  const isPaidInvoice = invoice.statut === "Payée";
  const hasItems = invoice.items.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Supprimer la facture
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. La facture sera définitivement
            supprimée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Attention:</strong> Cette action ne peut pas être annulée.
              {isPaidInvoice && (
                <span className="block mt-1">
                  <strong>Cette facture a été payée.</strong> Sa suppression
                  pourrait affecter votre comptabilité.
                </span>
              )}
              {hasItems && (
                <span className="block mt-1">
                  Cette facture contient {invoice.items.length} article(s) pour
                  un montant de {formatPrice(invoice.prix_total)}.
                </span>
              )}
            </AlertDescription>
          </Alert>

          {/* Invoice details */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Facture à supprimer:</span>
            </div>

            <div className="space-y-3 ml-7">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Facture:</span>
                <span className="font-mono">
                  #{invoice.id.toString().padStart(4, "0")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Patient:</span>
                <span className="font-mono">{invoice.CIN}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Statut:</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.statut)}`}
                >
                  {invoice.statut}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Date:</span>
                <span>
                  {new Date(invoice.date).toLocaleDateString("fr-FR")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Créé par:</span>
                <span>{invoice.Cree_par}</span>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Montant total:</span>
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-300 text-lg">
                    {formatPrice(invoice.prix_total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Summary */}
          {hasItems && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg">
              <div className="text-sm">
                <span className="font-medium text-yellow-700 dark:text-yellow-300">
                  Articles inclus dans cette facture:
                </span>
                <div className="mt-2 space-y-2">
                  {invoice.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs bg-white/50 dark:bg-black/20 p-2 rounded"
                    >
                      <div className="flex items-center gap-2">
                        {item.type_bien === TypeBien.PRODUIT ? (
                          <Package className="h-3 w-3" />
                        ) : (
                          <Stethoscope className="h-3 w-3" />
                        )}
                        <span>{item.nom_bien}</span>
                        <Badge variant="outline" className="text-xs px-1">
                          {item.type_bien === TypeBien.PRODUIT
                            ? "Produit"
                            : "Soin"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span>{item.quantite}x</span>
                        <span>{formatPrice(item.prix_unitaire)}</span>
                        <span>=</span>
                        <span className="font-semibold">
                          {formatPrice(item.prix_unitaire * item.quantite)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Warning for paid invoices */}
          {isPaidInvoice && (
            <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
              <div className="text-sm">
                <span className="font-medium text-red-700 dark:text-red-300">
                  ⚠️ Facture payée:
                </span>
                <div className="mt-1 text-red-600 dark:text-red-400">
                  Cette facture a le statut "Payée". Sa suppression pourrait
                  créer des incohérences dans votre comptabilité. Assurez-vous
                  que cette action est nécessaire et documentez-la en
                  conséquence.
                </div>
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer cette facture ?
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
