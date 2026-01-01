import { useState, useMemo, useEffect } from "react";
import {
  FileText,
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
  Copy,
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
import DocumentTemplateFormModal from "@/components/documentTemplates/DocumentTemplateFormModal";
import DocumentTemplateDetailsModal from "@/components/documentTemplates/DocumentTemplateDetailsModal";
import DeleteDocumentTemplateModal from "@/components/documentTemplates/DeleteDocumentTemplateModal";
import {
  DocumentTemplatesService,
  DocumentTemplate,
  DocumentTemplateFormData,
  getAvailableDoctors,
} from "@/services/documentTemplatesService";
import { UserService } from "@/services/userService";
import { Utilisateur } from "@/services/clientsService";

export default function DocumentTypes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [creatorFilter, setCreatorFilter] = useState<string>("tous");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Data state
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplate | null>(null);
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  // Get unique creators for filter dropdown
  const creators = Array.from(
    new Set(templates.map((template) => template.Cree_par)),
  );

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
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

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await DocumentTemplatesService.getAll();
      setTemplates(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les modèles de documents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await UserService.getCurrentAllUsers();
      setUsers(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUserName = (CIN: string) => {
    const user = users.find((user) => user.CIN === CIN);
    if (user && user.nom) return user.nom;
    return CIN;
  };

  // Filter and search logic
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.Cree_par.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCreator =
        creatorFilter === "tous" || template.Cree_par === creatorFilter;

      return matchesSearch && matchesCreator;
    });
  }, [searchTerm, creatorFilter, templates]);

  // CRUD Operations
  const handleCreateTemplate = async (data: DocumentTemplateFormData) => {
    try {
      setIsSubmitting(true);
      await DocumentTemplatesService.create(data);
      await loadTemplates();
      closeFormModal();
      toast({
        title: "Succès",
        description: "Le modèle de document a été créé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le modèle de document",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTemplate = async (data: DocumentTemplateFormData) => {
    if (!selectedTemplate) return;

    try {
      setIsSubmitting(true);
      await DocumentTemplatesService.update(selectedTemplate.id, data);
      await loadTemplates();
      closeFormModal();
      toast({
        title: "Succès",
        description: "Le modèle de document a été modifié avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le modèle de document",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setIsSubmitting(true);
      await DocumentTemplatesService.delete(selectedTemplate.id);
      await loadTemplates();
      closeDeleteModal();
      toast({
        title: "Succès",
        description: "Le modèle de document a été supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le modèle de document",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicateTemplate = async (template: DocumentTemplate) => {
    try {
      setIsSubmitting(true);
      const duplicateData: DocumentTemplateFormData = {
        name: `${template.name} (Copie)`,
        sections_json: template.sections_json,
        Cree_par: template.Cree_par,
      };
      await DocumentTemplatesService.create(duplicateData);
      await loadTemplates();
      toast({
        title: "Succès",
        description: "Le modèle de document a été dupliqué avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de dupliquer le modèle de document",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modal handlers
  const openCreateModal = () => {
    setSelectedTemplate(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (template: DocumentTemplate) => {
    closeModals();
    setTimeout(() => {
      setSelectedTemplate(template);
      setIsFormModalOpen(true);
    }, 100);
  };

  const openDetailsModal = (template: DocumentTemplate) => {
    closeModals();
    setTimeout(() => {
      setSelectedTemplate(template);
      setIsDetailsModalOpen(true);
    }, 100);
  };

  const openDeleteModal = (template: DocumentTemplate) => {
    closeModals();
    setTimeout(() => {
      setSelectedTemplate(template);
      setIsDeleteModalOpen(true);
    }, 100);
  };

  // Force close all modals
  const forceCloseAllModals = () => {
    setIsFormModalOpen(false);
    setIsDetailsModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedTemplate(null);
    setIsSubmitting(false);
  };

  const closeModals = () => {
    setTimeout(() => {
      setIsFormModalOpen(false);
      setIsDetailsModalOpen(false);
      setIsDeleteModalOpen(false);
      setSelectedTemplate(null);
    }, 0);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedTemplate(null);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedTemplate(null);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedTemplate(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getSectionCount = (template: DocumentTemplate) => {
    return template.sections_json.sections.length;
  };

  const getFieldCount = (template: DocumentTemplate) => {
    return template.sections_json.sections.reduce(
      (total, section) => total + section.fields.length,
      0,
    );
  };

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Types de Documents
            </h1>
            <p className="text-muted-foreground">
              Gestion des modèles de documents et formulaires personnalisés
            </p>
          </div>
          <Button className="gap-2" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Nouveau Modèle
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rechercher et Filtrer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou créateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

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
            </div>
          </CardContent>
        </Card>

        {/* Results Summary and View Toggle */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Chargement..."
              : `${filteredTemplates.length} modèle(s) trouvé(s)`}
          </p>
          <div className="flex rounded-lg border border-border p-1">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-8 gap-2"
            >
              <TableIcon className="h-4 w-4" />
              Tableau
            </Button>
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
              className="h-8 gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              Cartes
            </Button>
          </div>
        </div>

        {/* Templates Display - Table or Cards */}
        {viewMode === "table" ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {isLoading ? (
                  <TableLoader columns={6} rows={6} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom du modèle</TableHead>
                        <TableHead>Sections</TableHead>
                        <TableHead>Champs</TableHead>
                        <TableHead>Créé par</TableHead>
                        <TableHead>Créé le</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTemplates.length > 0 ? (
                        filteredTemplates.map((template) => (
                          <TableRow
                            key={template.id}
                            className="hover:bg-muted/50"
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                <div>
                                  <div className="font-medium">
                                    {template.name}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {getSectionCount(template)} section(s)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getFieldCount(template)} champ(s)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {getUserName(template.Cree_par)}
                            </TableCell>
                            <TableCell>
                              {formatDate(template.created_at)}
                            </TableCell>
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
                                    onClick={() => openDetailsModal(template)}
                                  >
                                    <Eye className="h-4 w-4" />
                                    Voir détails
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => openEditModal(template)}
                                  >
                                    <Edit className="h-4 w-4" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() =>
                                      handleDuplicateTemplate(template)
                                    }
                                    disabled={isSubmitting}
                                  >
                                    <Copy className="h-4 w-4" />
                                    Dupliquer
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2 text-red-600"
                                    onClick={() => openDeleteModal(template)}
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
                              <FileText className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                Aucun modèle trouvé avec les critères
                                sélectionnés
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
            ) : filteredTemplates.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            {template.name}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          {getSectionCount(template)} section(s)
                        </Badge>
                        <Badge variant="outline">
                          {getFieldCount(template)} champ(s)
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Créé par:</span>
                          <span>{getUserName(template.Cree_par)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Créé le:</span>
                          <span>{formatDate(template.created_at)}</span>
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
                                onClick={() => openDetailsModal(template)}
                              >
                                <Eye className="h-4 w-4" />
                                Voir détails
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => openEditModal(template)}
                              >
                                <Edit className="h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() =>
                                  handleDuplicateTemplate(template)
                                }
                                disabled={isSubmitting}
                              >
                                <Copy className="h-4 w-4" />
                                Dupliquer
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 text-red-600"
                                onClick={() => openDeleteModal(template)}
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
                    <FileText className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-medium">
                        Aucun modèle trouvé
                      </h3>
                      <p className="text-muted-foreground">
                        Aucun modèle ne correspond aux critères sélectionnés
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Modals */}
        <DocumentTemplateFormModal
          isOpen={isFormModalOpen}
          onClose={closeFormModal}
          onSubmit={
            selectedTemplate ? handleUpdateTemplate : handleCreateTemplate
          }
          template={selectedTemplate}
          isLoading={isSubmitting}
          users={users}
        />

        <DocumentTemplateDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={closeDetailsModal}
          template={selectedTemplate}
          onEdit={openEditModal}
          onDelete={openDeleteModal}
          users={users}
        />

        <DeleteDocumentTemplateModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteTemplate}
          template={selectedTemplate}
          isLoading={isSubmitting}
        />
      </div>
    </DashboardLayout>
  );
}
