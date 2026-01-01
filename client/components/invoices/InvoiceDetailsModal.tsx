import {
  Receipt,
  User,
  Clock,
  Edit,
  Trash2,
  Euro,
  Calendar,
  FileText,
  Package,
  Stethoscope,
  Hash,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  FactureWithDetails,
  formatPrice,
  getStatusColor,
  TypeBien,
} from "@/services/invoicesService";
import { Utilisateur } from "@/services/clientsService";

interface InvoiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: FactureWithDetails | null;
  onEdit: (invoice: FactureWithDetails) => void;
  onDelete: (invoice: FactureWithDetails) => void;
  users: Utilisateur[] | null;
}

export default function InvoiceDetailsModal({
  isOpen,
  onClose,
  invoice,
  onEdit,
  onDelete,
  users,
}: InvoiceDetailsModalProps) {
  if (!invoice) return null;

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

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getItemIcon = (type: TypeBien) => {
    return type === TypeBien.PRODUIT ? (
      <Package className="h-4 w-4 text-blue-600" />
    ) : (
      <Stethoscope className="h-4 w-4 text-green-600" />
    );
  };

  const getItemTypeLabel = (type: TypeBien) => {
    return type === TypeBien.PRODUIT ? "Produit" : "Soin";
  };

  const getUserName = (CIN: string) => {
    const user = users.find((user) => user.CIN === CIN);
    return user.nom || CIN;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Détails de la facture
          </DialogTitle>
          <DialogDescription>
            Informations complètes sur cette facture
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">
                Facture #{invoice.id.toString().padStart(4, "0")}
              </h3>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.statut)}`}
              >
                {invoice.statut}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Patient
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-mono">{invoice.CIN}</span>
                  {invoice.patient_name && (
                    <span className="text-muted-foreground">
                      ({invoice.patient_name})
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Date de la facture
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDateOnly(invoice.date)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Créé par
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {getUserName(invoice.Cree_par)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Date de création
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatDate(invoice.created_at)}
                </div>
              </div>

              {invoice.date_paiement && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Date de paiement
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(invoice.date_paiement)}
                  </div>
                </div>
              )}

              {invoice.methode_paiement && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Méthode de paiement
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{invoice.methode_paiement}</span>
                  </div>
                </div>
              )}

              {invoice.methode_paiement === "Par chéque" && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Détails du chèque
                  </div>
                  <div className="flex flex-col gap-1">
                    {invoice.cheque_numero && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Numéro:</span>
                        <span className="font-mono">{invoice.cheque_numero}</span>
                      </div>
                    )}
                    {invoice.cheque_banque && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Banque:</span>
                        <span>{invoice.cheque_banque}</span>
                      </div>
                    )}
                    {invoice.cheque_date_tirage && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Date de tirage:</span>
                        <span>{formatDateOnly(invoice.cheque_date_tirage)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {invoice.notes && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Notes
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5" />
                  <div className="text-sm bg-muted p-3 rounded-lg flex-1">
                    {invoice.notes}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Invoice Items */}
          <div className="space-y-4">
            <h4 className="font-medium">Articles facturés</h4>

            {invoice.items.length > 0 ? (
              <div className="space-y-3">
                {invoice.items.map((item, index) => (
                  <Card
                    key={item.id}
                    className="border-l-4 border-l-primary/20"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getItemIcon(item.type_bien)}
                            <span className="font-medium">{item.nom_bien}</span>
                            <Badge variant="outline" className="text-xs">
                              {getItemTypeLabel(item.type_bien)}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Quantité:
                              </span>
                              <div className="font-mono">{item.quantite}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Prix unitaire:
                              </span>
                              <div className="font-mono">
                                {formatPrice(item.prix_unitaire)}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Total ligne:
                              </span>
                              <div className="font-mono font-semibold">
                                {formatPrice(
                                  item.prix_unitaire * item.quantite,
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Total Section with TVA breakdown */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Total ({invoice.items.length} article
                      {invoice.items.length > 1 ? "s" : ""})
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Sous-total (HT):</span>
                        <span className="font-mono font-medium">
                          {formatPrice(invoice.prix_total / 1.2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>TVA ({invoice.tva_rate || 20}%):</span>
                        <span className="font-mono font-medium">
                          {formatPrice(
                            invoice.prix_total - invoice.prix_total / 1.2,
                          )}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold">Total TTC:</div>
                        <div className="text-3xl font-bold text-primary font-mono">
                          {formatPrice(invoice.prix_total)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Aucun article dans cette facture
              </div>
            )}
          </div>

          <Separator />

          {/* Summary Information */}
          <div className="space-y-3">
            <h4 className="font-medium">Résumé</h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">Articles total</div>
                <div className="font-semibold">{invoice.items.length}</div>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground">Produits</div>
                <div className="font-semibold">
                  {
                    invoice.items.filter(
                      (item) => item.type_bien === TypeBien.PRODUIT,
                    ).length
                  }
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground">Soins</div>
                <div className="font-semibold">
                  {
                    invoice.items.filter(
                      (item) => item.type_bien === TypeBien.SOIN,
                    ).length
                  }
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground">Quantité totale</div>
                <div className="font-semibold">
                  {invoice.items.reduce((sum, item) => sum + item.quantite, 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Status Information */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm">
              <span className="font-medium">Statut actuel:</span>
              <span className="ml-2">{invoice.statut}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {invoice.statut === "Brouillon" &&
                "Cette facture est en cours de préparation"}
              {invoice.statut === "Envoyée" &&
                "Cette facture a été envoyée au client"}
              {invoice.statut === "Payée" && "Cette facture a été payée"}
              {invoice.statut === "Annulée" && "Cette facture a été annulée"}
              {invoice.statut === "En retard" &&
                "Le paiement de cette facture est en retard"}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant="outline"
            onClick={() => onEdit(invoice)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Modifier
          </Button>
          <Button
            variant="destructive"
            onClick={() => onDelete(invoice)}
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
