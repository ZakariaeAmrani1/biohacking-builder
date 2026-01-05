import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  LayoutGrid,
  Table as TableIcon,
  FileText,
  AlertTriangle,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import WorkflowFormModal from "@/components/workflows/WorkflowFormModal";
import {
  WorkflowService,
  Workflow,
  WorkflowWithDetails,
  getWorkflowStatusColor,
  getWorkflowStatusBadge,
} from "@/services/workflowService";
import { UserService } from "@/services/userService";

export default function Workflows() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [creatorFilter, setCreatorFilter] = useState<string>("tous");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Data state
  const [workflows, setWorkflows] = useState<WorkflowWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowWithDetails | null>(null);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [editingWorkflowDetails, setEditingWorkflowDetails] =
    useState<WorkflowWithDetails | null>(null);
  const [initialStep, setInitialStep] = useState<1 | 2 | 3 | 4>(1);
  const [deleteConfirm, setDeleteConfirm] = useState<Workflow | null>(null);

  const { toast } = useToast();

  // Get unique creators for filter dropdown
  const creators = Array.from(
    new Set(workflows.map((workflow) => workflow.Cree_par)),
  );

  // Load workflows on component mount
  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setIsLoading(true);
      const data = await WorkflowService.getAllWithDetails();
      setWorkflows(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les flux",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter workflows
  const filteredWorkflows = useMemo(() => {
    return workflows.filter((workflow) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        workflow.patientName?.toLowerCase().includes(searchLower) ||
        workflow.client_CIN.toLowerCase().includes(searchLower) ||
        workflow.Cree_par.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus =
        statusFilter === "tous" || workflow.status === statusFilter;

      // Creator filter
      const matchesCreator =
        creatorFilter === "tous" || workflow.Cree_par === creatorFilter;

      return matchesSearch && matchesStatus && matchesCreator;
    });
  }, [workflows, searchTerm, statusFilter, creatorFilter]);

  // Handle create new workflow
  const handleOpenCreateModal = () => {
    setEditingWorkflow(null);
    setSelectedWorkflow(null);
    setIsFormModalOpen(true);
  };

  // Handle edit workflow
  const handleEditWorkflow = (workflow: WorkflowWithDetails) => {
    setEditingWorkflow({
      id: workflow.id,
      client_CIN: workflow.client_CIN,
      rendez_vous_id: workflow.rendez_vous_id,
      facture_id: workflow.facture_id,
      status: workflow.status,
      created_at: workflow.created_at,
      Cree_par: workflow.Cree_par,
    });
    setSelectedWorkflow(workflow);
    setEditingWorkflowDetails(workflow);

    // Determine which step to open based on invoice status
    let step: 1 | 2 | 3 | 4 = 1;

    if (workflow.invoice) {
      // If invoice exists but is in draft/brouillon, go to step 4 (payment)
      if (workflow.invoice.statut === "Brouillon") {
        step = 4;
      } else {
        // If invoice is paid, allow full edit from step 1
        step = 1;
      }
    } else if (workflow.facture_id) {
      // If facture_id exists but no invoice data loaded, go to step 3 (add invoice)
      step = 3;
    } else {
      // No invoice yet, go to step 3 to add one
      step = 3;
    }

    setInitialStep(step);
    setIsFormModalOpen(true);
  };

  // Handle delete workflow
  const handleDeleteWorkflow = async (workflow: Workflow) => {
    try {
      await WorkflowService.delete(workflow.id);
      setWorkflows(workflows.filter((w) => w.id !== workflow.id));
      setDeleteConfirm(null);
      toast({
        title: "Succès",
        description: "Flux supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression du flux",
        variant: "destructive",
      });
    }
  };

  // Handle form modal close
  const handleCloseModal = () => {
    setIsFormModalOpen(false);
    setEditingWorkflow(null);
    setSelectedWorkflow(null);
  };

  // Handle form submission
  const handleFormSubmit = async () => {
    loadWorkflows();
    handleCloseModal();
  };

  const renderTableView = () => (
    <div className="border rounded-lg overflow-hidden">
      {isLoading ? (
        <TableLoader columns={8} rows={6} />
      ) : filteredWorkflows.length === 0 ? (
        <div className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600">Aucun flux trouvé</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>CIN</TableHead>
              <TableHead>Rendez-vous</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Montant Total</TableHead>
              <TableHead>Méthode de Paiement</TableHead>
              <TableHead>Créé par</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWorkflows.map((workflow) => (
              <TableRow key={workflow.id}>
                <TableCell className="font-medium">
                  {workflow.patientName || "N/A"}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {workflow.client_CIN}
                </TableCell>
                <TableCell className="text-sm">
                  {workflow.appointmentDate
                    ? new Date(workflow.appointmentDate).toLocaleDateString(
                        "fr-FR",
                      )
                    : "N/A"}
                </TableCell>
                <TableCell>
                  <Badge className={getWorkflowStatusColor(workflow.status)}>
                    {getWorkflowStatusBadge(workflow.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {workflow.totalAmount
                    ? `${workflow.totalAmount.toFixed(2)} DH`
                    : "-"}
                </TableCell>
                <TableCell>{workflow.paymentMethod || "-"}</TableCell>
                <TableCell className="text-sm text-gray-600">
                  {workflow.Cree_par}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleEditWorkflow(workflow)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteConfirm(workflow as Workflow)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {isLoading ? (
        <GridLoader />
      ) : filteredWorkflows.length === 0 ? (
        <div className="col-span-full p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600">Aucun flux trouvé</p>
        </div>
      ) : (
        filteredWorkflows.map((workflow) => (
          <Card key={workflow.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">
                    {workflow.patientName || "N/A"}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {workflow.client_CIN}
                  </p>
                </div>
                <Badge className={getWorkflowStatusColor(workflow.status)}>
                  {getWorkflowStatusBadge(workflow.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rendez-vous:</span>
                  <span>
                    {workflow.appointmentDate
                      ? new Date(workflow.appointmentDate).toLocaleDateString(
                          "fr-FR",
                        )
                      : "N/A"}
                  </span>
                </div>
                {workflow.totalAmount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium">
                      {workflow.totalAmount.toFixed(2)} DH
                    </span>
                  </div>
                )}
                {workflow.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paiement:</span>
                    <span>{workflow.paymentMethod}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Créé par:</span>
                  <span>{workflow.Cree_par}</span>
                </div>
              </div>

              <div className="pt-3 border-t flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditWorkflow(workflow)}
                  className="flex-1"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteConfirm(workflow as Workflow)}
                  className="flex-1"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gestion des Flux
            </h1>
            <p className="text-gray-600 mt-1">
              Gérez les flux de patients, rendez-vous et facturations
            </p>
          </div>
          <Button onClick={handleOpenCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Flux
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recherche et Filtres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par nom, CIN ou créateur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="w-40">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les Statuts</SelectItem>
                    <SelectItem value="En cours">En cours</SelectItem>
                    <SelectItem value="Terminé">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-40">
                <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Créateur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les Créateurs</SelectItem>
                    {creators.map((creator) => (
                      <SelectItem key={creator} value={creator}>
                        {creator}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {filteredWorkflows.length} flux{" "}
                {filteredWorkflows.length !== 1 ? "s" : ""} trouvé
                {filteredWorkflows.length !== 1 ? "s" : ""}
              </p>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  <TableIcon className="w-4 h-4 mr-2" />
                  Tableau
                </Button>
                <Button
                  variant={viewMode === "cards" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Cartes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {viewMode === "table" ? renderTableView() : renderCardView()}
      </div>

      {/* Modals */}
      <WorkflowFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
        workflow={editingWorkflow || undefined}
        initialStep={initialStep}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <Card className="w-96 shadow-lg border-red-100">
            <CardHeader className="border-b border-red-100 bg-red-50">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <Trash2 className="h-5 w-5" />
                Supprimer le Flux
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Alert variant="destructive">
                <AlertDescription>
                  Cette action est irréversible. Le flux et toutes ses données
                  associées seront supprimés.
                </AlertDescription>
              </Alert>
              <p className="text-sm text-gray-600">
                Êtes-vous sûr de vouloir supprimer ce flux ?
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteWorkflow(deleteConfirm)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
