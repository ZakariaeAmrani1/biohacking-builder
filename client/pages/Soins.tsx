import { useState, useMemo, useEffect } from "react";
import {
  Stethoscope,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  LayoutGrid,
  Table as TableIcon,
  Clock,
  User,
  Settings,
  Euro,
  TrendingUp,
  Activity,
  BarChart3,
  Building2,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/components/ui/use-toast";
import { TableLoader, GridLoader } from "@/components/ui/table-loader";
import SoinFormModal from "@/components/soins/SoinFormModal";
import SoinDetailsModal from "@/components/soins/SoinDetailsModal";
import DeleteSoinModal from "@/components/soins/DeleteSoinModal";
import {
  SoinsService,
  Soin,
  SoinFormData,
  formatPrice,
  getSoinTypeColor,
  getRevenueStatistics,
} from "@/services/soinsService";
import { OptionsService } from "@/services/optionsService";
import { Utilisateur } from "@/services/clientsService";
import { UserService } from "@/services/userService";
import { EmployeesService } from "@/services/employeesService";
import type { Employee } from "@/services/employeesService";

const cabinetColors: Record<string, string> = {
  Biohacking: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Nassens: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function Soins() {
  const [searchTerm, setSearchTerm] = useState("");
  const [creatorFilter, setCreatorFilter] = useState<string>("tous");
  const [typeFilter, setTypeFilter] = useState<string>("tous");
  const [cabinetFilter, setCabinetFilter] = useState<string>("tous");
  const [therapeuteFilter, setTherapeuteFilter] = useState<string>("tous");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Data state
  const [soins, setSoins] = useState<Soin[]>([]);
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [therapeutes, setTherapeutes] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSoin, setSelectedSoin] = useState<Soin | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [soinTypes, setSoinTypes] = useState<string[]>([]);

  const { toast } = useToast();

  // Get unique creators for filter dropdown
  const creators = Array.from(new Set(soins.map((soin) => soin.Cree_par)));
  const cabinets = Array.from(
    new Set(soins.map((s) => s.Cabinet).filter((c): c is string => Boolean(c))),
  );
  const therapeuteOptions = useMemo(() => {
    const unique = new Map<string, Employee>();
    therapeutes.forEach((employee) => {
      if (!unique.has(employee.CIN)) {
        unique.set(employee.CIN, employee);
      }
    });
    return Array.from(unique.values()).sort((a, b) => {
      const nameA = `${a.prenom} ${a.nom}`.trim();
      const nameB = `${b.prenom} ${b.nom}`.trim();
      return nameA.localeCompare(nameB, "fr");
    });
  }, [therapeutes]);

  // Load soins on component mount
  useEffect(() => {
    loadSoins();
    OptionsService.getSoinTypes()
      .then(setSoinTypes)
      .catch(() => setSoinTypes([]));
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  // Add escape key handler to force close modals if stuck
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && event.ctrlKey) {
        forceCloseAllModals();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  const loadSoins = async () => {
    try {
      setIsLoading(true);
      const data = await SoinsService.getAll();
      setSoins(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les soins",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const [userData, employeeData] = await Promise.all([
        UserService.getCurrentAllUsers(),
        EmployeesService.getAll(),
      ]);
      setUsers(userData);
      setTherapeutes(
        employeeData.filter((employee) => employee.role === "therapeute"),
      );
    } catch (error) {
      toast({
        title: "Erreur",
        description:
          "Impossible de charger les utilisateurs ou les thérapeutes",
        variant: "destructive",
      });
    }
  };

  const getUserName = (CIN: string) => {
    const user = users.find((user) => user.CIN === CIN);
    if (user && user.nom) return user.nom;
    return CIN;
  };

  const getTherapeuteName = (cin?: string | null) => {
    if (!cin) return "Non assigné";
    const therapeute = therapeutes.find((employee) => employee.CIN === cin);
    if (therapeute) {
      const fullName = `${therapeute.prenom} ${therapeute.nom}`.trim();
      if (fullName.length > 0) {
        return fullName;
      }
    }
    const user = users.find((user) => user.CIN === cin);
    if (user && user.nom) return user.nom;
    return cin;
  };

  // Filter and search logic
  const filteredSoins = useMemo(() => {
    return soins.filter((soin) => {
      const matchesSearch =
        soin.Nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        soin.Type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        soin.Cree_par.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCreator =
        creatorFilter === "tous" || soin.Cree_par === creatorFilter;

      const matchesType = typeFilter === "tous" || soin.Type === typeFilter;

      const matchesCabinet =
        cabinetFilter === "tous" || soin.Cabinet === cabinetFilter;

      const matchesTherapeute =
        therapeuteFilter === "tous" ||
        (soin.therapeute ?? "") === therapeuteFilter;

      return (
        matchesSearch &&
        matchesCreator &&
        matchesType &&
        matchesCabinet &&
        matchesTherapeute
      );
    });
  }, [
    searchTerm,
    creatorFilter,
    typeFilter,
    cabinetFilter,
    therapeuteFilter,
    soins,
  ]);

  // CRUD Operations
  const handleCreateSoin = async (data: SoinFormData) => {
    try {
      setIsSubmitting(true);
      await SoinsService.create(data);
      await loadSoins();
      closeFormModal();
      toast({
        title: "Succès",
        description: "Le soin a été créé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le soin",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSoin = async (data: SoinFormData) => {
    if (!selectedSoin) return;

    try {
      setIsSubmitting(true);
      await SoinsService.update(selectedSoin.id, data);
      await loadSoins();
      closeFormModal();
      toast({
        title: "Succès",
        description: "Le soin a été modifié avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le soin",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSoin = async () => {
    if (!selectedSoin) return;

    try {
      setIsSubmitting(true);
      await SoinsService.delete(selectedSoin.id);
      await loadSoins();
      closeDeleteModal();
      toast({
        title: "Succès",
        description: "Le soin a été supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le soin",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modal handlers
  const openCreateModal = () => {
    setSelectedSoin(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (soin: Soin) => {
    closeModals();
    setTimeout(() => {
      setSelectedSoin(soin);
      setIsFormModalOpen(true);
    }, 100);
  };

  const openDetailsModal = (soin: Soin) => {
    closeModals();
    setTimeout(() => {
      setSelectedSoin(soin);
      setIsDetailsModalOpen(true);
    }, 100);
  };

  const openDeleteModal = (soin: Soin) => {
    closeModals();
    setTimeout(() => {
      setSelectedSoin(soin);
      setIsDeleteModalOpen(true);
    }, 100);
  };

  // Force close all modals
  const forceCloseAllModals = () => {
    setIsFormModalOpen(false);
    setIsDetailsModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedSoin(null);
    setIsSubmitting(false);
  };

  const closeModals = () => {
    setTimeout(() => {
      setIsFormModalOpen(false);
      setIsDetailsModalOpen(false);
      setIsDeleteModalOpen(false);
      setSelectedSoin(null);
    }, 0);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedSoin(null);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedSoin(null);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedSoin(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Get statistics
  const statistics = getRevenueStatistics(soins);

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Soins</h1>
            <p className="text-muted-foreground">
              Gestion des services et soins médicaux
            </p>
          </div>
          <Button className="gap-2" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Nouveau Soin
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Services
              </CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.totalServices}
              </div>
              <p className="text-xs text-muted-foreground">
                Services disponibles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prix Moyen</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPrice(statistics.averagePrice)}
              </div>
              <p className="text-xs text-muted-foreground">
                Prix moyen par service
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Prix Maximum
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(statistics.highestPrice)}
              </div>
              <p className="text-xs text-muted-foreground">
                Service le plus cher
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Revenu Potentiel
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatPrice(statistics.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Si tous services utilisés 1x
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rechercher et Filtrer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              {/* Search */}
              <div className="relative lg:col-span-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un soin..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type de soin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les types</SelectItem>
                  {soinTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Creator Filter */}
              <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Créé par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les créateurs</SelectItem>
                  {creators.map((creator) => (
                    <SelectItem key={creator} value={creator}>
                      {getUserName(creator)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Therapeute Filter */}
              <Select
                value={therapeuteFilter}
                onValueChange={setTherapeuteFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Thérapeute" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les thérapeutes</SelectItem>
                  {therapeuteOptions.map((therapeute) => {
                    const fullName =
                      `${therapeute.prenom} ${therapeute.nom}`.trim();
                    return (
                      <SelectItem key={therapeute.CIN} value={therapeute.CIN}>
                        {fullName.length > 0 ? fullName : therapeute.CIN}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Cabinet Filter */}
              <Select value={cabinetFilter} onValueChange={setCabinetFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Cabinet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les cabinets</SelectItem>
                  {cabinets.map((cab) => (
                    <SelectItem key={cab} value={cab}>
                      {cab}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex rounded-lg border border-border p-1">
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="h-8 gap-2 flex-1"
                >
                  <TableIcon className="h-4 w-4" />
                  Tableau
                </Button>
                <Button
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  className="h-8 gap-2 flex-1"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Cartes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Chargement..."
              : `${filteredSoins.length} soin(s) trouvé(s)`}
          </p>
        </div>

        {/* Soins Display - Table or Cards */}
        {viewMode === "table" ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {isLoading ? (
                  <TableLoader columns={8} rows={6} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Soin</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Cabinet</TableHead>
                        <TableHead>Créé par</TableHead>
                        <TableHead>Thérapeute</TableHead>
                        <TableHead>Créé le</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSoins.length > 0 ? (
                        filteredSoins.map((soin) => (
                          <TableRow key={soin.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Stethoscope className="h-4 w-4 text-primary" />
                                <div>
                                  <div className="font-medium">{soin.Nom}</div>
                                  <div className="text-sm text-muted-foreground">
                                    ID: {soin.id}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSoinTypeColor(soin.Type)}`}
                              >
                                {soin.Type}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono">
                              {formatPrice(soin.prix)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  cabinetColors[soin.Cabinet || ""] ||
                                  "bg-amber-100 text-amber-700 border-amber-200"
                                }
                              >
                                {soin.Cabinet}
                              </Badge>
                            </TableCell>
                            <TableCell>{getUserName(soin.Cree_par)}</TableCell>
                            <TableCell>
                              {getTherapeuteName(soin.therapeute)}
                            </TableCell>
                            <TableCell>{formatDate(soin.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => openDetailsModal(soin)}
                                  >
                                    <Eye className="h-4 w-4" />
                                    Voir détails
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => openEditModal(soin)}
                                  >
                                    <Edit className="h-4 w-4" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2 text-red-600"
                                    onClick={() => openDeleteModal(soin)}
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
                          <TableCell colSpan={8} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <Stethoscope className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                Aucun soin trouvé avec les critères sélectionnés
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
        ) : (
          /* Cards View */
          <div className="space-y-6">
            {isLoading ? (
              <GridLoader items={6} />
            ) : filteredSoins.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSoins.map((soin) => (
                  <Card
                    key={soin.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-primary" />
                            {soin.Nom}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            ID: {soin.id}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSoinTypeColor(soin.Type)}`}
                        >
                          {soin.Type}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Prix
                        </div>
                        <div className="font-mono text-2xl font-bold">
                          {formatPrice(soin.prix)}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Créé par:</span>
                          <span>{getUserName(soin.Cree_par)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Thérapeute:</span>
                          <span>{getTherapeuteName(soin.therapeute)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Créé le:</span>
                          <span>{formatDate(soin.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Cabinet:</span>
                          <Badge
                            variant="secondary"
                            className={
                              cabinetColors[soin.Cabinet || ""] ||
                              "bg-amber-100 text-amber-700 border-amber-200"
                            }
                          >
                            {soin.Cabinet}
                          </Badge>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => openDetailsModal(soin)}
                              >
                                <Eye className="h-4 w-4" />
                                Voir détails
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => openEditModal(soin)}
                              >
                                <Edit className="h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 text-red-600"
                                onClick={() => openDeleteModal(soin)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <Stethoscope className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-medium">Aucun soin trouvé</h3>
                      <p className="text-muted-foreground">
                        Aucun soin ne correspond aux critères sélectionnés
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Modals */}
        <SoinFormModal
          isOpen={isFormModalOpen}
          onClose={closeFormModal}
          onSubmit={selectedSoin ? handleUpdateSoin : handleCreateSoin}
          soin={selectedSoin}
          isLoading={isSubmitting}
          users={users}
          therapeutes={therapeutes}
        />

        <SoinDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={closeDetailsModal}
          soin={selectedSoin}
          onEdit={openEditModal}
          onDelete={openDeleteModal}
          users={users}
        />

        <DeleteSoinModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteSoin}
          soin={selectedSoin}
          isLoading={isSubmitting}
        />
      </div>
    </DashboardLayout>
  );
}
