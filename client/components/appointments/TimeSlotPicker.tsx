import { useState, useEffect } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  generateTimeSlotsForDate,
  getAvailableDates,
  TimeSlot,
} from "@/services/appointmentsService";

interface TimeSlotPickerProps {
  value?: string; // datetime in YYYY-MM-DDTHH:MM format
  onChange: (datetime: string) => void;
  excludeAppointmentId?: number; // For edit mode, exclude current appointment
  disabled?: boolean;
}

export default function TimeSlotPicker({
  value,
  onChange,
  excludeAppointmentId,
  disabled = false,
}: TimeSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [availableDates, setAvailableDates] = useState<
    { date: Date; hasAvailableSlots: boolean }[]
  >([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Initialize with current value if provided
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      setCurrentWeekStart(getWeekStart(date));
    } else {
      // Start from today
      const today = new Date();
      setCurrentWeekStart(getWeekStart(today));
    }
  }, [value]);

  // Load available dates when component mounts or week changes
  useEffect(() => {
    loadAvailableDates();
  }, [currentWeekStart, excludeAppointmentId]);

  // Load time slots when selected date changes
  useEffect(() => {
    if (selectedDate) {
      const slots = generateTimeSlotsForDate(
        selectedDate,
        excludeAppointmentId,
      );
      setTimeSlots(slots);
    } else {
      setTimeSlots([]);
    }
  }, [selectedDate, excludeAppointmentId]);

  const getWeekStart = (date: Date): Date => {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Start on Monday
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  const loadAvailableDates = () => {
    const dates = getAvailableDates(
      currentWeekStart,
      14, // Load 2 weeks ahead
      excludeAppointmentId,
    );
    setAvailableDates(dates);
  };

  const getWeekDates = (): Date[] => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(
      currentWeekStart.getDate() + (direction === "next" ? 7 : -7),
    );
    setCurrentWeekStart(newWeekStart);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    if (!disabled) {
      onChange(slot.datetime);
    }
  };

  const isDateAvailable = (date: Date): boolean => {
    return availableDates.some(
      (d) =>
        d.date.toDateString() === date.toDateString() && d.hasAvailableSlots,
    );
  };

  const isDateSelected = (date: Date): boolean => {
    return selectedDate?.toDateString() === date.toDateString();
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });
  };

  const formatWeekRange = (): string => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 6);

    return `${currentWeekStart.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    })} - ${weekEnd.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
  };

  const weekDates = getWeekDates();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Sélectionner une date
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigateWeek("prev")}
                disabled={disabled}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {formatWeekRange()}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigateWeek("next")}
                disabled={disabled}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground p-2"
              >
                {day}
              </div>
            ))}
            {weekDates.map((date, index) => {
              const isPast = date < today;
              const isAvailable = isDateAvailable(date);
              const isSelected = isDateSelected(date);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <Button
                  key={index}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "h-12 p-1 flex flex-col items-center justify-center",
                    isPast && "opacity-50 cursor-not-allowed",
                    isWeekend && !isSelected && "bg-muted/50",
                    !isPast && "hover:bg-primary/10",
                    isSelected &&
                      isWeekend &&
                      "bg-primary text-primary-foreground",
                  )}
                  onClick={() => !isPast && handleDateSelect(date)}
                  disabled={disabled || isPast}
                >
                  <span className="text-sm font-medium">{date.getDate()}</span>
                  <span className="text-xs">
                    {formatDate(date).split(" ")[1]}
                  </span>
                  {!isPast && (
                    <div className="w-1 h-1 bg-green-500 rounded-full mt-1" />
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Time Slots */}
      {selectedDate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Créneaux disponibles -{" "}
              {selectedDate.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeSlots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {timeSlots.map((slot, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={value === slot.datetime ? "default" : "outline"}
                    className={cn(
                      "h-10 text-sm hover:bg-primary/10",
                      value === slot.datetime &&
                        "bg-primary text-primary-foreground",
                    )}
                    onClick={() => handleTimeSlotSelect(slot)}
                    disabled={disabled}
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun créneau pour cette date</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Time Display */}
      {value && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <Badge variant="default" className="gap-1">
            <Calendar className="h-3 w-3" />
            Sélectionné
          </Badge>
          <span className="font-medium">
            {new Date(value).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}{" "}
            à{" "}
            {new Date(value).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}
    </div>
  );
}
