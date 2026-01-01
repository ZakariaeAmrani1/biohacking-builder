import { useState, useEffect } from "react";
import { Package, AlertTriangle, User, Euro, Hash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ProductFormData,
  Product,
  validateProductData,
  getAvailableDoctors,
  createEmptyProduct,
} from "@/services/productsService";
import { Utilisateur } from "@/services/clientsService";
import { AuthService } from "@/services/authService";
import { CurrencyService } from "@/services/currencyService";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => Promise<void>;
  product?: Product | null;
  isLoading?: boolean;
  users: Utilisateur[] | null;
}

export default function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  product,
  isLoading = false,
  users,
}: ProductFormModalProps) {
  const [formData, setFormData] =
    useState<ProductFormData>(createEmptyProduct());
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!product;
  const availableDoctors = getAvailableDoctors();
  const [currencySymbol, setCurrencySymbol] = useState<string>(
    CurrencyService.getCurrentSymbol(),
  );

  useEffect(() => {
    const handleCurrencyChange = () => {
      setCurrencySymbol(CurrencyService.getCurrentSymbol());
    };
    window.addEventListener("currencyChanged", handleCurrencyChange as EventListener);
    return () => {
      window.removeEventListener(
        "currencyChanged",
        handleCurrencyChange as EventListener,
      );
    };
  }, []);

  // Initialize form data when product changes
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (product) {
      setFormData({
        Nom: product.Nom,
        prix: product.prix,
        stock: product.stock,
        Cree_par: product.Cree_par || user.CIN,
      });
    } else {
      setFormData(createEmptyProduct(user.CIN));
    }
    setErrors([]);
  }, [product, isOpen]);

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateProductData(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors(
        Array.isArray(error?.response?.data?.message) &&
          error.response.data.message.length > 0
          ? error.response.data.message
          : [
              error?.response?.data?.message ??
                "Une erreur s'est produite lors de l'enregistrement",
            ],
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEditMode ? "Modifier le produit" : "Nouveau produit"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifiez les informations du produit"
              : "Créez un nouveau produit en remplissant les informations ci-dessous"}
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="nom" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Nom du produit
            </Label>
            <Input
              id="nom"
              value={formData.Nom}
              onChange={(e) => handleInputChange("Nom", e.target.value)}
              placeholder="Ex: Paracétamol 500mg"
              disabled={isSubmitting}
            />
          </div>

          {/* Price and Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prix" className="flex items-center gap-2">
                <Euro className="h-4 w-4" />
                {`Prix (${currencySymbol})`}
              </Label>
              <Input
                id="prix"
                type="number"
                step="0.01"
                min="0"
                value={formData.prix || ""}
                onChange={(e) =>
                  handleInputChange("prix", parseFloat(e.target.value) || 0)
                }
                placeholder={CurrencyService.getCurrencyPlaceholder()}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Stock (unités)
              </Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock || ""}
                onChange={(e) =>
                  handleInputChange("stock", parseInt(e.target.value) || 0)
                }
                placeholder="0"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Creator */}
          <div className="space-y-2">
            <Label htmlFor="Cree_par" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Créé par
            </Label>
            <Select
              value={formData.Cree_par}
              onValueChange={(value) => handleInputChange("Cree_par", value)}
              disabled={true}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le créateur" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(users) && users.length > 0 ? (
                  users.map((user) => (
                    <SelectItem key={user.CIN} value={user.CIN}>
                      {user.nom}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-500">
                    Aucun médecin trouvé
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {isEditMode ? "Modification..." : "Création..."}
                </div>
              ) : isEditMode ? (
                "Modifier"
              ) : (
                "Créer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
