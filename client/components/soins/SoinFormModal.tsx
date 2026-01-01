import { useState, useEffect } from "react";
import {
  Stethoscope,
  AlertTriangle,
  User,
  Euro,
  Tag,
  Building2,
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
  SoinFormData,
  Soin,
  validateSoinData,
  createEmptySoin,
} from "@/services/soinsService";
import { Utilisateur } from "@/services/clientsService";
import { AuthService } from "@/services/authService";
import { OptionsService } from "@/services/optionsService";
import { CurrencyService } from "@/services/currencyService";
import type { Employee } from "@/services/employeesService";

interface SoinFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SoinFormData) => Promise<void>;
  soin?: Soin | null;
  isLoading?: boolean;
  users: Utilisateur[] | null;
  therapeutes: Employee[];
}

export default function SoinFormModal({
  isOpen,
  onClose,
  onSubmit,
  soin,
  isLoading = false,
  users,
  therapeutes,
}: SoinFormModalProps) {
  const [formData, setFormData] = useState<SoinFormData>(createEmptySoin());
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [soinTypes, setSoinTypes] = useState<string[]>([]);

  const isEditMode = !!soin;
  const [currencySymbol, setCurrencySymbol] = useState<string>(
    CurrencyService.getCurrentSymbol(),
  );

  useEffect(() => {
    const handleCurrencyChange = () => {
      setCurrencySymbol(CurrencyService.getCurrentSymbol());
    };
    window.addEventListener(
      "currencyChanged",
      handleCurrencyChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        "currencyChanged",
        handleCurrencyChange as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    OptionsService.getSoinTypes()
      .then(setSoinTypes)
      .catch(() => setSoinTypes([]));
  }, []);

  // Initialize form data when soin changes
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (soin) {
      setFormData({
        Nom: soin.Nom,
        Type: soin.Type,
        prix: soin.prix,
        Cree_par: soin.Cree_par || user.CIN,
        Cabinet: soin.Cabinet || "Biohacking",
        therapeute: soin.therapeute || "",
      });
    } else {
      setFormData(createEmptySoin(user.CIN));
    }
    setErrors([]);
  }, [soin, isOpen]);

  const handleInputChange = (field: keyof SoinFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateSoinData(formData);
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
            <Stethoscope className="h-5 w-5" />
            {isEditMode ? "Modifier le soin" : "Nouveau soin"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifiez les informations du soin"
              : "Créez un nouveau soin en remplissant les informations ci-dessous"}
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
          {/* Soin Name */}
          <div className="space-y-2">
            <Label htmlFor="nom" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Nom du soin
            </Label>
            <Input
              id="nom"
              value={formData.Nom}
              onChange={(e) => handleInputChange("Nom", e.target.value)}
              placeholder="Ex: Consultation générale"
              disabled={isSubmitting}
            />
          </div>

          {/* Type and Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Type de soin
              </Label>
              <Select
                value={formData.Type}
                onValueChange={(value) => handleInputChange("Type", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez le type" />
                </SelectTrigger>
                <SelectContent>
                  {soinTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          {/* Cabinet */}
          <div className="space-y-2">
            <Label htmlFor="cabinet" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Cabinet
            </Label>
            <Select
              value={formData.Cabinet}
              onValueChange={(value) => handleInputChange("Cabinet", value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le cabinet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Biohacking">Biohacking</SelectItem>
                <SelectItem value="Nassens">Nassens</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Therapeute */}
          <div className="space-y-2">
            <Label htmlFor="therapeute" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Thérapeute
            </Label>
            <Select
              value={formData.therapeute}
              onValueChange={(value) => handleInputChange("therapeute", value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le thérapeute" />
              </SelectTrigger>
              <SelectContent>
                {therapeutes.length > 0 ? (
                  therapeutes.map((employee) => (
                    <SelectItem key={employee.CIN} value={employee.CIN}>
                      {`${employee.prenom} ${employee.nom}`.trim() ||
                        employee.CIN}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-500">
                    Aucun thérapeute disponible
                  </div>
                )}
              </SelectContent>
            </Select>
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
