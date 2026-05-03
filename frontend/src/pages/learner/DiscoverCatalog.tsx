import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogApi, type CatalogItem } from '../../api/catalog.api';
import { learningPathsApi } from '../../api/learning-paths.api';
import { enrollmentsApi } from '../../api/enrollments.api';
import { departmentsApi, type Department } from '../../api/departments.api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  Loader2, 
  Search, 
  BookOpen, 
  Layers,
  Compass,
  Plus,
  Filter,
  ArrowUpDown,
  Zap,
  Star,
  LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../components/ui/select';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '../../components/ui/tabs';
import { cn } from '../../lib/utils';

export const DiscoverCatalog: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null);
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'courses' | 'paths'>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [category, setCategory] = useState('ALL');

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catalogData, deptData] = await Promise.all([
        catalogApi.getDiscovery({
          search: debouncedSearch,
          type: activeTab,
          sort: sortBy,
          category: category
        }),
        departmentsApi.getAll()
      ]);
      setItems(catalogData);
      setDepartments(deptData);
    } catch (error) {
      toast.error('Failed to load catalog');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, activeTab, sortBy, category]);

  const handleEnroll = async (item: CatalogItem) => {
    setIsEnrolling(item.id);
    try {
      if (item.contentType === 'PATH') {
        await learningPathsApi.enroll(item.id);
      } else {
        await enrollmentsApi.enroll(item.id);
      }
      toast.success(`Successfully enrolled in ${item.title}!`);
      navigate('/learning/my-courses');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to enroll');
    } finally {
      setIsEnrolling(null);
    }
  };

  const CourseCard = ({ item }: { item: CatalogItem }) => (
    <Card key={item.id} className="group flex flex-col border-none shadow-md hover:shadow-xl transition-all duration-300 bg-background/50 backdrop-blur-sm overflow-hidden border-t-4 border-purple-500">
      <div className="relative h-40 overflow-hidden bg-muted">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-purple-500/40" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge className="bg-purple-500 hover:bg-purple-600 border-none">COURSE</Badge>
        </div>
      </div>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-lg line-clamp-1 group-hover:text-purple-600 transition-colors">{item.title}</CardTitle>
        <CardDescription className="line-clamp-2 text-xs h-8">{item.description || 'No description available.'}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1">
        <div className="flex flex-wrap gap-1 mt-2">
           {item.targetDepartments.map((dept, i) => (
             <Badge key={i} variant="outline" className="text-[9px] px-1 py-0 border-purple-200 text-purple-700">{dept}</Badge>
           ))}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          variant="outline"
          className="w-full border-purple-200 hover:bg-purple-50 text-purple-700 font-bold text-xs h-9"
          onClick={() => handleEnroll(item)}
          disabled={isEnrolling === item.id}
        >
          {isEnrolling === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-3 w-3 mr-2" />}
          Enroll Course
        </Button>
      </CardFooter>
    </Card>
  );

  const PathCard = ({ item }: { item: CatalogItem }) => (
    <Card key={item.id} className="group flex flex-col border-none shadow-md hover:shadow-xl transition-all duration-300 bg-background/50 backdrop-blur-sm overflow-hidden border-t-4 border-primary">
      <div className="relative h-40 overflow-hidden bg-muted">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
            <Layers className="h-10 w-10 text-primary/40" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge className="bg-primary hover:bg-primary/90 border-none">LEARNING PATH</Badge>
        </div>
      </div>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">{item.title}</CardTitle>
        <CardDescription className="line-clamp-2 text-xs h-8">{item.description || 'No description available.'}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="text-[10px] font-bold py-0 h-5">
            <Layers className="h-3 w-3 mr-1" />
            {item.pathCourses?.length || 0} Courses
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1">
           {item.targetDepartments.map((dept, i) => (
             <Badge key={i} variant="outline" className="text-[9px] px-1 py-0 border-primary/20 text-primary">{dept}</Badge>
           ))}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full font-bold text-xs h-9 shadow-lg shadow-primary/20"
          onClick={() => handleEnroll(item)}
          disabled={isEnrolling === item.id}
        >
          {isEnrolling === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-3 w-3 mr-2" />}
          Enroll in Path
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tighter text-primary flex items-center gap-3">
          <Compass className="h-10 w-10" />
          DISCOVER
        </h1>
        <p className="text-muted-foreground text-lg font-medium">Your personal growth portal. Explore paths, courses, and expert-led training.</p>
      </div>

      {/* Control Toolbar */}
      <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search catalog by title, skill, or keywords..." 
            className="pl-10 h-11 bg-background border-primary/5 shadow-sm rounded-xl focus-visible:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px] h-11 rounded-xl bg-background border-primary/5">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">All Categories</SelectItem>
              {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] h-11 rounded-xl bg-background border-primary/5">
              <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="alphabetical">A - Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Catalog Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-muted/50 p-1 h-12 rounded-xl mb-8">
          <TabsTrigger value="all" className="rounded-lg px-8 font-bold data-[state=active]:bg-background">
            <LayoutGrid className="h-4 w-4 mr-2" />
            All Content
          </TabsTrigger>
          <TabsTrigger value="paths" className="rounded-lg px-8 font-bold data-[state=active]:bg-background">
            <Layers className="h-4 w-4 mr-2" />
            Learning Paths
          </TabsTrigger>
          <TabsTrigger value="courses" className="rounded-lg px-8 font-bold data-[state=active]:bg-background">
            <BookOpen className="h-4 w-4 mr-2" />
            Individual Courses
          </TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
            <p className="text-muted-foreground font-medium animate-pulse">Syncing with HQ Catalog...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-30">
            <Star className="h-20 w-20 mb-4" />
            <h3 className="text-2xl font-black italic uppercase">No Content Found</h3>
            <p className="font-medium">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <>
            <TabsContent value="all" className="space-y-12 animate-in fade-in duration-500">
              {/* Paths Section */}
              {items.some(i => i.contentType === 'PATH') && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-4">
                    <h2 className="text-xl font-black italic uppercase flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary fill-primary" />
                      Recommended Learning Paths
                    </h2>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('paths')} className="font-bold text-xs uppercase tracking-widest">View All</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.filter(i => i.contentType === 'PATH').slice(0, 3).map(path => (
                      <PathCard key={path.id} item={path} />
                    ))}
                  </div>
                </div>
              )}

              {/* Courses Section */}
              {items.some(i => i.contentType === 'COURSE') && (
                <div className="space-y-6">
                   <div className="flex items-center justify-between border-b pb-4">
                    <h2 className="text-xl font-black italic uppercase flex items-center gap-2">
                      <Zap className="h-5 w-5 text-purple-500 fill-purple-500" />
                      Available Individual Courses
                    </h2>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('courses')} className="font-bold text-xs uppercase tracking-widest">View All</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.filter(i => i.contentType === 'COURSE').slice(0, 6).map(course => (
                      <CourseCard key={course.id} item={course} />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="paths" className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.filter(i => i.contentType === 'PATH').map(path => <PathCard key={path.id} item={path} />)}
              </div>
            </TabsContent>

            <TabsContent value="courses" className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.filter(i => i.contentType === 'COURSE').map(course => <CourseCard key={course.id} item={course} />)}
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};
