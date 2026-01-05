import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  Columns3,
  FileText,
  AlertTriangle,
  X,
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { TableLoader } from "@/components/ui/table-loader";
import WorkflowFormModal from "@/components/workflows/WorkflowFormModal";
import {
  WorkflowService,
  Workflow,
  WorkflowWithDetails,
  getWorkflowStatusColor,
  getWorkflowStatusBadge,
} from "@/services/workflowService";

// Define all available columns
type ColumnKey =
  | "patient"
  | "cin"
  | "rendezvous"
  | "appointmentStatus"
  | "soins"
  | "products"
  | "totalAmount"
  | "paymentMethod"
  | "paymentDate"
  | "invoiceStatus"
  | "createdBy"
  | "actions";

const COLUMN_LABELS: Record<ColumnKey, string> = {
  patient: "Patient",
  cin: "CIN",
  rendezvous: "Rendez-vous",
  appointmentStatus: "Statut Rendez-vous",
  soins: "Soins",
  products: "Produits",
  totalAmount: "Montant Total",
  paymentMethod: "Méthode de Paiement",
  paymentDate: "Date de Paiement",
  invoiceStatus: "Statut Facture",
  createdBy: "Créé par",
  actions: "Actions",
};

const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  "patient",
  "cin",
  "rendezvous",
  "appointmentStatus",
  "soins",
  "products",
  "totalAmount",
  "paymentMethod",
  "paymentDate",
  "invoiceStatus",
  "createdBy",
  "actions",
];

interface InvoiceStatusInfo {
  display: string;
  color: string;
}

const getInvoiceStatusDisplay = (status?: string): InvoiceStatusInfo => {
  switch (status) {
    case "Brouillon":
      return { display: "Brouillon", color: "bg-gray-100 text-gray-800" };
    case "Envoyée":
      return { display: "Envoyée", color: "bg-blue-100 text-blue-800" };
    case "Payée":
      return { display: "Payée", color: "bg-green-100 text-green-800" };
    case "Annulée":
      return { display: "Annulée", color: "bg-red-100 text-red-800" };
    case "En retard":
      return { display: "En retard", color: "bg-yellow-100 text-yellow-800" };
    default:
      return { display: "-", color: "bg-gray-100 text-gray-800" };
  }
};

const AppointmentStatusDisplay = (status?: string): InvoiceStatusInfo => {
  switch (status) {
    case "programmé":
      return {
        display: "Programmé",
        color: "bg-purple-100 text-purple-800",
      };
    case "confirmé":
      return { display: "Confirmé", color: "bg-blue-100 text-blue-800" };
    case "terminé":
      return { display: "Terminé", color: "bg-green-100 text-green-800" };
    case "annulé":
      return { display: "Annulé", color: "bg-red-100 text-red-800" };
    default:
      return { display: "-", color: "bg-gray-100 text-gray-800" };
  }
};

// Column visibility dropdown component
const ColumnVisibilityDropdown = ({
  visibleColumns,
  onColumnToggle,
  className,
}: {
  visibleColumns: ColumnKey[];
  onColumnToggle: (column: ColumnKey) => void;
  className?: string;
}) => {
  const nonActionColumns = (Object.keys(COLUMN_LABELS) as ColumnKey[]).filter(
    (col) => col !== "actions",
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Columns3 className="w-4 h-4 mr-2" />
          Colonnes
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 p-3">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 px-2">
            Colonnes à afficher
          </p>
          {nonActionColumns.map((column) => (
            <div key={column} className="flex items-center gap-2">
              <Checkbox
                id={`column-${column}`}
                checked={visibleColumns.includes(column)}
                onCheckedChange={() => onColumnToggle(column)}
              />
              <label
                htmlFor={`column-${column}`}
                className="text-sm text-gray-700 cursor-pointer flex-1"
              >
                {COLUMN_LABELS[column]}
              </label>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Tag list component for soins and products
const TagList = ({
  items,
  maxDisplay = 3,
}: {
  items?: string[];
  maxDisplay?: number;
}) => {
  if (!items || items.length === 0) {
    return <span className="text-gray-500">-</span>;
  }

  const displayItems = items.slice(0, maxDisplay);
  const moreCount = Math.max(0, items.length - maxDisplay);

  return (
    <div className="flex flex-wrap gap-1">
      {displayItems.map((item, idx) => (
        <Badge key={idx} variant="secondary" className="text-xs">
          {item}
        </Badge>
      ))}
      {moreCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{moreCount}
        </Badge>
      )}
    </div>
  );
};

export default function Workflows() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [creatorFilter, setCreatorFilter] = useState<string>("tous");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(
    DEFAULT_VISIBLE_COLUMNS,
  );

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

  // Handle column toggle
  const handleColumnToggle = (column: ColumnKey) => {
    setVisibleColumns((prev) =>
      prev.includes(column)
        ? prev.filter((col) => col !== column)
        : [...prev, column],
    );
  };

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
    setEditingWorkflowDetails(null);
  };

  // Handle form submission
  const handleFormSubmit = async () => {
    loadWorkflows();
    handleCloseModal();
  };

  const renderTableView = () => (
    <div className="border rounded-lg overflow-hidden flex flex-col">
      {isLoading ? (
        <TableLoader columns={visibleColumns.length} rows={6} />
      ) : filteredWorkflows.length === 0 ? (
        <div className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600">Aucun flux trouvé</p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)]">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                {visibleColumns.includes("patient") && (
                  <TableHead>Patient</TableHead>
                )}
                {visibleColumns.includes("cin") && <TableHead>CIN</TableHead>}
                {visibleColumns.includes("rendezvous") && (
                  <TableHead>Rendez-vous</TableHead>
                )}
                {visibleColumns.includes("appointmentStatus") && (
                  <TableHead>Statut Rendez-vous</TableHead>
                )}
                {visibleColumns.includes("soins") && (
                  <TableHead>Soins</TableHead>
                )}
                {visibleColumns.includes("products") && (
                  <TableHead>Produits</TableHead>
                )}
                {visibleColumns.includes("totalAmount") && (
                  <TableHead>Montant Total</TableHead>
                )}
                {visibleColumns.includes("paymentMethod") && (
                  <TableHead>Méthode de Paiement</TableHead>
                )}
                {visibleColumns.includes("paymentDate") && (
                  <TableHead>Date de Paiement</TableHead>
                )}
                {visibleColumns.includes("invoiceStatus") && (
                  <TableHead>Statut Facture</TableHead>
                )}
                {visibleColumns.includes("createdBy") && (
                  <TableHead>Créé par</TableHead>
                )}
                {visibleColumns.includes("actions") && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkflows.map((workflow) => (
                <TableRow key={workflow.id}>
                  {visibleColumns.includes("patient") && (
                    <TableCell className="font-medium">
                      {workflow.patientName || "N/A"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("cin") && (
                    <TableCell className="text-sm text-gray-600">
                      {workflow.client_CIN}
                    </TableCell>
                  )}
                  {visibleColumns.includes("rendezvous") && (
                    <TableCell className="text-sm">
                      {workflow.appointmentDate
                        ? new Date(workflow.appointmentDate).toLocaleDateString(
                            "fr-FR",
                          )
                        : "N/A"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("appointmentStatus") && (
                    <TableCell>
                      {workflow.appointmentStatus ? (
                        <Badge
                          className={
                            AppointmentStatusDisplay(workflow.appointmentStatus)
                              .color
                          }
                        >
                          {
                            AppointmentStatusDisplay(workflow.appointmentStatus)
                              .display
                          }
                        </Badge>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes("soins") && (
                    <TableCell>
                      <TagList items={workflow.soins} />
                    </TableCell>
                  )}
                  {visibleColumns.includes("products") && (
                    <TableCell>
                      <TagList items={workflow.products} />
                    </TableCell>
                  )}
                  {visibleColumns.includes("totalAmount") && (
                    <TableCell>
                      {workflow.totalAmount
                        ? `${workflow.totalAmount.toFixed(2)} DH`
                        : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("paymentMethod") && (
                    <TableCell>{workflow.paymentMethod || "-"}</TableCell>
                  )}
                  {visibleColumns.includes("paymentDate") && (
                    <TableCell className="text-sm">
                      {workflow.paymentDate
                        ? new Date(workflow.paymentDate).toLocaleDateString(
                            "fr-FR",
                          )
                        : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("invoiceStatus") && (
                    <TableCell>
                      {workflow.invoiceStatus ? (
                        <Badge
                          className={
                            getInvoiceStatusDisplay(workflow.invoiceStatus)
                              .color
                          }
                        >
                          {
                            getInvoiceStatusDisplay(workflow.invoiceStatus)
                              .display
                          }
                        </Badge>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes("createdBy") && (
                    <TableCell className="text-sm text-gray-600">
                      {workflow.Cree_par}
                    </TableCell>
                  )}
                  {visibleColumns.includes("actions") && (
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
                            onClick={() =>
                              setDeleteConfirm(workflow as Workflow)
                            }
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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

              <ColumnVisibilityDropdown
                visibleColumns={visibleColumns}
                onColumnToggle={handleColumnToggle}
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {filteredWorkflows.length} flux{" "}
                {filteredWorkflows.length !== 1 ? "s" : ""} trouvé
                {filteredWorkflows.length !== 1 ? "s" : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {renderTableView()}
      </div>

      {/* Modals */}
      <WorkflowFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
        workflow={editingWorkflow || undefined}
        workflowDetails={editingWorkflowDetails || undefined}
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
