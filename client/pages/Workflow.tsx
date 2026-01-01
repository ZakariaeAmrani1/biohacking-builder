import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  ClientsService,
  Client,
  ClientFormData,
} from "@/services/clientsService";
import {
  AppointmentsService,
  RendezVous,
  AppointmentFormData,
} from "@/services/appointmentsService";
import {
  InvoicesService,
  FactureFormData,
  FactureStatut,
  TypeBien,
  FactureItem,
} from "@/services/invoicesService";
import { ProductsService, Product } from "@/services/productsService";
import { SoinsService, Soin } from "@/services/soinsService";
import { UserService } from "@/services/userService";
import { AuthService } from "@/services/authService";

interface WorkflowFormData {
  // Step 1: Client
  selectedClientId?: number;
  clientCIN: string;
  clientNom: string;
  clientPrenom: string;
  clientDateNaissance: string;
  clientAdresse: string;
  clientTelephone: string;
  clientEmail: string;
  clientGroupSanguin: string;
  clientAntecedents: string;
  clientAllergies: string;
  isNewClient: boolean;

  // Step 2: Appointment
  appointmentDate: string;
  appointmentSubject: string;
  appointmentCabinet: string;
  appointmentSoinId: string;
  appointmentStatus: "programmé" | "confirmé" | "terminé" | "annulé";

  // Step 3: Products/Services
  invoiceItems: FactureItem[];

  // Step 4: Invoice
  invoiceDate: string;
  invoiceNotes: string;
  invoiceStatut: FactureStatut;

  // Step 5: Payment
  paymentDate: string;
  paymentMethod: string;
  paymentAmount: number;
  chequeNumero?: string;
  chequeBanque?: string;
  chequeDateTirage?: string;
}

const STEPS = [
  { id: 1, label: "Client", description: "Select or create client" },
  { id: 2, label: "Appointment", description: "Create appointment" },
  { id: 3, label: "Products", description: "Select products/services" },
  { id: 4, label: "Invoice", description: "Create invoice" },
  { id: 5, label: "Payment", description: "Process payment" },
];

export default function Workflow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [soins, setSoins] = useState<Soin[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<WorkflowFormData>({
    defaultValues: {
      isNewClient: true,
      appointmentStatus: "programmé",
      invoiceStatut: FactureStatut.BROUILLON,
      invoiceItems: [],
      paymentAmount: 0,
      paymentMethod: "cash",
      clientGroupSanguin: "O+",
    },
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [clientsData, soinsData, productsData, employeesData] =
        await Promise.all([
          ClientsService.getAll(),
          SoinsService.getAll(),
          ProductsService.getAll(),
          UserService.getAll(),
        ]);

      setClients(clientsData);
      setSoins(soinsData);
      setProducts(productsData);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load initial data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientSelect = (clientId: string) => {
    const selected = clients.find((c) => c.id === parseInt(clientId));
    if (selected) {
      form.setValue("selectedClientId", selected.id);
      form.setValue("clientCIN", selected.CIN);
      form.setValue("clientNom", selected.nom);
      form.setValue("clientPrenom", selected.prenom);
      form.setValue("clientEmail", selected.email);
      form.setValue("clientTelephone", selected.numero_telephone);
      form.setValue("clientDateNaissance", selected.date_naissance);
      form.setValue("clientAdresse", selected.adresse);
      form.setValue("clientGroupSanguin", selected.groupe_sanguin);
      form.setValue("clientAntecedents", selected.antecedents);
      form.setValue("clientAllergies", selected.allergies);
      form.setValue("isNewClient", false);
    }
  };

  const addInvoiceItem = (itemData: {
    productId: string;
    quantity: number;
    itemType: string;
  }) => {
    const currentItems = form.getValues("invoiceItems") || [];

    let selectedItem: Product | Soin | undefined;
    let itemType = itemData.itemType;

    if (itemType === "produit") {
      selectedItem = products.find((p) => p.id === parseInt(itemData.productId));
    } else {
      selectedItem = soins.find((s) => s.id === parseInt(itemData.productId));
    }

    if (!selectedItem) {
      toast({
        title: "Error",
        description: "Product or service not found",
        variant: "destructive",
      });
      return;
    }

    const newItem: FactureItem = {
      id_bien: parseInt(itemData.productId),
      type_bien:
        itemType === "produit" ? TypeBien.PRODUIT : TypeBien.SOIN,
      quantite: itemData.quantity,
      prix_unitaire: selectedItem.prix,
      nom_bien: selectedItem.Nom,
    };

    form.setValue("invoiceItems", [...currentItems, newItem]);
    toast({
      title: "Success",
      description: `${selectedItem.Nom} added to invoice`,
    });
  };

  const removeInvoiceItem = (index: number) => {
    const currentItems = form.getValues("invoiceItems") || [];
    form.setValue(
      "invoiceItems",
      currentItems.filter((_, i) => i !== index)
    );
  };

  const calculateTotal = () => {
    const items = form.getValues("invoiceItems") || [];
    const subtotal = items.reduce(
      (total, item) => total + item.prix_unitaire * item.quantite,
      0
    );
    const tva = subtotal * 0.2;
    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tva: parseFloat(tva.toFixed(2)),
      total: parseFloat((subtotal + tva).toFixed(2)),
    };
  };

  const onSubmit = async (data: WorkflowFormData) => {
    try {
      setIsLoading(true);
      const currentUser = AuthService.getCurrentUser();

      // Step 1: Create or use existing client
      let clientId: number;
      if (data.isNewClient) {
        const clientData: ClientFormData = {
          CIN: data.clientCIN,
          nom: data.clientNom,
          prenom: data.clientPrenom,
          date_naissance: data.clientDateNaissance,
          adresse: data.clientAdresse,
          numero_telephone: data.clientTelephone,
          email: data.clientEmail,
          groupe_sanguin: data.clientGroupSanguin,
          antecedents: data.clientAntecedents,
          allergies: data.clientAllergies,
          commentaire: "",
          Cree_par: currentUser.CIN,
        };
        const newClient = await ClientsService.create(clientData);
        clientId = newClient.id;
      } else {
        clientId = data.selectedClientId!;
      }

      // Step 2: Create appointment
      const appointmentData: AppointmentFormData = {
        client_id: clientId,
        CIN: data.clientCIN,
        sujet: data.appointmentSubject,
        date_rendez_vous: new Date(data.appointmentDate).toISOString(),
        Cree_par: currentUser.CIN,
        status: data.appointmentStatus,
        Cabinet: data.appointmentCabinet,
        soin_id: parseInt(data.appointmentSoinId),
      };
      const newAppointment = await AppointmentsService.create(appointmentData);

      // Step 4: Create invoice
      const invoiceData: FactureFormData = {
        CIN: data.clientCIN,
        date: new Date(data.invoiceDate).toISOString(),
        statut: data.invoiceStatut,
        notes: data.invoiceNotes,
        Cree_par: currentUser.CIN,
        items: data.invoiceItems,
        date_paiement: data.paymentMethod
          ? new Date(data.paymentDate).toISOString()
          : undefined,
        methode_paiement: data.paymentMethod,
        cheque_numero: data.chequeNumero,
        cheque_banque: data.chequeBanque,
        cheque_date_tirage: data.chequeDateTirage,
      };
      const newInvoice = await InvoicesService.create(invoiceData);

      toast({
        title: "Success",
        description:
          "Workflow completed successfully! Client, appointment, and invoice created.",
      });

      // Reset form
      form.reset();
      setCurrentStep(1);
    } catch (error) {
      console.error("Error submitting workflow:", error);
      toast({
        title: "Error",
        description: "Failed to complete workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1: {
        const isNewClient = form.getValues("isNewClient");
        if (isNewClient) {
          return (
            form.getValues("clientCIN") &&
            form.getValues("clientNom") &&
            form.getValues("clientPrenom") &&
            form.getValues("clientEmail")
          );
        }
        return !!form.getValues("selectedClientId");
      }
      case 2: {
        return (
          form.getValues("appointmentDate") &&
          form.getValues("appointmentSubject") &&
          form.getValues("appointmentCabinet") &&
          form.getValues("appointmentSoinId")
        );
      }
      case 3: {
        const items = form.getValues("invoiceItems");
        return items && items.length > 0;
      }
      case 4: {
        return form.getValues("invoiceDate");
      }
      case 5: {
        return (
          form.getValues("paymentDate") && form.getValues("paymentMethod")
        );
      }
      default:
        return true;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Complete Workflow
          </h1>
          <p className="text-muted-foreground">
            Manage client from creation to payment in one place
          </p>
        </div>

        {/* Step Indicators */}
        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm cursor-pointer transition-all ${
                      currentStep >= step.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground border border-border"
                    }`}
                    onClick={() => {
                      if (currentStep > step.id) {
                        setCurrentStep(step.id);
                      }
                    }}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                        currentStep > step.id ? "bg-primary" : "bg-secondary"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-4 mt-4">
              {STEPS.map((step) => (
                <div key={step.id} className="text-center">
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Form Steps */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Client Selection */}
            {currentStep === 1 && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Select Client Type
                    </Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={
                          form.getValues("isNewClient")
                            ? "default"
                            : "outline"
                        }
                        onClick={() => {
                          form.setValue("isNewClient", true);
                          form.setValue("selectedClientId", undefined);
                        }}
                        className="flex-1"
                      >
                        <Plus className="w-4 h-4 mr-2" /> New Client
                      </Button>
                      <Button
                        type="button"
                        variant={
                          !form.getValues("isNewClient")
                            ? "default"
                            : "outline"
                        }
                        onClick={() => {
                          form.setValue("isNewClient", false);
                          form.setValue("clientCIN", "");
                          form.setValue("clientNom", "");
                          form.setValue("clientPrenom", "");
                          form.setValue("clientEmail", "");
                          form.setValue("clientTelephone", "");
                        }}
                        className="flex-1"
                      >
                        Existing Client
                      </Button>
                    </div>
                  </div>

                  {form.getValues("isNewClient") ? (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="clientCIN"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CIN</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter CIN" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="clientNom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="clientPrenom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter first name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="clientEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Enter email"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="clientTelephone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="clientDateNaissance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="clientAdresse"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="clientGroupSanguin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Blood Group</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="O+">O+</SelectItem>
                                <SelectItem value="O-">O-</SelectItem>
                                <SelectItem value="A+">A+</SelectItem>
                                <SelectItem value="A-">A-</SelectItem>
                                <SelectItem value="B+">B+</SelectItem>
                                <SelectItem value="B-">B-</SelectItem>
                                <SelectItem value="AB+">AB+</SelectItem>
                                <SelectItem value="AB-">AB-</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="clientAntecedents"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Medical History</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter medical history"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="clientAllergies"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Allergies</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter allergies"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <FormField
                      control={form.control}
                      name="selectedClientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Client</FormLabel>
                          <Select
                            onValueChange={(value) =>
                              handleClientSelect(value)
                            }
                            defaultValue={
                              field.value ? String(field.value) : ""
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a client..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={String(client.id)}>
                                  {client.prenom} {client.nom}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Appointment */}
            {currentStep === 2 && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Create Appointment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="appointmentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appointment Date & Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="appointmentSubject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject/Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter appointment subject"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="appointmentCabinet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cabinet</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select cabinet" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Biohacking">
                              Biohacking
                            </SelectItem>
                            <SelectItem value="Nassens">Nassens</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="appointmentSoinId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service/Treatment</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select service" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {soins.map((soin) => (
                              <SelectItem key={soin.id} value={String(soin.id)}>
                                {soin.Nom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="appointmentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="programmé">
                              Scheduled
                            </SelectItem>
                            <SelectItem value="confirmé">
                              Confirmed
                            </SelectItem>
                            <SelectItem value="terminé">Completed</SelectItem>
                            <SelectItem value="annulé">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 3: Products Selection */}
            {currentStep === 3 && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Select Products & Services</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="border border-dashed border-border rounded-lg p-4 bg-secondary/20">
                      <p className="text-sm font-medium mb-4">
                        Add Products or Services
                      </p>
                      <ProductItemSelector
                        products={products}
                        soins={soins}
                        onAddItem={addInvoiceItem}
                      />
                    </div>

                    {(form.getValues("invoiceItems") || []).length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Added Items</p>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {(form.getValues("invoiceItems") || []).map(
                            (item, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 border border-border rounded-lg bg-card"
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {item.nom_bien}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Qty: {item.quantite} × €
                                    {item.prix_unitaire.toFixed(2)} = €
                                    {(
                                      item.quantite * item.prix_unitaire
                                    ).toFixed(2)}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeInvoiceItem(index)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Invoice */}
            {currentStep === 4 && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Invoice Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="invoiceDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="invoiceNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter invoice notes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="invoiceStatut"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={FactureStatut.BROUILLON}>
                              Draft
                            </SelectItem>
                            <SelectItem value={FactureStatut.ENVOYEE}>
                              Sent
                            </SelectItem>
                            <SelectItem value={FactureStatut.PAYEE}>
                              Paid
                            </SelectItem>
                            <SelectItem value={FactureStatut.ANNULEE}>
                              Cancelled
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Invoice Summary */}
                  <div className="border border-border rounded-lg p-4 bg-secondary/10">
                    <p className="text-sm font-semibold mb-3">
                      Invoice Summary
                    </p>
                    {(form.getValues("invoiceItems") || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No items added. Please go back to step 3.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(() => {
                          const { subtotal, tva, total } = calculateTotal();
                          return (
                            <>
                              <div className="flex justify-between text-sm">
                                <span>Subtotal (HT):</span>
                                <span className="font-medium">
                                  €{subtotal.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>VAT (20%):</span>
                                <span className="font-medium">
                                  €{tva.toFixed(2)}
                                </span>
                              </div>
                              <div className="border-t border-border pt-2 mt-2 flex justify-between">
                                <span className="font-semibold">Total:</span>
                                <span className="font-bold text-primary">
                                  €{total.toFixed(2)}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Payment */}
            {currentStep === 5 && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Payment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                            <SelectItem value="bank">Bank Transfer</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.getValues("paymentMethod") === "cheque" && (
                    <>
                      <FormField
                        control={form.control}
                        name="chequeNumero"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cheque Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter cheque number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="chequeBanque"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bank Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter bank name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="chequeDateTirage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cheque Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <div className="border border-border rounded-lg p-4 bg-secondary/10">
                    <p className="text-sm font-semibold mb-2">
                      Total Amount to Pay
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      €{calculateTotal().total.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>

              {currentStep < 5 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceedToNextStep() || isLoading}
                >
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!canProceedToNextStep() || isLoading}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" /> Complete Workflow
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}

// Helper Component for Product/Service Selection
function ProductItemSelector({
  products,
  soins,
  onAddItem,
}: {
  products: Product[];
  soins: Soin[];
  onAddItem: (data: {
    productId: string;
    quantity: number;
    itemType: string;
  }) => void;
}) {
  const [selectedType, setSelectedType] = useState<"produit" | "soin">(
    "produit"
  );
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    if (selectedId) {
      onAddItem({
        productId: selectedId,
        quantity,
        itemType: selectedType,
      });
      setSelectedId("");
      setQuantity(1);
    }
  };

  const currentItems = selectedType === "produit" ? products : soins;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={selectedType === "produit" ? "default" : "outline"}
          onClick={() => setSelectedType("produit")}
        >
          Products
        </Button>
        <Button
          type="button"
          size="sm"
          variant={selectedType === "soin" ? "default" : "outline"}
          onClick={() => setSelectedType("soin")}
        >
          Services
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue
              placeholder={
                selectedType === "produit"
                  ? "Select product..."
                  : "Select service..."
              }
            />
          </SelectTrigger>
          <SelectContent>
            {currentItems.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.Nom} - €{item.prix.toFixed(2)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value)))}
            placeholder="Quantity"
          />
        </div>

        <Button type="button" onClick={handleAdd} disabled={!selectedId}>
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </Button>
      </div>
    </div>
  );
}
