import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck, MapPin, Briefcase, Users, Search,
  Filter, Building2, Globe, MessageSquare, ChevronDown, Plus, UserPlus
} from "lucide-react";
import { Button, Badge, Input, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, Label, Textarea } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { opportunities as dummyOpportunities } from "@/data/dummyData.js";
import { addOpportunity } from "@/services/dataService";
import { sendConnectionRequest } from "@/services/socialService";
import { db } from "@/services/firebase";
import { collection, onSnapshot, query, orderBy, doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";

const Opportunities = () => {
  const { user, requireAuth } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState([]);
  const [selectedDept, setSelectedDept] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [opportunitiesList, setOpportunitiesList] = useState([]);
  const [posterDetails, setPosterDetails] = useState({});

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "job",
    company: "",
    applicationLink: "",
    contactInfo: "",
    deadline: ""
  });

  useEffect(() => {
    const q = query(collection(db, "opportunities"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOpportunitiesList([...data, ...dummyOpportunities]);

      // Fetch poster details for each opportunity
      data.forEach(async (opportunity) => {
        if (opportunity.userId && opportunity.userId !== user?.uid) {
          const userDoc = await getDoc(doc(db, "users", opportunity.userId));
          if (userDoc.exists()) {
            setPosterDetails(prev => ({
              ...prev,
              [opportunity.userId]: userDoc.data()
            }));
          }
        }
      });
    }, (error) => {
      console.error("Firestore error:", error);
      setOpportunitiesList(dummyOpportunities);
    });
    return () => unsubscribe();
  }, [user?.uid]);

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

  const handlePost = () => {
    if (!requireAuth("post")) return;
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const result = await addOpportunity(formData, user);
    setLoading(false);

    if (result.success) {
      setIsDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        type: "job",
        company: "",
        applicationLink: "",
        contactInfo: "",
        deadline: ""
      });
      toast.success("Opportunity posted successfully!");
    } else {
      toast.error("Failed to post: " + result.error);
    }
  };

  // Filter options
  const opportunityTypes = ["job", "internship", "project", "freelance"];
  const departments = ["CSE", "IT", "ECE", "ME", "Civil", "EE", "Chemical", "Plastic", "Environmental"];
  const domains = ["Software Engineering", "Data Science", "Web Development", "Mobile App Development", "AI/ML", "Cloud Computing", "Design", "Product Management", "Mechanical Engineering", "Civil Engineering"];
  const companies = ["All", ...new Set(opportunitiesList.map(o => o.company))];

  const filtered = useMemo(() => {
    return opportunitiesList.filter(o => {
      const matchesSearch =
        o.title.toLowerCase().includes(search.toLowerCase()) ||
        o.company.toLowerCase().includes(search.toLowerCase()) ||
        (o.postedBy && o.postedBy.toLowerCase().includes(search.toLowerCase()));

      const matchesType = selectedType.length === 0 || selectedType.includes(o.type || o.roleType);
      const matchesDept = selectedDept.length === 0 || selectedDept.includes(o.department);
      const matchesDomain = selectedDomain.length === 0 || selectedDomain.includes(o.domain);
      const matchesCompany = selectedCompany.length === 0 || selectedCompany.includes(o.company);

      return matchesSearch && matchesType && matchesDept && matchesDomain && matchesCompany;
    });
  }, [search, selectedType, selectedDept, selectedDomain, selectedCompany, opportunitiesList]);

  return (
    <div className="container mx-auto px-4 py-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-2">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1">
            Career Portal
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
            Find <span className="text-gradient">Opportunities</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            Exclusive opportunities curated by LDCE alumni for students.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-slate-700">{filtered.length} Openings Found</p>
            <p className="text-xs text-muted-foreground">Updated daily</p>
          </div>
          {(user?.role === "alumni" || user?.role === "student") && (
            <Button onClick={handlePost} className="gradient-primary h-12 px-6 rounded-xl font-bold shadow-lg shadow-primary/20">
              Post Opportunity
            </Button>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post an Opportunity</DialogTitle>
            <DialogDescription>
              Share an opportunity. Students will apply directly through your provided link or contact.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Opportunity Title</Label>
                <Input id="title" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. SDE Intern" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company/Organization</Label>
                <Input id="company" required value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder="e.g. Google" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  className="w-full h-10 px-3 border rounded-md text-sm"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="job">Job</option>
                  <option value="internship">Internship</option>
                  <option value="project">Project</option>
                  <option value="freelance">Freelance</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input id="deadline" type="date" required value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="applicationLink">Application Link *</Label>
              <Input id="applicationLink" type="url" required value={formData.applicationLink} onChange={(e) => setFormData({ ...formData, applicationLink: e.target.value })} placeholder="https://forms.google.com/... or email@example.com" />
              <p className="text-xs text-muted-foreground">Application form, portal link, or email address</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactInfo">Contact Information *</Label>
              <Input id="contactInfo" required value={formData.contactInfo} onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })} placeholder="email@example.com or phone number" />
              <p className="text-xs text-muted-foreground">For students to contact you directly</p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full gradient-primary">
                {loading ? "Posting..." : "Post Opportunity"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Search & Basic Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search roles, companies, or alumni..."
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
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {/* Advanced Filters Drawer */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-10"
          >
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Filters</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedType([]);
                    setSelectedDept([]);
                    setSelectedDomain([]);
                    setSelectedCompany([]);
                  }}
                >
                  Clear All
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Job Type & Department */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {opportunityTypes.map(type => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedType.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedType([...selectedType, type]);
                            } else {
                              setSelectedType(selectedType.filter(t => t !== type));
                            }
                          }}
                          className="rounded text-primary"
                        />
                        <span className="text-sm capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Department
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {departments.map(dept => (
                      <label key={dept} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedDept.includes(dept)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDept([...selectedDept, dept]);
                            } else {
                              setSelectedDept(selectedDept.filter(d => d !== dept));
                            }
                          }}
                          className="rounded text-primary"
                        />
                        <span className="text-sm">{dept}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Domain & Company */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Domain
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {domains.map(domain => (
                      <label key={domain} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedDomain.includes(domain)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDomain([...selectedDomain, domain]);
                            } else {
                              setSelectedDomain(selectedDomain.filter(d => d !== domain));
                            }
                          }}
                          className="rounded text-primary"
                        />
                        <span className="text-sm">{domain}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Company
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {companies.map(company => (
                      <label key={company} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedCompany.includes(company)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCompany([...selectedCompany, company]);
                            } else {
                              setSelectedCompany(selectedCompany.filter(c => c !== company));
                            }
                          }}
                          className="rounded text-primary"
                        />
                        <span className="text-sm">{company}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Filters */}
              <div className="mt-4 pt-4 border-t border-slate-300">
                <div className="flex flex-wrap gap-2">
                  {selectedType.map(type => (
                    <span key={type} className="bg-primary text-white px-2 py-1 rounded text-xs font-medium gap-1">
                      {type}
                      <button
                        onClick={() => setSelectedType(selectedType.filter(t => t !== type))}
                        className="ml-1 text-xs hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {selectedDept.map(dept => (
                    <span key={dept} className="bg-primary text-white px-2 py-1 rounded text-xs font-medium gap-1">
                      {dept}
                      <button
                        onClick={() => setSelectedDept(selectedDept.filter(d => d !== dept))}
                        className="ml-1 text-xs hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {selectedDomain.map(domain => (
                    <span key={domain} className="bg-primary text-white px-2 py-1 rounded text-xs font-medium gap-1">
                      {domain}
                      <button
                        onClick={() => setSelectedDomain(selectedDomain.filter(d => d !== domain))}
                        className="ml-1 text-xs hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {selectedCompany.map(company => (
                    <span key={company} className="bg-primary text-white px-2 py-1 rounded text-xs font-medium gap-1">
                      {company}
                      <button
                        onClick={() => setSelectedCompany(selectedCompany.filter(c => c !== company))}
                        className="ml-1 text-xs hover:text-red-500"
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
      </AnimatePresence>

      {/* Results Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group bg-card rounded-[2rem] p-8 shadow-sm hover:shadow-2xl transition-all border border-border/60 flex flex-col h-full relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6">
                <Badge className={`${(o.type || o.roleType) === 'internship' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : (o.type || o.roleType) === 'job' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'} font-bold`}>
                  {(o.type || o.roleType) ? (o.type || o.roleType).charAt(0).toUpperCase() + (o.type || o.roleType).slice(1) : 'Opportunity'}
                </Badge>
              </div>

              <div className="mb-6 flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-primary text-xl">
                  {o.company ? o.company.charAt(0) : 'C'}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 group-hover:text-primary transition-colors">{o.title}</h2>
                  <p className="font-bold text-slate-500">{o.company}</p>
                </div>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                  <CalendarCheck className="h-4 w-4 text-slate-400" /> Apply by {o.deadline}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-normal">Contact:</span>
                  <span className="text-primary font-medium">{o.contactInfo}</span>
                </div>
              </div>

              <div className="pt-6 border-t mt-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-muted-foreground font-black tracking-tighter">Posted By</span>
                    <span className="text-sm font-extrabold text-slate-800">{o.postedBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {o.userId && o.userId !== user?.uid && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleConnect(o.userId, posterDetails[o.userId]?.name || o.postedBy)}
                      >
                        <UserPlus className="h-3 w-3 mr-1" /> Connect
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full bg-slate-100 hover:bg-primary hover:text-white"
                      onClick={() => requireAuth('message')}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  className="w-full rounded-2xl h-14 gradient-primary text-primary-foreground font-black text-lg shadow-xl shadow-primary/10 group-hover:scale-[1.02] transition-transform"
                  onClick={() => {
                    if (o.applicationLink && o.applicationLink.startsWith('http')) {
                      window.open(o.applicationLink, "_blank", "noopener,noreferrer");
                    } else if (o.applicationLink) {
                      window.location.href = `mailto:${o.applicationLink}`;
                    } else {
                      toast.error("No application link provided");
                    }
                  }}
                >
                  {o.applicationLink ? (o.applicationLink.startsWith('http') ? 'Apply via Link' : 'Contact via Email') : 'No Link Available'}
                </Button>
                <p className="text-[10px] text-center mt-3 text-muted-foreground font-medium uppercase tracking-widest">
                  {o.applicationLink ? (o.applicationLink.startsWith('http') ? 'Opens external form or portal' : 'Opens email client') : 'Contact poster for details'}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed">
          <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Search className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">No matches found</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">Try broadening your search or resetting the filters.</p>
          <Button
            variant="link"
            className="mt-4 font-bold text-primary"
            onClick={() => {
              setSearch("");
              setSelectedType([]);
              setSelectedDept([]);
              setSelectedDomain([]);
              setSelectedCompany([]);
            }}
          >
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default Opportunities;
