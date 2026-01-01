import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableLoader } from "@/components/ui/table-loader";
import { useToast } from "@/components/ui/use-toast";
import {
  InventoryService,
  InventoryMovement,
  InventoryFormData,
  formatPrice,
} from "@/services/inventoryService";
import { ProductsService, Product } from "@/services/productsService";
import InventoryFormModal from "@/components/inventory/InventoryFormModal";
import DeleteInventoryModal from "@/components/inventory/DeleteInventoryModal";
import NewMovementTypeModal from "@/components/inventory/NewMovementTypeModal";
import {
  ChevronDown,
  Plus,
  Package,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export default function Inventaire() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [movementFilter, setMovementFilter] = useState<string>("tous");
  const [productFilter, setProductFilter] = useState<string>("tous");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const [initialType, setInitialType] = useState<"IN" | "OUT">("IN");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<InventoryMovement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [data, prods] = await Promise.all([
        InventoryService.getAll(),
        ProductsService.getAll(),
      ]);
      setMovements(data);
      setProducts(prods);
    } catch (e) {
      toast({
        title: "Erreur",
        description: "Impossible de charger l'inventaire",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      const matchType =
        movementFilter === "tous" ||
        m.movementType === movementFilter.toUpperCase();
      const matchProduct =
        productFilter === "tous" || m.id_bien === Number(productFilter);
      const d = new Date(m.date);
      const matchFrom = !dateFrom || d >= new Date(dateFrom);
      const matchTo = !dateTo || d <= new Date(dateTo + "T23:59:59");
      return matchType && matchProduct && matchFrom && matchTo;
    });
  }, [movements, movementFilter, productFilter, dateFrom, dateTo]);

  const openCreate = () => {
    setSelected(null);
    setIsTypePickerOpen(true);
  };
  const openEdit = (m: InventoryMovement) => {
    setSelected(m);
    setIsFormOpen(true);
  };
  const openDelete = (m: InventoryMovement) => {
    setSelected(m);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (data: InventoryFormData) => {
    const ensureProduct = async (productId: number) => {
      let p = await ProductsService.getById(productId);
      if (!p) {
        await ProductsService.getAll();
        p = await ProductsService.getById(productId);
      }
      return p;
    };

    try {
      setSubmitting(true);
      if (selected) {
        const changingProduct = data.id_bien !== selected.id_bien;
        if (selected.movementType === "IN") {
          await InventoryService.updateIN(selected.id, data);
        } else {
          await InventoryService.updateOUT(selected.id, data);
        }

        if (changingProduct) {
          const oldProd = await ensureProduct(selected.id_bien);
          const newProd = await ensureProduct(data.id_bien);
          if (oldProd) {
            const sign = selected.movementType === "IN" ? "-" : "+";
            toast({
              title: "Stock mis à jour",
              description: `${oldProd.Nom}: ${sign}${selected.quantite} → ${oldProd.stock}`,
            });
          }
          if (newProd) {
            const sign = selected.movementType === "IN" ? "+" : "-";
            toast({
              title: "Stock mis à jour",
              description: `${newProd.Nom}: ${sign}${data.quantite} → ${newProd.stock}`,
            });
          }
        } else {
          const delta = data.quantite - selected.quantite;
          if (delta !== 0) {
            const prod = await ensureProduct(data.id_bien);
            if (prod) {
              let sign = "";
              if (selected.movementType === "IN") sign = delta > 0 ? "+" : "";
              else sign = delta > 0 ? "-" : "+";
              const abs = Math.abs(delta);
              toast({
                title: "Stock mis à jour",
                description: `${prod.Nom}: ${sign}${abs} → ${prod.stock}`,
              });
            }
          }
        }
      } else {
        if (data.movementType === "IN") {
          await InventoryService.createIN(data);
        } else {
          await InventoryService.createOUT(data);
        }
        const prod = await ensureProduct(data.id_bien);
        if (prod) {
          const sign = data.movementType === "IN" ? "+" : "-";
          toast({
            title: "Stock mis à jour",
            description: `${prod.Nom}: ${sign}${data.quantite} → ${prod.stock}`,
          });
        }
      }
      setIsFormOpen(false);
      await loadAll();
      toast({ title: "Succès", description: "Mouvement enregistré" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le mouvement",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    const ensureProduct = async (productId: number) => {
      let p = await ProductsService.getById(productId);
      if (!p) {
        await ProductsService.getAll();
        p = await ProductsService.getById(productId);
      }
      return p;
    };

    try {
      setSubmitting(true);
      await InventoryService.deleteMovement(selected.id, selected.movementType);
      const prod = await ensureProduct(selected.id_bien);
      if (prod) {
        const sign = selected.movementType === "IN" ? "-" : "+";
        toast({
          title: "Stock mis à jour",
          description: `${prod.Nom}: ${sign}${selected.quantite} → ${prod.stock}`,
        });
      }
      setIsDeleteOpen(false);
      await loadAll();
      toast({ title: "Supprimé", description: "Mouvement supprimé" });
    } catch (e) {
      toast({
        title: "Erreur",
        description: "Suppression impossible",
        variant: "destructive",
      });
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString("fr-FR", {
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
            <h1 className="text-3xl font-bold tracking-tight">Inventaire</h1>
            <p className="text-muted-foreground">
              Transactions produits (Entrant / Sortant)
            </p>
          </div>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Ajouter un mouvement
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Type</label>
                <Select
                  value={movementFilter}
                  onValueChange={setMovementFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type de mouvement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous</SelectItem>
                    <SelectItem value="IN">Entrant</SelectItem>
                    <SelectItem value="OUT">Sortant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Produit</label>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Produit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.Nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">De</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">À</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {loading ? (
                <TableLoader columns={8} rows={6} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Prix Unitaire</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Mouvement</TableHead>
                      <TableHead>Facture</TableHead>
                      <TableHead>Créé par</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length > 0 ? (
                      filtered.map((m) => {
                        const isIn = m.movementType === "IN";
                        const isManualOut =
                          m.movementType === "OUT" && !m.id_facture;
                        return (
                          <TableRow
                            key={m.id}
                            className={
                              isIn
                                ? "bg-green-50/40 dark:bg-green-950/20"
                                : "bg-red-50/40 dark:bg-red-950/20"
                            }
                          >
                            <TableCell>{formatDate(m.date)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" />
                                <div className="font-medium">{m.nom_bien}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              {m.quantite}
                            </TableCell>
                            <TableCell className="font-mono">
                              {formatPrice(m.prix)}
                            </TableCell>
                            <TableCell className="font-mono">
                              {formatPrice(m.total)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  isIn
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }
                              >
                                {isIn ? (
                                  <span className="inline-flex items-center gap-1">
                                    <ArrowDownRight className="h-3 w-3" />{" "}
                                    Entrant
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1">
                                    <ArrowUpRight className="h-3 w-3" /> Sortant
                                  </span>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {m.id_facture ? (
                                <span className="inline-flex items-center gap-1">
                                  <Receipt className="h-3 w-3" /> #
                                  {m.id_facture}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>{m.Cree_par}</TableCell>
                            <TableCell className="text-right">
                              {isIn || isManualOut ? (
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
                                      onSelect={() =>
                                        setTimeout(() => openEdit(m), 0)
                                      }
                                    >
                                      Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="gap-2 text-red-600"
                                      onSelect={() =>
                                        setTimeout(() => openDelete(m), 0)
                                      }
                                    >
                                      Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          Aucun mouvement trouvé
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        <NewMovementTypeModal
          isOpen={isTypePickerOpen}
          onClose={() => setIsTypePickerOpen(false)}
          onChoose={(type) => {
            setInitialType(type);
            setIsTypePickerOpen(false);
            setIsFormOpen(true);
          }}
        />

        <InventoryFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleSubmit}
          isLoading={submitting}
          products={products}
          movement={selected}
          initialType={selected ? selected.movementType : initialType}
        />

        <DeleteInventoryModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleDelete}
          movement={selected}
          isLoading={submitting}
        />
      </div>
    </DashboardLayout>
  );
}
