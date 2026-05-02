import React from 'react';
import type { Announcement } from '../../api/announcements.api';
import { Badge } from '../ui/badge';

interface WelcomeBannerProps {
  announcement: Announcement | undefined;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ announcement }) => {
  if (!announcement || !announcement.imageUrl) return null;

  return (
    <div className="w-full h-[250px] sm:h-[300px] lg:h-[350px] rounded-xl overflow-hidden shadow-sm relative group transition-all duration-500 hover:shadow-primary/20 border border-border/50">
      <img 
        src={announcement.imageUrl} 
        alt="Bulletin Banner" 
        className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 sm:p-10">
         <div className="space-y-2 max-w-3xl animate-in slide-in-from-bottom-4 duration-700">
           <Badge className="bg-primary/90 hover:bg-primary text-white border-none mb-3 px-3 py-1 text-[10px] tracking-widest font-black uppercase">
             Bulletin Board
           </Badge>
           <h2 className="text-2xl md:text-4xl font-black text-white leading-tight drop-shadow-2xl tracking-tighter">
             {announcement.title}
           </h2>
           <p className="text-white/90 text-sm md:text-lg font-medium line-clamp-2 drop-shadow-lg max-w-2xl">
             {announcement.content}
           </p>
         </div>
      </div>
      
      {/* Decorative Corner Label */}
      <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 text-[10px] font-black text-white uppercase tracking-[0.2em] border border-white/20 shadow-xl">
        iLearn Official
      </div>
    </div>
  );
};
