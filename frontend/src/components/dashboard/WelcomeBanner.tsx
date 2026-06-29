import React from 'react';
import type { Announcement } from '../../api/announcements.api';
import { Badge } from '../ui/badge';

interface WelcomeBannerProps {
  announcement: Announcement | undefined;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ announcement }) => {
  if (!announcement || !announcement.imageUrl) return null;

  return (
    <div className="w-full min-h-[250px] sm:min-h-[300px] lg:min-h-[350px] h-auto rounded-xl overflow-hidden shadow-sm relative group transition-all duration-500 hover:shadow-primary/20 border border-border/50 flex flex-col justify-end p-6 sm:p-10">
      <img 
        src={announcement.imageUrl} 
        alt="Bulletin Banner" 
        className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
      
      <div className="relative z-10 space-y-2 max-w-3xl animate-in slide-in-from-bottom-4 duration-700">
        <Badge className="bg-primary/90 hover:bg-primary text-white border-none mb-3 px-3 py-1 text-[10px] tracking-widest font-black uppercase w-fit">
          Bulletin Board
        </Badge>
        <h2 className="text-2xl md:text-4xl font-black text-white leading-tight drop-shadow-2xl tracking-tighter">
          {announcement.title}
        </h2>
        <p className="text-white/90 text-sm md:text-lg font-medium drop-shadow-lg max-w-2xl whitespace-pre-wrap">
          {announcement.content}
        </p>
      </div>
    </div>
  );
};
