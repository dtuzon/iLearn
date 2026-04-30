import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { learningPathsApi } from '../../api/learning-paths.api';
import type { LearningPath } from '../../api/learning-paths.api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  Loader2, 
  Search, 
  BookOpen, 
  Layers,
  Compass,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';


export const DiscoverCatalog: React.FC = () => {
  const navigate = useNavigate();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null);

  const fetchPaths = async () => {
    setIsLoading(true);
    try {
      const data = await learningPathsApi.getAll();
      // Only show published paths
      setPaths(data.filter(p => p.isPublished));
    } catch (error) {
      toast.error('Failed to load catalog');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaths();
  }, []);

  const handleEnroll = async (pathId: string) => {
    setIsEnrolling(pathId);
    try {
      await learningPathsApi.enroll(pathId);
      toast.success('Successfully enrolled in path!');
      navigate('/learning/my-courses');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to enroll');
    } finally {
      setIsEnrolling(null);
    }
  };

  const filteredPaths = paths.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Curating your catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2">
            <Compass className="h-8 w-8" />
            Discover Learning
          </h1>
          <p className="text-muted-foreground text-lg italic">Explore sequenced learning paths designed for your professional growth.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search paths or skills..." 
            className="pl-9 h-11 bg-background/50 border-primary/10 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredPaths.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <BookOpen className="h-16 w-16 mb-4 text-muted-foreground" />
          <h3 className="text-xl font-medium">No paths found</h3>
          <p className="text-sm italic">Try adjusting your search or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPaths.map((path) => (
            <Card key={path.id} className="group flex flex-col border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-background/50 backdrop-blur-sm overflow-hidden">
              <div className="h-2 w-full bg-primary/20 group-hover:bg-primary transition-colors" />
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold">
                    {path.targetAudience}
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {path.pathCourses.length} Courses
                  </Badge>
                </div>
                <CardTitle className="group-hover:text-primary transition-colors leading-tight">
                  {path.title}
                </CardTitle>
                <CardDescription className="line-clamp-3 min-h-[4.5rem]">
                  {path.description || 'No description available for this learning journey.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1">
                    {path.targetDepartments.map((dept, i) => (
                      <Badge key={i} variant="secondary" className="bg-primary/5 text-primary border-none text-[10px]">
                        {dept}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t border-primary/5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Roadmap Preview</p>
                    <div className="space-y-2">
                      {path.pathCourses.slice(0, 3).map((pc, i) => (
                        <div key={pc.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                            {i + 1}
                          </div>
                          <span className="truncate">{pc.course.title}</span>
                        </div>
                      ))}
                      {path.pathCourses.length > 3 && (
                        <p className="text-[10px] text-primary font-medium pl-7">+{path.pathCourses.length - 3} more courses</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/5 pt-4">
                <Button 
                  className="w-full shadow-lg shadow-primary/20 group-hover:translate-x-1 transition-transform"
                  onClick={() => handleEnroll(path.id)}
                  disabled={isEnrolling === path.id}
                >
                  {isEnrolling === path.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Enroll Now
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
