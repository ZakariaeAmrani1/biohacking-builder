import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AppointmentsService,
  RendezVous,
} from "@/services/appointmentsService";
import CalendarAppointmentModal from "./CalendarAppointmentModal";
import { UserService } from "@/services/userService";
import { Utilisateur } from "@/services/clientsService";
import { useToast } from "@/hooks/use-toast";

// Interface for calendar display
interface CalendarAppointment {
  id: number;
  time: string;
  duration: number;
  patient: string;
  treatment: string;
  status: string;
  date: Date;
}

const statusColors = {
  confirmé: "bg-green-100 text-green-700 border-green-200",
  programmé: "bg-blue-100 text-blue-700 border-blue-200",
  terminé: "bg-gray-100 text-gray-700 border-gray-200",
  annulé: "bg-red-100 text-red-700 border-red-200",
};

const statusTranslations = {
  confirmé: "confirmé",
  programmé: "programmé",
  terminé: "terminé",
  annulé: "annulé",
};

export default function AppointmentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "day">("week");
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] =
    useState<CalendarAppointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  // Convert RendezVous to CalendarAppointment format
  const convertToCalendarFormat = (
    rendezVous: RendezVous[],
  ): CalendarAppointment[] => {
    return rendezVous.map((apt) => {
      const appointmentDate = new Date(apt.date_rendez_vous);
      const timeString = appointmentDate.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      return {
        id: apt.id,
        time: timeString,
        duration: 60, // Default duration
        patient: apt.patient_nom || "Patient inconnu",
        treatment: apt.sujet,
        status: apt.status || "programmé",
        date: appointmentDate,
      };
    });
  };

  // Load appointments
  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await AppointmentsService.getAll();
      const calendarAppointments = convertToCalendarFormat(data);
      setAppointments(calendarAppointments);
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await UserService.getCurrentAllUsers();
      setUsers(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load appointments on component mount
  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  // Listen for appointment updates
  useEffect(() => {
    const handleActivityLogged = () => {
      console.log(
        "Calendar received activityLogged event, reloading appointments...",
      );
      loadAppointments();
    };

    window.addEventListener("activityLogged", handleActivityLogged);
    return () => {
      window.removeEventListener("activityLogged", handleActivityLogged);
    };
  }, []);

  const weekDays = [
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
    "Dimanche",
  ];
  const timeSlots = Array.from({ length: 10 }, (_, i) => `${10 + i}:00`);

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    setCurrentDate(newDate);
  };

  const getWeekDates = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      month: "short",
      day: "numeric",
    });
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(
      (apt) => apt.date.toDateString() === date.toDateString(),
    );
  };

  const handleAppointmentClick = (appointment: CalendarAppointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleModalClose = (statusChanged: boolean = false) => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
    // Only reload if status was actually changed
    if (statusChanged) {
      loadAppointments();
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-xl font-semibold">
            Calendrier des Rendez-vous
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex rounded-lg border border-border p-1">
              <Button
                variant={view === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("week")}
                className="h-8"
              >
                Semaine
              </Button>
              <Button
                variant={view === "day" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("day")}
                className="h-8"
              >
                Journée
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek("prev")}
                className="h-8 w-8 flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[120px] text-center text-sm font-medium px-2">
                {currentDate.toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek("next")}
                className="h-8 w-8 flex-shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">
              Chargement des rendez-vous...
            </div>
          </div>
        ) : view === "week" ? (
          <div className="overflow-x-auto grid grid-cols-8 border-t border-border min-w-[700px]">
            {/* Time column */}
            <div className="border-r border-border">
              <div className="h-12 border-b border-border"></div>
              {timeSlots.map((time) => (
                <div
                  key={time}
                  className="h-20 border-b border-border px-2 py-1 text-xs text-muted-foreground"
                >
                  {time}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {getWeekDates().map((date, dayIndex) => (
              <div
                key={dayIndex}
                className={`border-r border-border last:border-r-0 ${
                  isToday(date) ? "bg-primary/5" : ""
                }`}
              >
                <div
                  className={`h-12 border-b border-border px-2 py-2 text-center ${
                    isToday(date) ? "bg-primary/10 border-primary/20" : ""
                  }`}
                >
                  <div
                    className={`text-xs font-medium ${
                      isToday(date) ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {weekDays[dayIndex]}
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      isToday(date) ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {formatDate(date)}
                    {isToday(date) && (
                      <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-primary"></span>
                    )}
                  </div>
                </div>
                {timeSlots.map((time, timeIndex) => {
                  const dayAppointments = getAppointmentsForDate(date);
                  const slotHour = parseInt(time.split(":")[0]); // Extract hour from slot (e.g., 14 from "14:00")
                  const timeAppointments = dayAppointments.filter((apt) => {
                    const aptHour = parseInt(apt.time.split(":")[0]); // Extract hour from appointment time
                    return aptHour === slotHour; // Match appointments to the hour slot
                  });

                  return (
                    <div
                      key={timeIndex}
                      className="h-20 border-b border-border p-1 relative"
                    >
                      {timeAppointments.map((appointment, aptIndex) => (
                        <div
                          key={appointment.id}
                          className={`absolute inset-x-1 rounded-md bg-primary/10 border border-primary/20 p-2 text-xs overflow-hidden cursor-pointer hover:bg-primary/20 hover:border-primary/30 transition-colors ${
                            timeAppointments.length > 1
                              ? `top-${aptIndex * 10 + 1} h-${Math.max(18, 78 / timeAppointments.length)}`
                              : "top-1 bottom-1"
                          }`}
                          style={
                            timeAppointments.length > 1
                              ? {
                                  top: `${aptIndex * (76 / timeAppointments.length) + 2}px`,
                                  height: `${76 / timeAppointments.length - 2}px`,
                                }
                              : undefined
                          }
                          onClick={() => handleAppointmentClick(appointment)}
                          title={`Cliquer pour voir les détails de ${appointment.patient}`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <Clock className="h-3 w-3 text-primary" />
                            <span className="text-primary font-medium">
                              {appointment.time}
                            </span>
                          </div>
                          <div className="font-medium text-primary truncate">
                            {appointment.patient}
                          </div>
                          <div className="text-muted-foreground truncate">
                            {appointment.treatment}
                          </div>
                          <Badge
                            variant="secondary"
                            className={`text-xs mt-1 ${statusColors[appointment.status as keyof typeof statusColors]}`}
                          >
                            {
                              statusTranslations[
                                appointment.status as keyof typeof statusTranslations
                              ]
                            }
                          </Badge>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4">
            {/* Day view header with date navigation */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setDate(newDate.getDate() - 1);
                    setCurrentDate(newDate);
                  }}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <h3
                    className={`font-semibold text-lg ${isToday(currentDate) ? "text-primary" : ""}`}
                  >
                    {currentDate.toLocaleDateString("fr-FR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                  {isToday(currentDate) && (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <span className="inline-flex h-2 w-2 rounded-full bg-primary"></span>
                      <span className="text-sm text-primary font-medium">
                        Aujourd'hui
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setDate(newDate.getDate() + 1);
                    setCurrentDate(newDate);
                  }}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                {getAppointmentsForDate(currentDate).length} rendez-vous
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">
                  Chargement des rendez-vous...
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {getAppointmentsForDate(currentDate).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">
                      Aucun rendez-vous
                    </p>
                    <p className="text-sm">
                      {isToday(currentDate)
                        ? "Vous n'avez aucun rendez-vous aujourd'hui"
                        : `Aucun rendez-vous prévu pour le ${currentDate.toLocaleDateString("fr-FR")}`}
                    </p>
                  </div>
                ) : (
                  getAppointmentsForDate(currentDate)
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => handleAppointmentClick(appointment)}
                        title={`Cliquer pour voir les détails de ${appointment.patient}`}
                      >
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {appointment.time}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {appointment.patient}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {appointment.treatment}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            statusColors[
                              appointment.status as keyof typeof statusColors
                            ]
                          }
                        >
                          {
                            statusTranslations[
                              appointment.status as keyof typeof statusTranslations
                            ]
                          }
                        </Badge>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Appointment Details Modal */}
      <CalendarAppointmentModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        appointment={selectedAppointment}
        users={users}
      />
    </Card>
  );
}
