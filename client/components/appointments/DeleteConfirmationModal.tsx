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
import { RendezVous } from "@/services/appointmentsService";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  appointment: RendezVous | null;
  isLoading?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  appointment,
  isLoading = false,
}: DeleteConfirmationModalProps) {
  if (!appointment) return null;

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleConfirm = async () => {
    try {
      await onConfirm();
      // Don't call onClose here - let the parent handle it
    } catch (error) {
      // If there's an error, we can handle it here if needed
      console.error("Delete confirmation error:", error);
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
                Êtes-vous sûr de vouloir supprimer ce rendez-vous ? Cette action
                est irréversible.
              </p>

              <div className="bg-muted p-3 rounded-lg">
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Patient:</span>{" "}
                    {appointment.patient_nom}
                  </div>
                  <div>
                    <span className="font-medium">CIN:</span> {appointment.CIN}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>{" "}
                    {appointment.sujet}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span>{" "}
                    {formatDateTime(appointment.date_rendez_vous)}
                  </div>
                </div>
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
                Supprimer
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
