import { useState, useMemo, useEffect } from "react";
import {
  Package,
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
  TrendingDown,
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
import ProductFormModal from "@/components/products/ProductFormModal";
import ProductDetailsModal from "@/components/products/ProductDetailsModal";
import DeleteProductModal from "@/components/products/DeleteProductModal";
import {
  ProductsService,
  Product,
  ProductFormData,
  getAvailableDoctors,
  formatPrice,
  getStockStatus,
  getStockStatistics,
} from "@/services/productsService";
import { CurrencyService } from "@/services/currencyService";
import { Utilisateur } from "@/services/clientsService";
import { UserService } from "@/services/userService";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [creatorFilter, setCreatorFilter] = useState<string>("tous");
  const [stockFilter, setStockFilter] = useState<string>("tous");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  // Get unique creators for filter dropdown
  const creators = Array.from(
    new Set(products.map((product) => product.Cree_par)),
  );

  // Load products on component mount
  useEffect(() => {
    loadProducts();
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

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const data = await ProductsService.getAll();
      setProducts(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
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
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.Nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.Cree_par.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCreator =
        creatorFilter === "tous" || product.Cree_par === creatorFilter;

      let matchesStock = true;
      if (stockFilter !== "tous") {
        switch (stockFilter) {
          case "en_stock":
            matchesStock = product.stock > 10;
            break;
          case "stock_faible":
            matchesStock = product.stock > 0 && product.stock <= 10;
            break;
          case "rupture":
            matchesStock = product.stock === 0;
            break;
        }
      }

      return matchesSearch && matchesCreator && matchesStock;
    });
  }, [searchTerm, creatorFilter, stockFilter, products]);

  // CRUD Operations
  const handleCreateProduct = async (data: ProductFormData) => {
    try {
      setIsSubmitting(true);
      await ProductsService.create(data);
      await loadProducts();
      closeFormModal();
      toast({
        title: "Succès",
        description: "Le produit a été créé avec succès",
      });
    } catch (error) {
      console.log(error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le produit",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async (data: ProductFormData) => {
    if (!selectedProduct) return;

    try {
      setIsSubmitting(true);
      await ProductsService.update(selectedProduct.id, data);
      await loadProducts();
      closeFormModal();
      toast({
        title: "Succès",
        description: "Le produit a été modifié avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le produit",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    try {
      setIsSubmitting(true);
      await ProductsService.delete(selectedProduct.id);
      await loadProducts();
      closeDeleteModal();
      toast({
        title: "Succès",
        description: "Le produit a été supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modal handlers
  const openCreateModal = () => {
    setSelectedProduct(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    closeModals();
    setTimeout(() => {
      setSelectedProduct(product);
      setIsFormModalOpen(true);
    }, 100);
  };

  const openDetailsModal = (product: Product) => {
    closeModals();
    setTimeout(() => {
      setSelectedProduct(product);
      setIsDetailsModalOpen(true);
    }, 100);
  };

  const openDeleteModal = (product: Product) => {
    closeModals();
    setTimeout(() => {
      setSelectedProduct(product);
      setIsDeleteModalOpen(true);
    }, 100);
  };

  // Force close all modals
  const forceCloseAllModals = () => {
    setIsFormModalOpen(false);
    setIsDetailsModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedProduct(null);
    setIsSubmitting(false);
  };

  const closeModals = () => {
    setTimeout(() => {
      setIsFormModalOpen(false);
      setIsDetailsModalOpen(false);
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
    }, 0);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedProduct(null);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedProduct(null);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedProduct(null);
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
  const statistics = getStockStatistics(products);

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Produits</h1>
            <p className="text-muted-foreground">
              Gestion des produits médicaux et stock
            </p>
          </div>
          <Button className="gap-2" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Nouveau Produit
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Produits
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.totalProducts}
              </div>
              <p className="text-xs text-muted-foreground">
                Produits enregistrés
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Valeur Stock
              </CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPrice(statistics.totalValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Valeur totale inventaire
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Stock Faible
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {statistics.lowStock}
              </div>
              <p className="text-xs text-muted-foreground">
                Produits à réapprovisionner
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Rupture Stock
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statistics.outOfStock}
              </div>
              <p className="text-xs text-muted-foreground">Produits épuisés</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rechercher et Filtrer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="relative lg:col-span-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit..."
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

              {/* Stock Filter */}
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="État du stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les stocks</SelectItem>
                  <SelectItem value="en_stock">En stock</SelectItem>
                  <SelectItem value="stock_faible">Stock faible</SelectItem>
                  <SelectItem value="rupture">Rupture de stock</SelectItem>
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
              : `${filteredProducts.length} produit(s) trouvé(s)`}
          </p>
        </div>

        {/* Products Display - Table or Cards */}
        {viewMode === "table" ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {isLoading ? (
                  <TableLoader columns={7} rows={6} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>État</TableHead>
                        <TableHead>Créé par</TableHead>
                        <TableHead>Créé le</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => {
                          const stockStatus = getStockStatus(product.stock);
                          return (
                            <TableRow
                              key={product.id}
                              className="hover:bg-muted/50"
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-primary" />
                                  <div>
                                    <div className="font-medium">
                                      {product.Nom}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      ID: {product.id}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono">
                                {formatPrice(product.prix)}
                              </TableCell>
                              <TableCell className="font-mono">
                                {product.stock} unités
                              </TableCell>
                              <TableCell>
                                <Badge variant={stockStatus.variant}>
                                  {stockStatus.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {getUserName(product.Cree_par)}
                              </TableCell>
                              <TableCell>
                                {formatDate(product.created_at)}
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
                                      onClick={() => openDetailsModal(product)}
                                    >
                                      <Eye className="h-4 w-4" />
                                      Voir détails
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="gap-2"
                                      onClick={() => openEditModal(product)}
                                    >
                                      <Edit className="h-4 w-4" />
                                      Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="gap-2 text-red-600"
                                      onClick={() => openDeleteModal(product)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <Package className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                Aucun produit trouvé avec les critères
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
            ) : filteredProducts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stock);
                  return (
                    <Card
                      key={product.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Package className="h-5 w-5 text-primary" />
                              {product.Nom}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              ID: {product.id}
                            </p>
                          </div>
                          <Badge variant={stockStatus.variant}>
                            {stockStatus.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Prix
                            </div>
                            <div className="font-mono text-lg font-semibold">
                              {formatPrice(product.prix)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Stock
                            </div>
                            <div className="font-mono text-lg font-semibold">
                              {product.stock} unités
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Créé par:</span>
                            <span>{getUserName(product.Cree_par)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Créé le:</span>
                            <span>{formatDate(product.created_at)}</span>
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
                                  onClick={() => openDetailsModal(product)}
                                >
                                  <Eye className="h-4 w-4" />
                                  Voir détails
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => openEditModal(product)}
                                >
                                  <Edit className="h-4 w-4" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-red-600"
                                  onClick={() => openDeleteModal(product)}
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
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <Package className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-medium">
                        Aucun produit trouvé
                      </h3>
                      <p className="text-muted-foreground">
                        Aucun produit ne correspond aux critères sélectionnés
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Modals */}
        <ProductFormModal
          isOpen={isFormModalOpen}
          onClose={closeFormModal}
          onSubmit={selectedProduct ? handleUpdateProduct : handleCreateProduct}
          product={selectedProduct}
          isLoading={isSubmitting}
          users={users}
        />

        <ProductDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={closeDetailsModal}
          product={selectedProduct}
          onEdit={openEditModal}
          onDelete={openDeleteModal}
          users={users}
        />

        <DeleteProductModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteProduct}
          product={selectedProduct}
          isLoading={isSubmitting}
        />
      </div>
    </DashboardLayout>
  );
}
