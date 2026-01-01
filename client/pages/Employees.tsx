import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableLoader } from "@/components/ui/table-loader";
import { useToast } from "@/components/ui/use-toast";
import {
  Users as UsersIcon,
  Search,
  Plus,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  Shield,
} from "lucide-react";
import EmployeeFormModal from "@/components/employees/EmployeeFormModal";
import EmployeeDetailsModal from "@/components/employees/EmployeeDetailsModal";
import DeleteEmployeeModal from "@/components/employees/DeleteEmployeeModal";
import {
  EmployeesService,
  Employee,
  EmployeeCreateData,
  EmployeeUpdateData,
} from "@/services/employeesService";
import { UserService } from "@/services/userService";

export default function Employees() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("tous");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roles = UserService.getAvailableRoles();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const data = await EmployeesService.getAll();
      setEmployees(data);
    } catch (e) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les employés",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const s = searchTerm.toLowerCase();
      const matchesSearch =
        e.nom.toLowerCase().includes(s) ||
        e.prenom.toLowerCase().includes(s) ||
        e.CIN.toLowerCase().includes(s) ||
        e.email.toLowerCase().includes(s);
      const matchesRole = roleFilter === "tous" || e.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [employees, searchTerm, roleFilter]);

  const openCreate = () => {
    setSelectedEmployee(null);
    setIsFormModalOpen(true);
  };
  const openEdit = (emp: Employee) => {
    closeModals();
    setTimeout(() => {
      setSelectedEmployee(emp);
      setIsFormModalOpen(true);
    }, 100);
  };
  const openDetails = (emp: Employee) => {
    closeModals();
    setTimeout(() => {
      setSelectedEmployee(emp);
      setIsDetailsModalOpen(true);
    }, 100);
  };
  const openDelete = (emp: Employee) => {
    closeModals();
    setTimeout(() => {
      setSelectedEmployee(emp);
      setIsDeleteModalOpen(true);
    }, 100);
  };

  const closeForm = () => {
    setIsFormModalOpen(false);
    setSelectedEmployee(null);
  };
  const closeDetails = () => {
    setIsDetailsModalOpen(false);
    setSelectedEmployee(null);
  };
  const closeDelete = () => {
    setIsDeleteModalOpen(false);
    setSelectedEmployee(null);
  };
  const closeModals = () => {
    setIsFormModalOpen(false);
    setIsDetailsModalOpen(false);
    setIsDeleteModalOpen(false);
  };

  const handleCreate = async (data: EmployeeCreateData) => {
    try {
      setIsSubmitting(true);
      await EmployeesService.create(data);
      await loadEmployees();
      closeForm();
      toast({
        title: "Succès",
        description: "L'employé a été créé avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description:
          error?.response?.data?.message || "Impossible de créer l'employé",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: EmployeeUpdateData) => {
    if (!selectedEmployee) return;
    try {
      setIsSubmitting(true);
      await EmployeesService.update(selectedEmployee.id, data);
      await loadEmployees();
      closeForm();
      toast({
        title: "Succès",
        description: "L'employé a été modifié avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description:
          error?.response?.data?.message || "Impossible de modifier l'employé",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    try {
      setIsSubmitting(true);
      await EmployeesService.delete(selectedEmployee.id);
      await loadEmployees();
      closeDelete();
      toast({
        title: "Succès",
        description: "L'employé a été supprimé avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description:
          error?.response?.data?.message || "Impossible de supprimer l'employé",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Employés</h1>
            <p className="text-muted-foreground">
              Gestion des utilisateurs de l'application
            </p>
          </div>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvel Employé
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Rechercher et Filtrer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, CIN, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les rôles</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {isLoading ? (
                <TableLoader columns={6} rows={6} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employé</TableHead>
                      <TableHead>CIN</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Créé le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length > 0 ? (
                      filtered.map((emp) => (
                        <TableRow key={emp.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {emp.prenom} {emp.nom}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {emp.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {emp.CIN}
                          </TableCell>
                          <TableCell className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            {UserService.getRoleDisplayName(emp.role)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{emp.numero_telephone}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {emp.created_at ? formatDate(emp.created_at) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => openDetails(emp)}
                                >
                                  <Eye className="h-4 w-4" />
                                  Voir profil
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => openEdit(emp)}
                                >
                                  <Edit className="h-4 w-4" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-red-600"
                                  onClick={() => openDelete(emp)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <UsersIcon className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              Aucun employé trouvé
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        <EmployeeFormModal
          isOpen={isFormModalOpen}
          onClose={closeForm}
          onSubmit={
            selectedEmployee
              ? (d) => handleUpdate(d as EmployeeUpdateData)
              : (d) => handleCreate(d as EmployeeCreateData)
          }
          employee={selectedEmployee}
          isLoading={isSubmitting}
        />

        <EmployeeDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={closeDetails}
          employee={selectedEmployee}
          onEdit={openEdit}
          onDelete={openDelete}
        />

        <DeleteEmployeeModal
          isOpen={isDeleteModalOpen}
          onClose={closeDelete}
          onConfirm={handleDelete}
          employee={selectedEmployee}
          isLoading={isSubmitting}
        />
      </div>
    </DashboardLayout>
  );
}
