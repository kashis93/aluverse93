import { useState, useEffect, useMemo } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, Label, Input, Textarea } from "@/components/ui";
import { motion } from "framer-motion";
import { challenges as dummyChallenges } from "@/data/dummyData.js";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Trophy, CalendarCheck, Users, Plus, UserPlus, Search, Filter, Briefcase } from "lucide-react";
import { addData } from "@/services/dataService";
import { sendConnectionRequest } from "@/services/socialService";
import { db } from "@/services/firebase";
import { collection, onSnapshot, query, orderBy, doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";

const Challenges = () => {
  const { user, requireAuth } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState([]);
  const [selectedDeadline, setSelectedDeadline] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [challengesList, setChallengesList] = useState([]);
  const [posterDetails, setPosterDetails] = useState({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    deadline: "",
    externalLink: "",
    contactInfo: ""
  });

  // Filter options
  const categories = ["Data Science", "AI/ML", "Web Development", "Mobile App Development", "Design", "IoT", "Cloud Computing", "Blockchain", "Game Development"];
  const deadlineRanges = [
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "Next 3 Months", value: "quarter" },
    { label: "More than 3 Months", value: "extended" }
  ];

  useEffect(() => {
    const q = query(collection(db, "challenges"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChallengesList(data.length > 0 ? data : dummyChallenges);

      // Fetch poster details for each challenge
      data.forEach(async (challenge) => {
        if (challenge.userId && challenge.userId !== user?.uid) {
          const userDoc = await getDoc(doc(db, "users", challenge.userId));
          if (userDoc.exists()) {
            setPosterDetails(prev => ({
              ...prev,
              [challenge.userId]: userDoc.data()
            }));
          }
        }
      });
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const handlePost = () => {
    setIsDialogOpen(true);
  };

  const handleConnect = async (posterUserId, posterName) => {
    if (!user) {
      toast.error("Please login to send connection requests");
      return;
    }

    if (posterUserId === user.uid) {
      toast.error("You cannot connect with yourself");
      return;
    }

    try {
      await sendConnectionRequest(user, posterUserId);
      toast.success(`Connection request sent to ${posterName}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const filtered = useMemo(() => {
    return challengesList.filter(c => {
      const matchesSearch =
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        (c.postedBy && c.postedBy.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory = selectedCategory.length === 0 || selectedCategory.includes(c.category);

      // Deadline filtering
      const matchesDeadline = selectedDeadline.length === 0 || (() => {
        if (!c.deadline) return true;
        const deadline = new Date(c.deadline);
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const quarterFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

        return selectedDeadline.some(range => {
          switch (range) {
            case 'week': return deadline <= weekFromNow;
            case 'month': return deadline <= monthFromNow;
            case 'quarter': return deadline <= quarterFromNow;
            case 'extended': return deadline > quarterFromNow;
            default: return true;
          }
        });
      })();

      return matchesSearch && matchesCategory && matchesDeadline;
    });
  }, [search, selectedCategory, selectedDeadline, challengesList]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const result = await addData("challenges", {
      ...formData,
      postedBy: user.displayName || user.name,
      userId: user.uid,
      timestamp: new Date()
    });
    setLoading(false);

    if (result.success) {
      setIsDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        category: "",
        deadline: "",
        externalLink: "",
        contactInfo: ""
      });
      toast.success("Challenge posted successfully!");
    } else {
      toast.error("Failed to post: " + result.error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Challenges</h1>
          <p className="text-muted-foreground mt-1">Compete, learn, and win exciting prizes</p>
        </div>
        {user?.role === "alumni" && (
          <Button onClick={handlePost} className="gradient-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> Post Challenge
          </Button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search challenges, categories, or alumni..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-14 bg-card border-border/80 rounded-2xl text-base shadow-sm focus:ring-primary/20"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={`h-14 px-6 rounded-2xl gap-2 font-bold border-border/80 ${showFilters ? 'bg-slate-100' : ''}`}
        >
          <Filter className="h-5 w-5" />
          Advanced Filters
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden mb-10"
        >
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Advanced Filters</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory([]);
                  setSelectedDeadline([]);
                }}
              >
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Filter */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> Category
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {categories.map(category => (
                    <label key={category} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedCategory.includes(category)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCategory([...selectedCategory, category]);
                          } else {
                            setSelectedCategory(selectedCategory.filter(c => c !== category));
                          }
                        }}
                        className="rounded text-primary"
                      />
                      <span className="text-sm">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Deadline Filter */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4" /> Deadline
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {deadlineRanges.map(range => (
                    <label key={range.value} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedDeadline.includes(range.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDeadline([...selectedDeadline, range.value]);
                          } else {
                            setSelectedDeadline(selectedDeadline.filter(r => r !== range.value));
                          }
                        }}
                        className="rounded text-primary"
                      />
                      <span className="text-sm">{range.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            <div className="mt-4 pt-4 border-t border-slate-300">
              <div className="flex flex-wrap gap-2">
                {selectedCategory.map(category => (
                  <span key={category} className="bg-primary text-white px-3 py-1 rounded text-xs font-medium">
                    {category}
                    <button
                      onClick={() => setSelectedCategory(selectedCategory.filter(c => c !== category))}
                      className="ml-1 text-xs hover:text-red-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {selectedDeadline.map(deadline => (
                  <span key={deadline} className="bg-primary text-white px-3 py-1 rounded text-xs font-medium">
                    {deadlineRanges.find(r => r.value === deadline)?.label || deadline}
                    <button
                      onClick={() => setSelectedDeadline(selectedDeadline.filter(d => d !== deadline))}
                      className="ml-1 text-xs hover:text-red-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all border border-border flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-blue-100 text-blue-700">
                  {c.category || 'General'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">{c.title}</h2>
              <p className="text-muted-foreground text-sm flex-grow leading-relaxed">{c.description}</p>

              <div className="mt-6 pt-4 border-t space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5"><CalendarCheck className="h-3.5 w-3.5" /> Deadline: {c.deadline}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className="text-muted-foreground font-normal">Posted by:</span> {c.postedBy}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-normal">Contact:</span>
                  <span className="text-primary font-medium">{c.contactInfo}</span>
                </div>
                {c.userId && c.userId !== user?.uid && (
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center">
                        <span className="text-xs font-bold">
                          {posterDetails[c.userId]?.name?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {posterDetails[c.userId]?.name || c.postedBy}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleConnect(c.userId, posterDetails[c.userId]?.name || c.postedBy)}
                    >
                      <UserPlus className="h-3 w-3 mr-1" /> Connect
                    </Button>
                  </div>
                )}
              </div>

              <Button
                className="mt-6 w-full rounded-xl gradient-primary text-primary-foreground font-bold h-11"
                onClick={() => {
                  if (c.externalLink) {
                    window.open(c.externalLink, "_blank", "noopener,noreferrer");
                  } else {
                    toast.error("No external link provided");
                  }
                }}
              >
                Apply via External Link
              </Button>
              <p className="text-xs text-center mt-2 text-muted-foreground">
                Opens external registration form
              </p>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed">
          <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Search className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">No challenges found</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">Try broadening your search or resetting filters.</p>
          <Button
            variant="link"
            className="mt-4 font-bold text-primary"
            onClick={() => {
              setSearch("");
              setSelectedCategory([]);
              setSelectedDeadline([]);
            }}
          >
            Clear all filters
          </Button>
        </div>
      )}

      {/* Post Challenge Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Post a Challenge</DialogTitle>
            <DialogDescription>
              Post a challenge you&apos;re facing. Students will apply through your external link.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Data Analytics Challenge" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe challenge rules and goals..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. AI / Web Development / Design" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input id="deadline" type="date" required value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="externalLink">External Registration Link *</Label>
              <Input id="externalLink" type="url" required value={formData.externalLink} onChange={(e) => setFormData({ ...formData, externalLink: e.target.value })} placeholder="https://forms.google.com/..." />
              <p className="text-xs text-muted-foreground">Students will apply directly through this link</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactInfo">Contact Information *</Label>
              <Input id="contactInfo" required value={formData.contactInfo} onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })} placeholder="email@example.com or phone number" />
              <p className="text-xs text-muted-foreground">For students to contact you directly</p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full gradient-primary">
                {loading ? "Posting..." : "Post Challenge"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Challenges;
