import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  AlertCircle, 
  Activity, 
  Copy,
  Layers,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { calendarApi } from '../../api/calendar.api';
import type { CalendarEvent } from '../../api/calendar.api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export const LearningCalendar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Filters
  const [selectedType, setSelectedType] = useState<string>('ALL');
  
  // Selected Event details modal
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load events
  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const data = await calendarApi.getEvents();
        setEvents(data);
      } catch (err: any) {
        toast.error('Failed to load schedule events');
      } finally {
        setIsLoading(false);
      }
    };
    loadEvents();
  }, []);

  // Filter events when selectedType or events change
  useEffect(() => {
    if (selectedType === 'ALL') {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter(e => e.type === selectedType));
    }
  }, [selectedType, events]);

  // Calendar math helper
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to format date strings for comparison (YYYY-MM-DD)
  const getDayString = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  // Check if a calendar day matches a given event
  const getEventsForDay = (dayStr: string) => {
    return filteredEvents.filter(e => {
      const eventStartStr = e.start.split('T')[0];
      const eventEndStr = e.end.split('T')[0];
      return dayStr >= eventStartStr && dayStr <= eventEndStr;
    });
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Event type visual helpers
  const getEventTypeConfig = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'LIVE_SESSION':
        return {
          bg: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-500 border-amber-500/20',
          dot: 'bg-amber-500',
          label: 'Live Webcast',
        };
      case 'COURSE_DEADLINE':
        return {
          bg: 'bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-500 border-red-500/20',
          dot: 'bg-red-500',
          label: 'Deadline',
        };
      case 'BATCH_SCHEDULE':
        return {
          bg: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-500 border-blue-500/20',
          dot: 'bg-blue-500',
          label: 'Batch Schedule',
        };
      case 'COURSE_SCHEDULE':
        return {
          bg: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 border-emerald-500/20',
          dot: 'bg-emerald-500',
          label: 'Course Schedule',
        };
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleOpenEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  // Generate the 35 or 42 grid cells
  const calendarCells = [];

  // Previous month dates
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthTotalDays - i;
    const prevM = month === 0 ? 11 : month - 1;
    const prevY = month === 0 ? year - 1 : year;
    const dayStr = getDayString(prevY, prevM, d);
    calendarCells.push({
      day: d,
      isCurrentMonth: false,
      dayStr,
      events: getEventsForDay(dayStr)
    });
  }

  // Current month dates
  for (let d = 1; d <= totalDays; d++) {
    const dayStr = getDayString(year, month, d);
    calendarCells.push({
      day: d,
      isCurrentMonth: true,
      dayStr,
      events: getEventsForDay(dayStr)
    });
  }

  // Next month dates to pad grid to multiple of 7
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const nextM = month === 11 ? 0 : month + 1;
    const nextY = month === 11 ? year + 1 : year;
    const dayStr = getDayString(nextY, nextM, d);
    calendarCells.push({
      day: d,
      isCurrentMonth: false,
      dayStr,
      events: getEventsForDay(dayStr)
    });
  }

  // Upcoming chronological list (within the next 60 days)
  const upcomingEvents = events
    .filter(e => new Date(e.start) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  const isAdminOrManager = user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header and banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 p-8 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-primary shadow-xl shadow-primary/20 flex items-center justify-center">
            <CalendarIcon className="h-10 w-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-primary">Schedule Calendar</h1>
            <p className="text-muted-foreground text-lg mt-1">
              {isAdminOrManager 
                ? "Oversee cohort timelines and webcast sessions globally." 
                : "Track your live webcasts, deadlines, and learning schedules."
              }
            </p>
          </div>
        </div>
        
        {/* Today button and month pagination */}
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl font-bold" onClick={handleToday}>
            Today
          </Button>
          <div className="flex items-center border rounded-xl bg-background shadow-sm overflow-hidden">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none border-r" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-4 font-bold text-sm select-none min-w-[120px] text-center">
              {monthNames[month]} {year}
            </span>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none border-l" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid Layout: Calendar + Timeline sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left 3 cols: Calendar view */}
        <Card className="lg:col-span-3 border-none shadow-xl rounded-[2rem] bg-background/50 backdrop-blur-sm overflow-hidden flex flex-col">
          <CardHeader className="p-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40">
            <div>
              <CardTitle className="text-xl font-extrabold">Monthly Overview</CardTitle>
              <CardDescription>Click any schedule to view details.</CardDescription>
            </div>
            
            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'ALL', label: 'All schedules' },
                { key: 'LIVE_SESSION', label: 'Live webcasts' },
                { key: 'COURSE_DEADLINE', label: 'Deadlines' },
                { key: 'BATCH_SCHEDULE', label: 'Batches' },
                { key: 'COURSE_SCHEDULE', label: 'Course Schedules' },
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setSelectedType(filter.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm",
                    selectedType === filter.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted text-muted-foreground border-border"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-6 flex-1 flex flex-col">
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-4">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar grid */}
            {isLoading ? (
              <div className="flex-1 min-h-[400px] flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2 flex-1">
                {calendarCells.map((cell, idx) => {
                  const isToday = cell.dayStr === getDayString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "min-h-[100px] p-2 border border-border/30 rounded-2xl flex flex-col justify-between transition-all bg-card/10 hover:bg-muted/30 relative",
                        !cell.isCurrentMonth && "opacity-30",
                        isToday && "border-primary shadow-sm bg-primary/[0.02]"
                      )}
                    >
                      {/* Day Number */}
                      <span className={cn(
                        "text-xs font-black self-start h-6 w-6 flex items-center justify-center rounded-lg",
                        isToday && "bg-primary text-primary-foreground"
                      )}>
                        {cell.day}
                      </span>

                      {/* Day events container */}
                      <div className="space-y-1 mt-2 flex-1 flex flex-col justify-end">
                        {cell.events.slice(0, 3).map((event) => {
                          const config = getEventTypeConfig(event.type);
                          return (
                            <button
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEvent(event);
                              }}
                              className={cn(
                                "w-full text-left truncate text-[10px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1.5",
                                config.bg
                              )}
                            >
                              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)} />
                              <span className="truncate">{event.title.replace(/^\[.*?\]\s*/, '')}</span>
                            </button>
                          );
                        })}
                        {cell.events.length > 3 && (
                          <div className="text-[9px] font-black text-muted-foreground text-center uppercase tracking-tighter opacity-60">
                            + {cell.events.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right 1 col: Upcoming schedules list */}
        <Card className="border-none shadow-xl rounded-[2rem] bg-background/50 backdrop-blur-sm overflow-hidden flex flex-col">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-lg font-extrabold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Upcoming Feed
            </CardTitle>
            <CardDescription>Next timeline milestones.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 space-y-4 overflow-y-auto">
            {isLoading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground italic text-sm">
                No upcoming events schedule.
              </div>
            ) : (
              upcomingEvents.map((event) => {
                const config = getEventTypeConfig(event.type);
                const eventDate = new Date(event.start);
                return (
                  <div
                    key={event.id}
                    onClick={() => handleOpenEvent(event)}
                    className="p-4 rounded-2xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group space-y-2 relative overflow-hidden"
                  >
                    <div className={cn("absolute top-0 left-0 bottom-0 w-1", config.dot)} />
                    <div className="flex items-center justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                      <span>{config.label}</span>
                      <span>{eventDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <h4 className="font-bold text-sm text-foreground line-clamp-2 pl-1 leading-tight group-hover:text-primary transition-colors">
                      {event.title.replace(/^\[.*?\]\s*/, '')}
                    </h4>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule Detail Dialog Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8 border-border/50 shadow-2xl backdrop-blur-xl">
          {selectedEvent && (() => {
            const config = getEventTypeConfig(selectedEvent.type);
            const startDateObj = new Date(selectedEvent.start);
            const endDateObj = new Date(selectedEvent.end);
            
            return (
              <>
                <DialogHeader className="space-y-3">
                  <div className="flex items-center gap-2 self-start">
                    <span className={cn("h-2 w-2 rounded-full", config.dot)} />
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      {config.label}
                    </span>
                  </div>
                  <DialogTitle className="text-2xl font-black text-foreground leading-snug">
                    {selectedEvent.title.replace(/^\[.*?\]\s*/, '')}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 my-6">
                  {/* Time Detail box */}
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Date & Time</p>
                      <p className="font-bold text-sm text-foreground mt-1">
                        {startDateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      {selectedEvent.type !== 'COURSE_DEADLINE' && (
                        <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                          {startDateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - {endDateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metadata based on event type */}
                  {selectedEvent.type === 'LIVE_SESSION' && selectedEvent.extendedProps && (
                    <div className="space-y-4">
                      {/* Webcast Connection Cards */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border bg-muted/20 relative">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Meeting ID</p>
                          <p className="font-bold text-sm mt-1">{selectedEvent.extendedProps.meetingId || 'N/A'}</p>
                          {selectedEvent.extendedProps.meetingId && (
                            <button 
                              onClick={() => handleCopy(selectedEvent.extendedProps?.meetingId || '', 'Meeting ID')}
                              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="p-4 rounded-xl border bg-muted/20 relative">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Passcode</p>
                          <p className="font-bold text-sm mt-1">{selectedEvent.extendedProps.passcode || 'N/A'}</p>
                          {selectedEvent.extendedProps.passcode && (
                            <button 
                              onClick={() => handleCopy(selectedEvent.extendedProps?.passcode || '', 'Passcode')}
                              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Course reference if available */}
                      {selectedEvent.extendedProps.courseTitle && (
                        <div className="p-4 rounded-2xl border bg-muted/10 flex items-center gap-3">
                          <BookOpen className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Course Module</p>
                            <p className="text-xs font-bold text-foreground mt-0.5">{selectedEvent.extendedProps.courseTitle}</p>
                          </div>
                        </div>
                      )}

                      {/* Launch webcast action button */}
                      {selectedEvent.extendedProps.joinUrl && (
                        <Button
                          onClick={() => {
                            window.open(selectedEvent.extendedProps?.joinUrl, '_blank', 'noopener,noreferrer');
                            toast.success('Launching Zoom Live Meeting...');
                          }}
                          className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform"
                        >
                          <Video className="mr-2 h-5 w-5" /> Launch Zoom Webcast
                        </Button>
                      )}
                    </div>
                  )}

                  {selectedEvent.type === 'BATCH_SCHEDULE' && selectedEvent.extendedProps && (
                    <div className="p-4 rounded-2xl bg-muted/10 flex items-start gap-3">
                      <Layers className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Batch Group</p>
                        <p className="font-bold text-sm text-foreground mt-1">{selectedEvent.extendedProps.batchName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Target: {selectedEvent.extendedProps.targetTitle}</p>
                      </div>
                    </div>
                  )}

                  {selectedEvent.type === 'COURSE_SCHEDULE' && selectedEvent.extendedProps && (
                    <div className="p-4 rounded-2xl bg-muted/10 flex items-start gap-3">
                      <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Scheduled Course</p>
                        <p className="font-bold text-sm text-foreground mt-1">{selectedEvent.extendedProps.courseTitle}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Batch: {selectedEvent.extendedProps.batchName}</p>
                      </div>
                    </div>
                  )}

                  {selectedEvent.type === 'COURSE_DEADLINE' && selectedEvent.extendedProps && (
                    <div className="space-y-4">
                      {selectedEvent.extendedProps.learnerName && (
                        <div className="p-4 rounded-2xl bg-muted/10 flex items-start gap-3">
                          <Activity className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Assigned Learner</p>
                            <p className="font-bold text-sm text-foreground mt-1">{selectedEvent.extendedProps.learnerName}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="p-4 rounded-2xl bg-muted/10 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Action Requirement</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            This course must be fully completed by this date to ensure compliance.
                          </p>
                        </div>
                      </div>

                      {!isAdminOrManager && (
                        <Button
                          onClick={() => {
                            setIsModalOpen(false);
                            navigate('/learning/my-courses');
                          }}
                          className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        >
                          Go to My Learning
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl w-full">
                    Close Details
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
