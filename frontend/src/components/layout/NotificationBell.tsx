import React, { useState, useEffect } from 'react';
import { Bell, Clock, Inbox } from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '../ui/popover';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { notificationsApi } from '../../api/notifications.api';
import type { Notification } from '../../api/notifications.api';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: string, link: string | null) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      
      if (link) {
        setIsOpen(false);
        navigate(link);
      }
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-primary/5 transition-colors group">
          <Bell className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-black border-2 border-background animate-in zoom-in duration-300"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0 mr-4 shadow-2xl border-none bg-background/95 backdrop-blur-md overflow-hidden" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-sm uppercase tracking-widest">Notifications</h3>
            {unreadCount > 0 && <Badge variant="secondary" className="text-[10px] font-bold">{unreadCount} New</Badge>}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-[10px] font-black uppercase tracking-tighter hover:text-primary hover:bg-primary/5"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </Button>
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Inbox className="h-6 w-6 text-muted-foreground opacity-20" />
              </div>
              <p className="text-sm font-bold text-muted-foreground">You're all caught up!</p>
              <p className="text-xs text-muted-foreground/60">We'll notify you when something important happens.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border/30">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  onClick={() => handleMarkAsRead(notification.id, notification.link)}
                  className={cn(
                    "relative flex flex-col gap-1 p-4 cursor-pointer transition-all hover:bg-primary/5 group",
                    !notification.isRead && "bg-primary/[0.02]"
                  )}
                >
                  {!notification.isRead && (
                    <div className="absolute left-2 top-5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
                  )}
                  
                  <div className="flex justify-between items-start gap-2">
                    <p className={cn(
                      "text-sm leading-tight",
                      notification.isRead ? "font-medium text-foreground/80" : "font-black text-foreground"
                    )}>
                      {notification.title}
                    </p>
                    <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap flex items-center gap-1">
                       <Clock className="h-3 w-3" />
                       {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-medium">
                    {notification.message}
                  </p>
                  
                  {notification.link && (
                    <div className="mt-2 flex items-center text-[10px] font-black text-primary uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                      Take Action →
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
           <div className="p-3 border-t border-border/30 bg-muted/20 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">End of line</p>
           </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
