import { AlertTriangle, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Client, calculateAge } from "@/services/clientsService";

interface DeleteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  client: Client | null;
  isLoading?: boolean;
}

export default function DeleteClientModal({
  isOpen,
  onClose,
  onConfirm,
  client,
  isLoading = false,
}: DeleteClientModalProps) {
  if (!client) return null;

  const age = calculateAge(client.date_naissance);

  const handleConfirm = async () => {
    try {
      await onConfirm();
      // Don't call onClose here - let the parent handle it
    } catch (error) {
      // If there's an error, we can handle it here if needed
      console.error("Delete client error:", error);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirmer la suppression
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Êtes-vous sûr de vouloir supprimer ce patient ? Cette action est
                irréversible et supprimera également tous les rendez-vous
                associés.
              </p>

              <div className="bg-muted p-3 rounded-lg">
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Patient:</span>{" "}
                    {client.prenom} {client.nom}
                  </div>
                  <div>
                    <span className="font-medium">CIN:</span> {client.CIN}
                  </div>
                  <div>
                    <span className="font-medium">Âge:</span> {age} ans
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {client.email}
                  </div>
                  <div>
                    <span className="font-medium">Téléphone:</span>{" "}
                    {client.numero_telephone}
                  </div>
                </div>
              </div>

              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Attention: Cette action supprimera définitivement:
                </p>
                <ul className="text-sm text-destructive mt-2 list-disc list-inside">
                  <li>Toutes les informations du patient</li>
                  <li>L'historique médical complet</li>
                  <li>Tous les rendez-vous associés</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Suppression...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Supprimer définitivement
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
