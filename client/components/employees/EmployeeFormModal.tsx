import { useEffect, useState } from "react";
import {
  Users,
  Mail,
  Phone,
  FileText,
  Clock,
  User as UserIcon,
  Shield,
  AlertTriangle,
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
import { UserService } from "@/services/userService";
import {
  Employee,
  EmployeeCreateData,
  EmployeeUpdateData,
  validateEmployeeCreate,
  validateEmployeeUpdate,
} from "@/services/employeesService";

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EmployeeCreateData | EmployeeUpdateData) => Promise<void>;
  employee?: Employee | null;
  isLoading?: boolean;
}

export default function EmployeeFormModal({
  isOpen,
  onClose,
  onSubmit,
  employee,
  isLoading = false,
}: EmployeeFormModalProps) {
  const isEditMode = !!employee;
  const roles = UserService.getAvailableRoles();
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<
    EmployeeCreateData | EmployeeUpdateData
  >({
    CIN: "",
    nom: "",
    prenom: "",
    date_naissance: "",
    adresse: "",
    numero_telephone: "",
    email: "",
    role: "therapeute",
    // create only
    // @ts-ignore
    password: "",
    // @ts-ignore
    confirmPassword: "",
  });

  useEffect(() => {
    if (employee) {
      const birth = employee.date_naissance
        ? new Date(employee.date_naissance).toISOString().slice(0, 10)
        : "";
      setFormData({
        CIN: employee.CIN,
        nom: employee.nom,
        prenom: employee.prenom,
        date_naissance: birth,
        adresse: employee.adresse,
        numero_telephone: employee.numero_telephone,
        email: employee.email,
        role: employee.role,
      } as EmployeeUpdateData);
    } else {
      setFormData({
        CIN: "",
        nom: "",
        prenom: "",
        date_naissance: "",
        adresse: "",
        numero_telephone: "",
        email: "",
        role: "therapeute",
        // @ts-ignore
        password: "",
        // @ts-ignore
        confirmPassword: "",
      } as EmployeeCreateData);
    }
    setErrors([]);
  }, [employee, isOpen]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (errors.length) setErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = isEditMode
      ? validateEmployeeUpdate(formData as EmployeeUpdateData)
      : validateEmployeeCreate(formData as EmployeeCreateData);
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err: any) {
      const msg = Array.isArray(err?.response?.data?.message)
        ? err.response.data.message
        : [err?.response?.data?.message || "Une erreur s'est produite"];
      setErrors(msg);
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isEditMode ? "Modifier l'employé" : "Nouvel employé"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifiez les informations de l'employé"
              : "Créez un nouvel employé"}
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="CIN" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                CIN
              </Label>
              <Input
                id="CIN"
                value={(formData as any).CIN}
                onChange={(e) =>
                  handleChange("CIN", e.target.value.toUpperCase())
                }
                disabled={isEditMode || isSubmitting}
                placeholder="BE123456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input
                id="nom"
                value={(formData as any).nom}
                onChange={(e) => handleChange("nom", e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom</Label>
              <Input
                id="prenom"
                value={(formData as any).prenom}
                onChange={(e) => handleChange("prenom", e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="date_naissance"
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Date de naissance
              </Label>
              <Input
                id="date_naissance"
                type="date"
                value={(formData as any).date_naissance}
                onChange={(e) => handleChange("date_naissance", e.target.value)}
                disabled={isSubmitting}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Rôle
              </Label>
              <Select
                value={(formData as any).role}
                onValueChange={(v) => handleChange("role", v)}
                disabled={isEditMode ? true : isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_telephone">Téléphone</Label>
              <Input
                id="numero_telephone"
                value={(formData as any).numero_telephone}
                onChange={(e) =>
                  handleChange("numero_telephone", e.target.value)
                }
                disabled={isSubmitting}
                placeholder="+212 6 123 45 676"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={(formData as any).email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={isSubmitting}
                placeholder="email@exemple.com"
              />
            </div>
          </div>

          {!isEditMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={(formData as any).password || ""}
                  onChange={(e) => handleChange("password", e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirmer le mot de passe
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={(formData as any).confirmPassword || ""}
                  onChange={(e) =>
                    handleChange("confirmPassword", e.target.value)
                  }
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

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
              className="min-w-[120px]"
            >
              {isSubmitting
                ? isEditMode
                  ? "Modification..."
                  : "Création..."
                : isEditMode
                  ? "Modifier"
                  : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
