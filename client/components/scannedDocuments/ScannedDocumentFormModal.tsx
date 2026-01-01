import { useEffect, useState } from "react";
import {
  FileText,
  Upload,
  AlertTriangle,
  User,
  Search,
  Eye,
  Download,
} from "lucide-react";
import ScannedDocumentViewerModal from "@/components/scannedDocuments/ScannedDocumentViewerModal";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Client,
  ClientsService,
  Utilisateur,
  calculateAge,
} from "@/services/clientsService";
import { AuthService } from "@/services/authService";
import {
  ScannedDocument,
  ScannedDocumentFormData,
  createEmptyScannedDocData,
  validateScannedDoc,
} from "@/services/scannedDocumentsService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ScannedDocumentFormData) => Promise<void>;
  document?: ScannedDocument | null;
  users: Utilisateur[] | null;
  isLoading?: boolean;
  defaultCIN?: string;
  defaultPatient?: Client | null;
  lockPatient?: boolean;
}

export default function ScannedDocumentFormModal({
  isOpen,
  onClose,
  onSubmit,
  document,
  users,
  isLoading = false,
  defaultCIN,
  defaultPatient = null,
  lockPatient = false,
}: Props) {
  const [form, setForm] = useState<ScannedDocumentFormData>(
    createEmptyScannedDocData(),
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const isEdit = !!document;

  useEffect(() => {
    if (!isEdit && !defaultPatient) {
      ClientsService.getAll()
        .then(setClients)
        .catch(() => setClients([]));
    } else if (defaultPatient) {
      console.log(defaultPatient);
      setClients((prev) => (prev.length ? prev : [defaultPatient]));
    }
  }, [isEdit, defaultPatient]);

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (document) {
      console.log(document);
      setForm({
        title: document.title,
        description: document.description || "",
        file: null,
        CIN: document.CIN,
        Cree_par: document.Cree_par,
      });
      const client = clients.find((client) => client.CIN === document.CIN);
      setSelectedClient(client);
      if (defaultPatient && defaultPatient.CIN === document.CIN) {
        setSelectedClient(defaultPatient);
      }
    } else {
      setForm(createEmptyScannedDocData());
      setSelectedClient(null);
    }
    setErrors([]);
  }, [document, isOpen, defaultPatient]);

  useEffect(() => {
    if (!document && (defaultCIN || defaultPatient)) {
      const cin = defaultPatient?.CIN || defaultCIN || "";
      if (defaultPatient) {
        setSelectedClient(defaultPatient);
      } else if (clients.length > 0) {
        const found = clients.find((c) => c.CIN === cin) || null;
        setSelectedClient(found);
      }
      setForm((p) => ({ ...p, CIN: cin }));
    }
  }, [defaultCIN, defaultPatient, clients, document]);

  const filteredClients = clients.filter((c) => {
    const q = clientSearchQuery.toLowerCase();
    return (
      c.nom.toLowerCase().includes(q) ||
      c.prenom.toLowerCase().includes(q) ||
      c.CIN.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateScannedDoc({ ...form }, !isEdit);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(form);
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

  return (
    <Dialog open={isOpen} onOpenChange={() => !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEdit ? "Modifier un document scanné" : "Nouveau document scanné"}
          </DialogTitle>
          <DialogDescription>
            Ajoutez un PDF scanné avec les informations du patient
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                disabled={isSubmitting}
                placeholder="Ex: Analyse sanguine"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description || ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                disabled={isSubmitting}
                rows={3}
                placeholder="Notes facultatives"
              />
            </div>
            <div className="space-y-2">
              <Label>Patient</Label>
              <Popover
                open={lockPatient ? false : isClientSelectorOpen}
                onOpenChange={setIsClientSelectorOpen}
                modal={true as any}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={isClientSelectorOpen}
                    className="w-full justify-between"
                    disabled={isSubmitting || lockPatient}
                  >
                    {selectedClient ? (
                      <div className="flex items-center gap-2">
                        <span>
                          {selectedClient.prenom} {selectedClient.nom}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {selectedClient.CIN}
                        </Badge>
                      </div>
                    ) : form.CIN ? (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          CIN sélectionné:
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {form.CIN}
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
                            onSelect={() => {
                              setSelectedClient(c);
                              setForm((p) => ({ ...p, CIN: c.CIN }));
                              setIsClientSelectorOpen(false);
                              setClientSearchQuery("");
                              if (errors.length > 0) setErrors([]);
                            }}
                            className="flex items-center justify-between p-3"
                          >
                            <div className="flex flex-col">
                              <div className="font-medium">
                                {c.prenom} {c.nom}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {c.CIN} • Âge: {calculateAge(c.date_naissance)}{" "}
                                ans • {c.email}
                              </div>
                            </div>
                            <Badge variant="outline">{c.groupe_sanguin}</Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {(selectedClient || form.CIN) && (
                <div className="p-3 bg-muted/50 rounded-lg mt-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selectedClient ? (
                      <>
                        <span className="font-medium">
                          {selectedClient.prenom} {selectedClient.nom}
                        </span>
                        <span className="text-muted-foreground">
                          ({form.CIN})
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">Patient sélectionné</span>
                        <span className="text-muted-foreground">
                          ({form.CIN})
                        </span>
                      </>
                    )}
                  </div>
                  {lockPatient && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Patient verrouillé pour ce document
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Fichier PDF</Label>
              <Input
                id="file"
                type="file"
                accept="application/pdf"
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    file:
                      e.target.files && e.target.files[0]
                        ? e.target.files[0]
                        : null,
                  }))
                }
                disabled={isSubmitting}
              />
              <div className="text-xs text-muted-foreground">
                Formats: PDF uniquement
              </div>

              {isEdit && document && (
                <div className="space-y-2 mt-2">
                  <Label>Document existant</Label>
                  <div className="border border-border rounded-md overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-muted/50">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-medium">{document.filename}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Un fichier est déjà associé. Vous pouvez le remplacer en
                    sélectionnant un nouveau PDF ci-dessus.
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !form.CIN}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {isEdit ? "Modification..." : "Création..."}
                </div>
              ) : isEdit ? (
                "Modifier"
              ) : (
                "Créer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      {document && (
        <ScannedDocumentViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          document={document}
        />
      )}
    </Dialog>
  );
}
