import { useState, useEffect } from "react";
import {
  Receipt,
  AlertTriangle,
  User,
  Calendar,
  Plus,
  Trash2,
  Package,
  Stethoscope,
  Euro,
  Hash,
  Search,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  FactureFormData,
  FactureWithDetails,
  FactureItem,
  FactureStatut,
  TypeBien,
  validateFactureData,
  getAvailableDoctors,
  getFactureStatuses,
  formatPrice,
  createEmptyFacture,
  createEmptyItem,
  calculateInvoiceTotal,
  calculateInvoiceTotals,
} from "@/services/invoicesService";
import { ProductsService, Product } from "@/services/productsService";
import { SoinsService, Soin } from "@/services/soinsService";
import { OptionsService } from "@/services/optionsService";
import {
  ClientsService,
  Client,
  calculateAge,
  Utilisateur,
} from "@/services/clientsService";
import { AuthService } from "@/services/authService";

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FactureFormData) => Promise<void>;
  invoice?: FactureWithDetails | null;
  isLoading?: boolean;
  users: Utilisateur[] | null;
}

export default function InvoiceFormModal({
  isOpen,
  onClose,
  onSubmit,
  invoice,
  isLoading = false,
  users,
}: InvoiceFormModalProps) {
  const [formData, setFormData] =
    useState<FactureFormData>(createEmptyFacture());
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data for dropdowns
  const [clients, setClients] = useState<Client[]>([]);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [soins, setSoins] = useState<Soin[]>([]);
  const [bankNames, setBankNames] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const isEditMode = !!invoice;
  const availableDoctors = getAvailableDoctors();
  const factureStatuses = getFactureStatuses();

  // Load data for dropdowns
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);
        const [clientsData, productsData, soinsData, bankNamesData] =
          await Promise.all([
            ClientsService.getAll(),
            ProductsService.getAll(),
            SoinsService.getAll(),
            OptionsService.getBankNames(),
          ]);
        setClients(clientsData);
        setProducts(productsData);
        setSoins(soinsData);
        setBankNames(bankNamesData);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Initialize form data when invoice changes
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (invoice) {
      const items: FactureItem[] = invoice.items.map((item) => ({
        id_bien: item.id_bien,
        type_bien: item.type_bien,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
        nom_bien: item.nom_bien,
      }));
      setFormData({
        CIN: invoice.CIN,
        date: new Date(invoice.date).toISOString().slice(0, 16),
        statut: invoice.statut,
        notes: invoice.notes,
        Cree_par: invoice.Cree_par || user.CIN,
        date_paiement: invoice.date_paiement
          ? new Date(invoice.date_paiement).toISOString().slice(0, 16)
          : undefined,
        methode_paiement: invoice.methode_paiement,
        cheque_numero: invoice.cheque_numero,
        cheque_banque: invoice.cheque_banque,
        cheque_date_tirage: invoice.cheque_date_tirage,
        items,
      });
    } else {
      setFormData(createEmptyFacture(user.CIN));
    }
    setErrors([]);
  }, [invoice, isOpen]);

  const handleInputChange = (
    field: keyof Omit<FactureFormData, "items">,
    value: any,
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value } as FactureFormData;
      // Clear cheque details when payment method changed away from cheque
      if (field === "methode_paiement" && value !== "Par chéque") {
        next.cheque_numero = undefined;
        next.cheque_banque = undefined;
        next.cheque_date_tirage = undefined;
      }
      // If statut changed away from PAYEE, clear date_paiement
      if (field === "statut" && value !== FactureStatut.PAYEE) {
        next.date_paiement = undefined;
      }
      return next;
    });
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const isFormSubmittable = () => {
    if (!formData.CIN || formData.items.length === 0) return false;
    if (formData.statut === FactureStatut.PAYEE && !formData.date_paiement)
      return false;
    if (formData.methode_paiement === "Par chéque") {
      if (
        !formData.cheque_numero ||
        !formData.cheque_banque ||
        !formData.cheque_date_tirage
      )
        return false;
    }
    return true;
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem()],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (
    index: number,
    field: keyof FactureItem,
    value: any,
  ) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      if (field === "id_bien" && value) {
        const itemId = parseInt(value);
        const currentItem = newItems[index];

        if (currentItem.type_bien === TypeBien.PRODUIT) {
          const product = products.find((p) => p.id === itemId);
          if (product) {
            newItems[index].prix_unitaire = product.prix;
            newItems[index].nom_bien = product.Nom;
          }
        } else {
          const soin = soins.find((s) => s.id === itemId);
          if (soin) {
            newItems[index].prix_unitaire = soin.prix;
            newItems[index].nom_bien = soin.Nom;
            newItems[index].quantite = 1;
          }
        }
      }

      return { ...prev, items: newItems };
    });

    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const getAvailableItems = (type: TypeBien) => {
    return type === TypeBien.PRODUIT ? products : soins;
  };

  const getItemIcon = (type: TypeBien) => {
    return type === TypeBien.PRODUIT ? (
      <Package className="h-4 w-4" />
    ) : (
      <Stethoscope className="h-4 w-4" />
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateFactureData(formData);
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

  const getPatientName = (cin: string) => {
    const client = clients.find((c) => c.CIN === cin);
    return client ? `${client.prenom} ${client.nom}` : cin;
  };

  const filteredClients = clients.filter((client) => {
    const q = clientSearchQuery.toLowerCase();
    return (
      client.nom.toLowerCase().includes(q) ||
      client.prenom.toLowerCase().includes(q) ||
      client.CIN.toLowerCase().includes(q) ||
      client.email.toLowerCase().includes(q)
    );
  });

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setFormData((prev) => ({ ...prev, CIN: client.CIN }));
    setIsClientSelectorOpen(false);
    setClientSearchQuery("");
    if (errors.length > 0) setErrors([]);
  };

  const totals = calculateInvoiceTotals(formData.items);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {isEditMode ? "Modifier la facture" : "Nouvelle facture"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifiez les informations de cette facture"
              : "Créez une nouvelle facture en remplissant les informations ci-dessous"}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations de base</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="CIN" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Patient
                </Label>
                <Popover
                  open={isClientSelectorOpen}
                  onOpenChange={setIsClientSelectorOpen}
                  modal={true as any}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isClientSelectorOpen}
                      className="w-full justify-between"
                      disabled={isSubmitting || isLoadingData}
                    >
                      {formData.CIN ? (
                        <div className="flex items-center gap-2">
                          <span>{getPatientName(formData.CIN)}</span>
                          <Badge variant="outline" className="text-xs">
                            {formData.CIN}
                          </Badge>
                        </div>
                      ) : (
                        "Rechercher et sélectionner un patient..."
                      )}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[500px] p-0 z-[60] shadow-lg border-2"
                    sideOffset={5}
                    align="start"
                  >
                    <Command>
                      <CommandInput
                        placeholder="Rechercher par nom, prénom, CIN, email..."
                        value={clientSearchQuery}
                        onValueChange={setClientSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>Aucun patient trouvé.</CommandEmpty>
                        <CommandGroup>
                          {filteredClients.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.prenom} ${c.nom} ${c.CIN} ${c.email}`}
                              onSelect={() => handleClientSelect(c)}
                              className="flex items-center justify-between p-3"
                            >
                              <div className="flex flex-col">
                                <div className="font-medium">
                                  {c.prenom} {c.nom}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {c.CIN} • Âge:{" "}
                                  {calculateAge(c.date_naissance)} ans •{" "}
                                  {c.email}
                                </div>
                              </div>
                              <Badge variant="outline">
                                {c.groupe_sanguin}
                              </Badge>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {formData.CIN && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {getPatientName(formData.CIN)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          CIN: {formData.CIN}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date de la facture
                </Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="statut">Statut</Label>
                <Select
                  value={formData.statut}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      statut: value as FactureStatut,
                      date_paiement:
                        (value as FactureStatut) === FactureStatut.PAYEE
                          ? prev.date_paiement ||
                            new Date().toISOString().slice(0, 16)
                          : undefined,
                    }));
                    if (errors.length > 0) setErrors([]);
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez le statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {factureStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="Cree_par">Créer par</Label>
                <Select
                  value={formData.Cree_par}
                  onValueChange={(value) =>
                    handleInputChange("Cree_par", value)
                  }
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
            </div>

            {formData.statut === FactureStatut.PAYEE && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_paiement">Date de paiement</Label>
                  <Input
                    id="date_paiement"
                    type="datetime-local"
                    value={formData.date_paiement || ""}
                    onChange={(e) =>
                      handleInputChange("date_paiement", e.target.value)
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="methode_paiement">Méthode de paiement</Label>
                  <Select
                    value={formData.methode_paiement || ""}
                    onValueChange={(value) =>
                      handleInputChange("methode_paiement", value)
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez la méthode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="En Espece">En Espece</SelectItem>
                      <SelectItem value="Paiment Bancaire">
                        Paiment Bancaire
                      </SelectItem>
                      <SelectItem value="Par chéque">Par chéque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.methode_paiement === "Par chéque" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="cheque_numero">Numéro de chèque</Label>
                      <Input
                        id="cheque_numero"
                        value={formData.cheque_numero || ""}
                        onChange={(e) =>
                          handleInputChange("cheque_numero", e.target.value)
                        }
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cheque_banque">Nom de la banque</Label>
                      <Select
                        value={formData.cheque_banque || ""}
                        onValueChange={(value) =>
                          handleInputChange("cheque_banque", value)
                        }
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez la banque" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankNames.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cheque_date_tirage">Date de tirage</Label>
                      <Input
                        id="cheque_date_tirage"
                        type="date"
                        value={formData.cheque_date_tirage || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "cheque_date_tirage",
                            e.target.value,
                          )
                        }
                        disabled={isSubmitting}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Notes sur la facture..."
                disabled={isSubmitting}
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Articles facturés</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                disabled={isSubmitting || isLoadingData}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter un article
              </Button>
            </div>

            {formData.items.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    Aucun article ajouté. Cliquez sur "Ajouter un article" pour
                    commencer.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          {getItemIcon(item.type_bien)}
                          Article {index + 1}
                        </CardTitle>
                        {formData.items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            disabled={isSubmitting}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Type d'article</Label>
                          <Select
                            value={item.type_bien}
                            onValueChange={(value) => {
                              handleItemChange(
                                index,
                                "type_bien",
                                value as TypeBien,
                              );
                              // Reset item selection when changing type
                              handleItemChange(index, "id_bien", 0);
                              handleItemChange(index, "prix_unitaire", 0);
                              handleItemChange(index, "nom_bien", "");
                            }}
                            disabled={isSubmitting || isLoadingData}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={TypeBien.PRODUIT}>
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  Produit
                                </div>
                              </SelectItem>
                              <SelectItem value={TypeBien.SOIN}>
                                <div className="flex items-center gap-2">
                                  <Stethoscope className="h-4 w-4" />
                                  Soin
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Article</Label>
                          <Select
                            value={item.id_bien.toString()}
                            onValueChange={(value) =>
                              handleItemChange(
                                index,
                                "id_bien",
                                parseInt(value),
                              )
                            }
                            disabled={
                              isSubmitting || isLoadingData || !item.type_bien
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez un article" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableItems(item.type_bien).map(
                                (availableItem) => (
                                  <SelectItem
                                    key={availableItem.id}
                                    value={availableItem.id.toString()}
                                  >
                                    <div className="flex items-center justify-between gap-3 w-full">
                                      <span>
                                        {availableItem.Nom} -{" "}
                                        {formatPrice(availableItem.prix)}
                                      </span>
                                      {"stock" in availableItem &&
                                        availableItem.stock === 0 && (
                                          <Badge
                                            variant="destructive"
                                            className="text-xs"
                                          >
                                            Rupture
                                          </Badge>
                                        )}
                                    </div>
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            Quantité
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantite}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantite",
                                parseInt(e.target.value) || 1,
                              )
                            }
                            disabled={
                              isSubmitting || item.type_bien === TypeBien.SOIN
                            }
                            placeholder="1"
                          />
                          {item.type_bien === TypeBien.SOIN && (
                            <p className="text-xs text-muted-foreground">
                              Les soins ont une quantité fixe de 1
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Euro className="h-4 w-4" />
                            Prix unitaire (€)
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.prix_unitaire}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "prix_unitaire",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            disabled={isSubmitting}
                            placeholder="0.00"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Total ligne</Label>
                          <div className="h-10 flex items-center px-3 border rounded-md bg-muted font-mono font-semibold">
                            {formatPrice(item.prix_unitaire * item.quantite)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Total with TVA breakdown */}
            {formData.items.length > 0 && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Sous-total (HT):</span>
                    <span className="font-mono font-medium">
                      {formatPrice(totals.prix_ht)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>TVA ({totals.tva_rate}%):</span>
                    <span className="font-mono font-medium">
                      {formatPrice(totals.tva_amount)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-lg font-semibold">
                    <span>Total TTC:</span>
                    <span className="text-2xl font-bold text-primary font-mono">
                      {formatPrice(totals.prix_total)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
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
              disabled={isSubmitting || !isFormSubmittable()}
              className="min-w-[120px]"
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
