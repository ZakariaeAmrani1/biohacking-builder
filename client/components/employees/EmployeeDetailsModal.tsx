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
  Users,
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Clock,
} from "lucide-react";
import { Employee } from "@/services/employeesService";
import { UserService } from "@/services/userService";

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onEdit?: (employee: Employee) => void;
  onDelete?: (employee: Employee) => void;
}

export default function EmployeeDetailsModal({
  isOpen,
  onClose,
  employee,
  onEdit,
  onDelete,
}: EmployeeDetailsModalProps) {
  if (!employee) return null;

  const roleLabel = UserService.getRoleDisplayName(employee.role);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleEdit = () => {
    if (onEdit) onEdit(employee);
    onClose();
  };
  const handleDelete = () => {
    if (onDelete) onDelete(employee);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Profil Employé
          </DialogTitle>
          <DialogDescription>
            Informations de l'employé #{employee.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">
              {employee.prenom} {employee.nom}
            </h2>
            <div className="flex justify-center gap-3 text-sm text-muted-foreground">
              <span>CIN: {employee.CIN}</span>
              <span>•</span>
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                {roleLabel}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Email
              </div>
              <div className="text-sm mt-1 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {employee.email}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Téléphone
              </div>
              <div className="text-sm mt-1 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {employee.numero_telephone}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Date de naissance
              </div>
              <div className="text-sm mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {employee.date_naissance
                  ? formatDate(employee.date_naissance)
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Créé le
              </div>
              <div className="text-sm mt-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {employee.created_at
                  ? formatDateTime(employee.created_at)
                  : "-"}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          {onEdit && (
            <Button variant="outline" onClick={handleEdit}>
              Modifier
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
