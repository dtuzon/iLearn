import React, { useState, useEffect } from 'react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '../ui/popover';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Bell, Clock, ExternalLink, Inbox } from 'lucide-react';

import { notificationsApi } from '../../api/notifications.api';
import type { Notification } from '../../api/notifications.api';
import { formatDistanceToNow } from 'date-fns';

import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';


export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Failed to fetch notifications');
    }
  };

  const handleMarkRead = async (id: string, actionUrl: string | null) => {
    try {
      await notificationsApi.markRead(id);
      fetchNotifications();
      if (actionUrl) {
        navigate(actionUrl);
      }
    } catch (error) {
      console.error('Failed to mark as read');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-primary/10 transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold rounded-full border-2 border-background animate-in zoom-in"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-2xl border-none rounded-2xl overflow-hidden" align="end">
        <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            <span className="font-black uppercase tracking-widest text-xs">Notifications</span>
          </div>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
              {unreadCount} NEW
            </span>
          )}
        </div>
        
        <div className="max-h-[400px] overflow-y-auto bg-background">
          {notifications.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Clock className="h-10 w-10 text-muted-foreground/20 mx-auto" />
              <p className="text-sm font-bold text-muted-foreground">All caught up!</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">No new alerts found</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div 
                  key={n.id}
                  onClick={() => handleMarkRead(n.id, n.actionUrl)}
                  className={cn(
                    "p-4 cursor-pointer transition-all hover:bg-muted/50 group relative",
                    !n.isRead ? "bg-primary/5" : "opacity-80"
                  )}
                >
                  {!n.isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-xs font-black uppercase tracking-tight",
                        !n.isRead ? "text-primary" : "text-muted-foreground"
                      )}>
                        {n.title}
                      </p>
                      <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed font-medium text-foreground/80 line-clamp-2">
                      {n.message}
                    </p>
                    {n.actionUrl && (
                      <div className="flex items-center gap-1 mt-2 text-[9px] font-black uppercase text-primary tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        View Action <ExternalLink className="h-2 w-2" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {notifications.length > 0 && (
          <div className="p-2 bg-muted/30 border-t flex justify-center">
             <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest h-8" onClick={fetchNotifications}>
               Refresh Feed
             </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
