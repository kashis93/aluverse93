import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { subscribeToConnections, getOrCreateChat } from "@/services/socialService";
import { db, storage } from "@/services/firebase";
import { doc, getDoc, updateDoc, onSnapshot, collection, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Avatar, AvatarFallback, AvatarImage, Button, Card, CardContent, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle, Badge } from "@/components/ui";
import { User, MessageCircle, Mail, MapPin, Briefcase, GraduationCap, Award, Users, Edit, Upload, Link as LinkIcon, PenTool, Calendar, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const Profile = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const profileUserId = id || user?.uid;
    const isOwnProfile = !id || id === user?.uid;
    
    const fileInputRef = useRef(null);
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [connectionDetails, setConnectionDetails] = useState([]);
    const [editOpen, setEditOpen] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [displayUser, setDisplayUser] = useState(null);
    const [editData, setEditData] = useState({
        name: "",
        bio: "",
        company: "",
        achievement: "",
        portfolioUrl: "",
        linkedinUrl: "",
        twitterUrl: ""
    });

    const [myBlogs, setMyBlogs] = useState([]);
    const [myOpportunities, setMyOpportunities] = useState([]);
    const [myEvents, setMyEvents] = useState([]);
    const [myChallenges, setMyChallenges] = useState([]);
    const [counts, setCounts] = useState({ blogs: 0, opps: 0, events: 0, challenges: 0 });

    useEffect(() => {
        if (isOwnProfile && user) {
            setPhotoPreview(user.photoURL);
            setEditData({
                name: user.name || user.displayName || "",
                bio: user.bio || "",
                company: user.company || "",
                achievement: user.achievement || "",
                portfolioUrl: user.portfolioUrl || "",
                linkedinUrl: user.linkedinUrl || "",
                twitterUrl: user.twitterUrl || ""
            });
        }
    }, [user, isOwnProfile]);

    useEffect(() => {
        if (!profileUserId) return;

        setLoading(true);
        const userDocRef = doc(db, "users", profileUserId);
        
        const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const userData = doc.data();
                setDisplayUser({
                    uid: doc.id,
                    ...userData
                });
                if (!isOwnProfile) {
                    setPhotoPreview(userData.photoURL);
                }
            } else {
                toast.error("User not found");
            }
            setLoading(false);
        });

        // Fetch My Blogs
        const qBlogs = query(collection(db, "blogs"), where("userId", "==", profileUserId));
        const unsubscribeBlogs = onSnapshot(qBlogs, (snapshot) => {
            const blogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMyBlogs(blogs);
            setCounts(prev => ({ ...prev, blogs: blogs.length }));
        });

        // Fetch My Opportunities
        const qOpps = query(collection(db, "opportunities"), where("userId", "==", profileUserId));
        const unsubscribeOpps = onSnapshot(qOpps, (snapshot) => {
            const opps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMyOpportunities(opps);
            setCounts(prev => ({ ...prev, opps: opps.length }));
        });

        // Fetch My Events
        const qEvents = query(collection(db, "events"), where("userId", "==", profileUserId));
        const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
            const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMyEvents(events);
            setCounts(prev => ({ ...prev, events: events.length }));
        });

        // Fetch My Challenges
        const qChallenges = query(collection(db, "challenges"), where("userId", "==", profileUserId));
        const unsubscribeChallenges = onSnapshot(qChallenges, (snapshot) => {
            const challenges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMyChallenges(challenges);
            setCounts(prev => ({ ...prev, challenges: challenges.length }));
        });

        return () => {
            unsubscribeProfile();
            unsubscribeBlogs();
            unsubscribeOpps();
            unsubscribeEvents();
            unsubscribeChallenges();
        };
    }, [profileUserId, isOwnProfile]);

    useEffect(() => {
        if (!profileUserId) return;

        const unsubscribe = subscribeToConnections(profileUserId, async (cons) => {
            setConnections(cons);

            // Fetch partner details for each connection
            const details = await Promise.all(cons.map(async (con) => {
                const partnerDoc = await getDoc(doc(db, "users", con.partnerId));
                return { id: con.id, partnerId: con.partnerId, ...(partnerDoc.exists() ? partnerDoc.data() : {}) };
            }));
            setConnectionDetails(details);
        });

        return () => unsubscribe();
    }, [profileUserId]);

    const handleMessage = async (partnerId) => {
        try {
            const chatId = await getOrCreateChat(user.uid, partnerId);
            navigate(`/chat/${chatId}`);
        } catch (error) {
            console.error("Chat error:", error);
            toast.error("Failed to start chat.");
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be less than 5MB");
            return;
        }
        setPhotoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotoPreview(reader.result);
            toast.success("Photo preview updated. Save to apply changes.");
        };
        reader.readAsDataURL(file);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editData.name.trim()) {
            toast.error("Please enter your name");
            return;
        }

        setEditLoading(true);
        const timeoutId = setTimeout(() => {
            setEditLoading(false);
            toast.error("Request timed out. Please check your connection.");
        }, 60000);

        try {
            const updateObj = {
                name: editData.name,
                bio: editData.bio,
                company: editData.company,
                achievement: editData.achievement,
                portfolioUrl: editData.portfolioUrl,
                linkedinUrl: editData.linkedinUrl,
                twitterUrl: editData.twitterUrl
            };

            if (photoFile) {
                try {
                    const storageRef = ref(storage, `profile-photos/${user.uid}/${Date.now()}`);
                    await uploadBytes(storageRef, photoFile);
                    const photoURL = await getDownloadURL(storageRef);
                    updateObj.photoURL = photoURL;
                    setPhotoPreview(photoURL);
                } catch (photoError) {
                    console.warn("Photo upload warning:", photoError);
                    toast.warning("Profile saved but photo upload failed");
                }
            }

            if (!user?.uid) {
                throw new Error("User ID not found");
            }

            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, updateObj);

            clearTimeout(timeoutId);
            setDisplayUser(prev => ({ ...prev, ...updateObj }));
            setPhotoFile(null);
            setEditLoading(false);
            setEditOpen(false);
            toast.success("Profile updated successfully!");
        } catch (error) {
            clearTimeout(timeoutId);
            console.error("Update error details:", error);
            setEditLoading(false);
            toast.error(error?.message || "Failed to update profile. Please try again.");
        }
    };

    if (!user) return null;

    return (
        <div className="container mx-auto px-4 py-10 min-h-screen">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Info Card */}
                <Card className="lg:col-span-1 border-slate-200 shadow-xl rounded-[2rem] overflow-hidden h-fit">
                    <div className="h-32 gradient-primary w-full" />
                    <CardContent className="px-6 pb-8 -mt-16">
                        <div className="text-center mb-4">
                            <Avatar className="h-32 w-32 border-4 border-white shadow-xl mx-auto mb-4 rounded-full">
                                <AvatarImage src={displayUser?.photoURL} alt={displayUser?.name} />
                                <AvatarFallback>{displayUser?.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                            </Avatar>
                            <h1 className="text-2xl font-bold text-slate-900">{displayUser?.name || "User"}</h1>
                            <p className="text-primary font-bold uppercase text-xs tracking-widest mt-1">{displayUser?.role}</p>
                            {displayUser?.bio && <p className="text-sm text-slate-600 mt-2 italic">{displayUser?.bio}</p>}
                        </div>

                        {isOwnProfile ? (
                            <Button
                                onClick={() => {
                                    setEditData({
                                        name: displayUser?.name || "",
                                        bio: displayUser?.bio || "",
                                        company: displayUser?.company || "",
                                        achievement: displayUser?.achievement || "",
                                        portfolioUrl: displayUser?.portfolioUrl || "",
                                        linkedinUrl: displayUser?.linkedinUrl || "",
                                        twitterUrl: displayUser?.twitterUrl || ""
                                    });
                                    setPhotoPreview(displayUser?.photoURL || null);
                                    setEditOpen(true);
                                }}
                                className="w-full mb-6 gap-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
                            >
                                <Edit className="h-4 w-4" /> Edit Profile
                            </Button>
                        ) : (
                            <div className="flex gap-2 mb-6">
                                <Button 
                                    className="flex-1 gradient-primary text-white rounded-lg"
                                    onClick={() => handleMessage(displayUser.uid)}
                                >
                                    <MessageCircle className="h-4 w-4 mr-2" /> Message
                                </Button>
                            </div>
                        )}

                        <div className="space-y-3 text-sm text-left border-t pt-6">
                            <div className="flex items-center gap-3 text-slate-600">
                                <Mail className="h-4 w-4 text-slate-400" /> {displayUser?.email}
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <GraduationCap className="h-4 w-4 text-slate-400" /> {displayUser?.department} · Batch of {displayUser?.graduationYear}
                            </div>
                            {displayUser?.company && (
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Briefcase className="h-4 w-4 text-slate-400" /> {displayUser?.company}
                                </div>
                            )}
                            {displayUser?.achievement && (
                                <div className="flex items-start gap-3 text-slate-600">
                                    <Award className="h-4 w-4 text-slate-400 mt-1" />
                                    <span>{displayUser?.achievement}</span>
                                </div>
                            )}
                            {displayUser?.portfolioUrl && (
                                <div className="flex items-center gap-3 text-slate-600">
                                    <LinkIcon className="h-4 w-4 text-slate-400" />
                                    <a href={displayUser?.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Portfolio</a>
                                </div>
                            )}
                            {displayUser?.linkedinUrl && (
                                <div className="flex items-center gap-3 text-slate-600">
                                    <LinkIcon className="h-4 w-4 text-slate-400" />
                                    <a href={displayUser?.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn</a>
                                </div>
                            )}
                            {displayUser?.twitterUrl && (
                                <div className="flex items-center gap-3 text-slate-600">
                                    <LinkIcon className="h-4 w-4 text-slate-400" />
                                    <a href={displayUser?.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Twitter</a>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* LinkedIn-style Achievements Section */}
                    <Card className="border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b py-4 px-6 flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Award className="h-5 w-5 text-primary" /> Achievements
                            </CardTitle>
                            {isOwnProfile && (
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 rounded-full"
                                    onClick={() => setEditOpen(true)}
                                >
                                    <Plus className="h-4 w-4 text-primary" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-6">
                            {displayUser?.achievement ? (
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-start p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                            <Award className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                {displayUser.achievement}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground italic">
                                    {isOwnProfile ? "Add your achievements and certifications to stand out!" : "No achievements listed yet."}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="network" className="w-full">
                        <TabsList className="w-full justify-start bg-slate-100/50 p-1 mb-6 rounded-2xl border flex-wrap h-auto">
                            <TabsTrigger value="network" className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                                <Users className="h-4 w-4" /> {isOwnProfile ? "My Network" : "Network"}
                            </TabsTrigger>
                            <TabsTrigger value="blogs" className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                                <PenTool className="h-4 w-4" /> {isOwnProfile ? "My Blogs" : "Blogs"} <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{counts.blogs}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="challenges" className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                                <Award className="h-4 w-4" /> {isOwnProfile ? "My Challenges" : "Challenges"} <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{counts.challenges}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="opportunities" className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                                <Briefcase className="h-4 w-4" /> {isOwnProfile ? "My Opportunities" : "Opportunities"} <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{counts.opps}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="events" className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> {isOwnProfile ? "My Events" : "Events"} <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{counts.events}</Badge>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="network">
                            <Card className="border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b py-4 px-6">
                                    <CardTitle className="text-lg font-bold">{isOwnProfile ? "Connections" : `${displayUser?.name}'s Connections`} ({connectionDetails.length})</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {loading ? (
                                        <div className="p-12 text-center text-muted-foreground">Loading network...</div>
                                    ) : connectionDetails.length === 0 ? (
                                        <div className="p-20 text-center">
                                            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Users className="h-8 w-8 text-slate-300" />
                                            </div>
                                            <h3 className="font-bold text-slate-800">{isOwnProfile ? "Your network is empty" : "No connections yet"}</h3>
                                            <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
                                                {isOwnProfile ? "Connect with LDCE alumni to start growing your professional network." : `Connect with ${displayUser?.name} to see their network.`}
                                            </p>
                                            {isOwnProfile && (
                                                <Button variant="link" onClick={() => navigate("/directory")} className="text-primary font-bold mt-4">
                                                    Find people in Directory →
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {connectionDetails.map((con) => (
                                                <div key={con.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <Avatar className="h-14 w-14 border-2 border-primary/20 shadow-md rounded-full flex-shrink-0">
                                                            <AvatarImage src={con.photoURL} alt={con.name} />
                                                            <AvatarFallback><User className="h-7 w-7 text-slate-400" /></AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <h3 className="font-bold text-slate-800">{con.name}</h3>
                                                            <p className="text-xs text-muted-foreground">{con.role} · {con.department}</p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleMessage(con.partnerId)}
                                                        className="rounded-full bg-slate-100 text-slate-600 hover:bg-primary hover:text-white border-0"
                                                    >
                                                        <MessageCircle className="h-4 w-4 mr-2" /> Message
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="blogs">
                            <Card className="border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b py-4 px-6 flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg font-bold">{isOwnProfile ? "My Blog Posts" : "Blog Posts"} ({myBlogs.length})</CardTitle>
                                    {isOwnProfile && <Button size="sm" onClick={() => navigate("/blogs")} className="gradient-primary text-white text-xs h-8">Write New</Button>}
                                </CardHeader>
                                <CardContent className="p-0">
                                    {myBlogs.length === 0 ? (
                                        <div className="p-20 text-center text-muted-foreground">
                                            <PenTool className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                            <p>You haven't posted any blogs yet.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {myBlogs.map((blog) => (
                                                <div key={blog.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate("/blogs")}>
                                                    <h3 className="font-bold text-slate-800 line-clamp-1">{blog.title}</h3>
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{blog.excerpt}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        {blog.tags?.slice(0, 3).map(tag => (
                                                            <Badge key={tag} variant="outline" className="text-[10px] py-0">{tag}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="challenges">
                            <Card className="border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b py-4 px-6 flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg font-bold">{isOwnProfile ? "Posted Challenges" : "Challenges"} ({myChallenges.length})</CardTitle>
                                    {isOwnProfile && <Button size="sm" onClick={() => navigate("/challenges")} className="gradient-primary text-white text-xs h-8">Post New</Button>}
                                </CardHeader>
                                <CardContent className="p-0">
                                    {myChallenges.length === 0 ? (
                                        <div className="p-20 text-center text-muted-foreground">
                                            <Award className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                            <p>No challenges posted yet.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {myChallenges.map((challenge) => (
                                                <div key={challenge.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate("/challenges")}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="font-bold text-slate-800">{challenge.title}</h3>
                                                            <p className="text-xs font-bold text-primary">{challenge.category}</p>
                                                        </div>
                                                        <Badge variant="outline">{challenge.deadline}</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{challenge.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="opportunities">
                            <Card className="border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b py-4 px-6 flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg font-bold">Posted Opportunities ({myOpportunities.length})</CardTitle>
                                    {isOwnProfile && <Button size="sm" onClick={() => navigate("/opportunities")} className="gradient-primary text-white text-xs h-8">Post New</Button>}
                                </CardHeader>
                                <CardContent className="p-0">
                                    {myOpportunities.length === 0 ? (
                                        <div className="p-20 text-center text-muted-foreground">
                                            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                            <p>No job opportunities posted yet.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {myOpportunities.map((opp) => (
                                                <div key={opp.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate("/opportunities")}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="font-bold text-slate-800">{opp.title}</h3>
                                                            <p className="text-xs font-bold text-primary">{opp.company}</p>
                                                        </div>
                                                        <Badge>{opp.type || opp.roleType || 'Opportunity'}</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Deadline: {opp.deadline}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="events">
                            <Card className="border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b py-4 px-6 flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg font-bold">My Events ({myEvents.length})</CardTitle>
                                    {isOwnProfile && <Button size="sm" onClick={() => navigate("/events")} className="gradient-primary text-white text-xs h-8">Post Event</Button>}
                                </CardHeader>
                                <CardContent className="p-0">
                                    {myEvents.length === 0 ? (
                                        <div className="p-20 text-center text-muted-foreground">
                                            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                            <p>No events organized yet.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {myEvents.map((event) => (
                                                <div key={event.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate("/events")}>
                                                    <h3 className="font-bold text-slate-800">{event.title}</h3>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-primary" /> {event.date}</span>
                                                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" /> {event.location || (event.eventType === 'online' ? 'Online Event' : 'Location TBD')}</span>
                                                    </div>
                                                    <Badge className="mt-2 text-[10px]" variant="outline">{event.eventType || 'Event'}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                    </Tabs>
                </div>
            </div>

            {/* Edit Profile Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-6">
                        {/* Photo Upload */}
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2"><Upload className="h-4 w-4" /> Profile Photo</Label>
                            <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20 border-2 border-primary/20">
                                    <AvatarImage src={photoPreview} alt="Preview" />
                                    <AvatarFallback>{editData.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {photoFile ? "Change Photo" : "Choose Photo"}
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">Max 5MB. JPG, PNG supported.</p>
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                                id="name"
                                value={editData.name}
                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                placeholder="Enter your name"
                                required
                            />
                        </div>

                        {/* Bio */}
                        <div className="space-y-2">
                            <Label htmlFor="bio">Bio</Label>
                            <textarea
                                id="bio"
                                value={editData.bio}
                                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                                placeholder="Tell us about yourself"
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                rows={3}
                            />
                        </div>

                        {/* Company */}
                        <div className="space-y-2">
                            <Label htmlFor="company" className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Company</Label>
                            <Input
                                id="company"
                                value={editData.company}
                                onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                                placeholder="e.g. Google, Microsoft"
                            />
                        </div>

                        {/* Achievement */}
                        <div className="space-y-2">
                            <Label htmlFor="achievement" className="flex items-center gap-2"><Award className="h-4 w-4" /> Achievements & Certifications</Label>
                            <textarea
                                id="achievement"
                                value={editData.achievement}
                                onChange={(e) => setEditData({ ...editData, achievement: e.target.value })}
                                placeholder="Share your achievements, certifications, or key accomplishments"
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                rows={3}
                            />
                        </div>

                        {/* Social Links */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="font-bold text-slate-800">Social Links & Portfolio</h3>

                            <div className="space-y-2">
                                <Label htmlFor="portfolio" className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Portfolio URL</Label>
                                <Input
                                    id="portfolio"
                                    type="url"
                                    value={editData.portfolioUrl}
                                    onChange={(e) => setEditData({ ...editData, portfolioUrl: e.target.value })}
                                    placeholder="https://yourportfolio.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="linkedin" className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /> LinkedIn URL</Label>
                                <Input
                                    id="linkedin"
                                    type="url"
                                    value={editData.linkedinUrl}
                                    onChange={(e) => setEditData({ ...editData, linkedinUrl: e.target.value })}
                                    placeholder="https://linkedin.com/in/yourprofile"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="twitter" className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Twitter URL</Label>
                                <Input
                                    id="twitter"
                                    type="url"
                                    value={editData.twitterUrl}
                                    onChange={(e) => setEditData({ ...editData, twitterUrl: e.target.value })}
                                    placeholder="https://twitter.com/yourprofile"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t">
                            <Button
                                type="submit"
                                disabled={editLoading}
                                className={`flex-1 text-white rounded-lg transition-all ${editLoading ? 'opacity-75 cursor-wait' : 'bg-primary hover:bg-primary/90'}`}
                            >
                                {editLoading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin">⏳</span> Saving...
                                    </span>
                                ) : "Save Changes"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditOpen(false)}
                                disabled={editLoading}
                                className="flex-1 rounded-lg"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Profile;
