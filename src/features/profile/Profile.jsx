import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { subscribeToConnections, getOrCreateChat, sendConnectionRequest } from "@/services/socialService";
import { db, storage } from "@/services/firebase";
import { doc, getDoc, updateDoc, onSnapshot, collection, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Avatar, AvatarFallback, AvatarImage, Button, Card, CardContent, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle, Badge, Separator } from "@/components/ui";
import { User, MessageCircle, Mail, MapPin, Briefcase, GraduationCap, Award, Users, Edit, Upload, Link as LinkIcon, PenTool, Calendar, Plus, Activity, ImageIcon, ExternalLink, MoreHorizontal } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import PostCard from "@/features/achievements/components/PostCard";
import { getSingleStatus } from "@/services/postsAPI";
import { alumni as dummyAlumni } from "@/data/dummyData.js";
import noteworthyAlumniRaw from "@/data/noteworthyAlumni.json";

const Profile = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const profileUserId = id || user?.uid;
    const isOwnProfile = !id || id === user?.uid;

    const fileInputRef = useRef(null);
    const coverInputRef = useRef(null);
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
    const [myPosts, setMyPosts] = useState([]);
    const [counts, setCounts] = useState({ blogs: 0, opps: 0, events: 0, challenges: 0, posts: 0 });

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
                let staticUser = dummyAlumni.find(a => a.id === profileUserId);

                if (!staticUser && profileUserId.startsWith("nw-")) {
                    const nwId = profileUserId.replace("nw-", "");
                    const raw = noteworthyAlumniRaw.find(a => a.id == nwId);
                    if (raw) {
                        staticUser = {
                            uid: profileUserId,
                            name: raw.name,
                            graduationYear: parseInt(raw.batch) || 0,
                            department: raw.department || "General",
                            company: raw.position.includes(" at ") ? raw.position.split(" at ")[1] : raw.position,
                            role: raw.position.includes(" at ") ? raw.position.split(" at ")[0] : "Alumni",
                            location: "Ahmedabad",
                            photoURL: raw.image,
                            skills: ["Distinguished", "Leader"],
                            isMentor: false,
                            membershipType: "LAA Member",
                            achievement: raw.achievement,
                            bio: raw.achievement
                        };
                    }
                }

                if (staticUser && !staticUser.uid) {
                    staticUser = {
                        uid: profileUserId,
                        name: staticUser.name,
                        graduationYear: staticUser.graduationYear,
                        department: staticUser.department,
                        company: staticUser.company,
                        role: staticUser.role,
                        location: staticUser.location,
                        photoURL: staticUser.avatar,
                        skills: staticUser.skills,
                        isMentor: staticUser.isMentor,
                        membershipType: staticUser.membershipType,
                        achievement: staticUser.achievement,
                        bio: `${staticUser.role} at ${staticUser.company}`
                    };
                }

                if (staticUser) {
                    setDisplayUser(staticUser);
                    if (!isOwnProfile) setPhotoPreview(staticUser.photoURL);
                } else {
                    toast.error("User not found");
                }
            }
            setLoading(false);
        });

        const qBlogs = query(collection(db, "blogs"), where("userId", "==", profileUserId));
        const unsubscribeBlogs = onSnapshot(qBlogs, (snapshot) => {
            const blogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMyBlogs(blogs);
            setCounts(prev => ({ ...prev, blogs: blogs.length }));
        });

        const qOpps = query(collection(db, "opportunities"), where("userId", "==", profileUserId));
        const unsubscribeOpps = onSnapshot(qOpps, (snapshot) => {
            const opps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMyOpportunities(opps);
            setCounts(prev => ({ ...prev, opps: opps.length }));
        });

        const qEvents = query(collection(db, "events"), where("userId", "==", profileUserId));
        const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
            const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMyEvents(events);
            setCounts(prev => ({ ...prev, events: events.length }));
        });

        const qChallenges = query(collection(db, "challenges"), where("userId", "==", profileUserId));
        const unsubscribeChallenges = onSnapshot(qChallenges, (snapshot) => {
            const challenges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMyChallenges(challenges);
            setCounts(prev => ({ ...prev, challenges: challenges.length }));
        });

        const unsubscribePosts = getSingleStatus((posts) => {
            setMyPosts(posts);
            setCounts(prev => ({ ...prev, posts: posts.length }));
        }, profileUserId);

        return () => {
            unsubscribeProfile();
            unsubscribeBlogs();
            unsubscribeOpps();
            unsubscribeEvents();
            unsubscribeChallenges();
            unsubscribePosts();
        };
    }, [profileUserId, isOwnProfile]);

    useEffect(() => {
        if (!profileUserId) return;

        const unsubscribe = subscribeToConnections(profileUserId, async (cons) => {
            setConnections(cons);
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

    const handleConnect = async () => {
        if (!user || (!displayUser && !profileUserId)) {
            toast.error("Please log in or wait for profile to load.");
            return;
        }

        try {
            const targetId = displayUser?.uid || profileUserId;
            await sendConnectionRequest(user, targetId);
            toast.success("Connection request sent!");
        } catch (error) {
            toast.error(error.message || "Failed to send request.");
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

    const handleCoverChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return toast.error("Image must be less than 5MB");

        toast.info("Uploading cover photo...");
        try {
            const storageRef = ref(storage, `cover-photos/${user.uid}/${Date.now()}`);
            await uploadBytes(storageRef, file);
            const coverURL = await getDownloadURL(storageRef);
            await updateDoc(doc(db, "users", user.uid), { coverPhotoURL: coverURL });
            toast.success("Cover photo updated!");
        } catch (error) {
            toast.error("Failed to upload cover photo.");
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editData.name.trim()) return toast.error("Please enter your name");

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
                    updateObj.photoURL = await getDownloadURL(storageRef);
                    setPhotoPreview(updateObj.photoURL);
                } catch (photoError) {
                    toast.warning("Profile saved but photo upload failed");
                }
            }

            await updateDoc(doc(db, "users", user.uid), updateObj);
            clearTimeout(timeoutId);
            setDisplayUser(prev => ({ ...prev, ...updateObj }));
            setPhotoFile(null);
            setEditLoading(false);
            setEditOpen(false);
            toast.success("Profile updated successfully!");
        } catch (error) {
            clearTimeout(timeoutId);
            setEditLoading(false);
            toast.error(error?.message || "Failed to update profile.");
        }
    };

    if (!user) return null;

    return (
        <div className="bg-[#f3f2ef] w-full min-h-screen pt-8 pb-16">
            <div className="max-w-[1128px] mx-auto px-0 sm:px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                    {/* Main Left Column (Takes up 3/4) */}
                    <div className="md:col-span-3 space-y-4">

                        {/* 1. Intro Card */}
                        <Card className="overflow-hidden border-slate-300/60 shadow-none rounded-lg bg-white relative">
                            <div className="h-[200px] relative bg-slate-200 w-full group">
                                {displayUser?.coverPhotoURL ? (
                                    <img src={displayUser.coverPhotoURL} className="w-full h-full object-cover" alt="Cover" />
                                ) : (
                                    <div className="w-full h-full gradient-primary" />
                                )}
                                {isOwnProfile && (
                                    <>
                                        <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverChange} />
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => coverInputRef.current?.click()}
                                            className="absolute top-4 right-4 bg-white/90 hover:bg-white text-slate-800 h-8 font-semibold rounded-full shadow-sm"
                                        >
                                            <ImageIcon className="h-4 w-4 mr-2" />
                                            Edit background
                                        </Button>
                                    </>
                                )}
                            </div>

                            <CardContent className="px-6 pb-6 relative">
                                <div className="flex justify-between items-start">
                                    <Avatar className="h-[152px] w-[152px] border-4 border-white absolute -top-24 rounded-full shadow-sm bg-white cursor-pointer hover:opacity-90 transition-opacity">
                                        <AvatarImage src={displayUser?.photoURL} />
                                        <AvatarFallback className="text-5xl bg-slate-100 text-slate-400 font-semibold">{displayUser?.name?.[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>

                                    <div className="ml-auto mt-4 flex gap-2">
                                        {isOwnProfile ? (
                                            <>
                                                <Button variant="outline" className="rounded-full px-4 font-semibold border-slate-400 text-slate-600 hover:bg-slate-50 hover:border-slate-500" onClick={() => setEditOpen(true)}>
                                                    Add profile section
                                                </Button>
                                                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-slate-100 text-slate-600" onClick={() => setEditOpen(true)}>
                                                    <PenTool className="h-5 w-5" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button className="rounded-full px-5 bg-[#0a66c2] hover:bg-[#004182] text-white font-semibold shadow-none text-base h-9" onClick={() => handleMessage(displayUser.uid)}>
                                                    <MessageCircle className="h-4 w-4 mr-2" /> Message
                                                </Button>
                                                <Button variant="outline" className="rounded-full px-5 font-semibold border-[#0a66c2] text-[#0a66c2] hover:bg-[#ebf4fd] hover:border-2 hover:border-[#0a66c2] shadow-none text-base h-9" onClick={handleConnect}>
                                                    Connect
                                                </Button>
                                                <Button variant="outline" size="icon" className="rounded-full h-9 w-9 border-slate-500 text-slate-600 hover:bg-slate-100 hover:border-slate-600" onClick={() => toast.info('More options coming soon')}>
                                                    <MoreHorizontal className="h-5 w-5" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-[72px] sm:mt-[68px]">
                                    <div className="flex justify-between items-start">
                                        <div className="max-w-[75%]">
                                            <h1 className="text-2xl font-semibold text-slate-900 leading-tight">{displayUser?.name || "Member"}</h1>
                                            <p className="text-base text-slate-800 mt-[2px]">{displayUser?.role} at {displayUser?.company || displayUser?.department || "L.D. College of Engineering"}</p>

                                            <div className="flex items-center gap-1 mt-1 text-sm text-slate-500">
                                                {displayUser?.location ? <span>{displayUser.location}</span> : <span>Ahmedabad, Gujarat, India</span>}
                                                <span className="mx-1">•</span>
                                                <a href="#info" className="text-[#0a66c2] font-semibold hover:underline">Contact info</a>
                                            </div>

                                            <a href="#network" className="text-[#0a66c2] font-semibold hover:underline text-sm inline-block mt-2">
                                                {connectionDetails.length} connections
                                            </a>
                                        </div>

                                        <div className="text-sm font-semibold flex items-center gap-2 hover:underline cursor-pointer group pr-4">
                                            <div className="bg-slate-100 p-2 rounded shrink-0">
                                                <GraduationCap className="h-5 w-5 text-slate-700" />
                                            </div>
                                            <span className="text-slate-900 line-clamp-2">L.D. College of Engineering</span>
                                        </div>
                                    </div>

                                    {(displayUser?.portfolioUrl || displayUser?.linkedinUrl || displayUser?.twitterUrl) && (
                                        <div className="flex gap-4 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100 w-fit">
                                            {displayUser?.portfolioUrl && (
                                                <a href={displayUser.portfolioUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-slate-600 hover:text-[#0a66c2] hover:underline flex items-center gap-1">
                                                    Portfolio <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                            {displayUser?.linkedinUrl && (
                                                <a href={displayUser.linkedinUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-slate-600 hover:text-[#0a66c2] hover:underline flex items-center gap-1">
                                                    LinkedIn <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. About Card */}
                        {(displayUser?.bio || isOwnProfile) && (
                            <Card className="border-slate-300/60 shadow-none rounded-lg bg-white">
                                <CardHeader className="px-6 py-4 pb-2 flex flex-row items-center justify-between border-0">
                                    <CardTitle className="text-xl font-semibold text-slate-900">About</CardTitle>
                                    {isOwnProfile && (
                                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-slate-100 text-slate-600" onClick={() => setEditOpen(true)}>
                                            <PenTool className="h-5 w-5" />
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent className="px-6 pb-6">
                                    {displayUser?.bio ? (
                                        <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap">{displayUser.bio}</p>
                                    ) : (
                                        <p className="text-[15px] text-slate-500 italic">Add a summary to highlight your personality or work experience.</p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* 3. Activity & Contributions */}
                        <Card className="border-slate-300/60 shadow-none rounded-lg bg-white">
                            <CardHeader className="px-6 py-4 pb-0 border-0 flex flex-col pt-5">
                                <div className="flex justify-between w-full">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-slate-900">Activity</CardTitle>
                                        <p className="text-[15px] text-[#0a66c2] font-semibold hover:underline mt-0.5 cursor-pointer">
                                            {connectionDetails.length} followers
                                        </p>
                                    </div>
                                    {isOwnProfile ? (
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="rounded-full px-4 font-semibold border-[#0a66c2] text-[#0a66c2] hover:bg-[#ebf4fd] hover:border-2 shadow-none text-[15px] h-9" onClick={() => navigate('/achievements')}>
                                                Create a post
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 mt-2">
                                <Tabs defaultValue="posts" className="w-full">
                                    <TabsList className="w-full justify-start rounded-none border-b border-slate-200 bg-transparent p-0 pl-6 h-auto">
                                        <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#01754f] data-[state=active]:bg-transparent data-[state=active]:text-[#01754f] data-[state=active]:shadow-none px-4 py-3 font-semibold text-[15px] hover:bg-slate-50 transition-colors">Posts</TabsTrigger>
                                        <TabsTrigger value="opportunities" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#01754f] data-[state=active]:bg-transparent data-[state=active]:text-[#01754f] data-[state=active]:shadow-none px-4 py-3 font-semibold text-[15px] hover:bg-slate-50 transition-colors">Opportunities</TabsTrigger>
                                        <TabsTrigger value="challenges" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#01754f] data-[state=active]:bg-transparent data-[state=active]:text-[#01754f] data-[state=active]:shadow-none px-4 py-3 font-semibold text-[15px] hover:bg-slate-50 transition-colors">Challenges</TabsTrigger>
                                        <TabsTrigger value="events" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#01754f] data-[state=active]:bg-transparent data-[state=active]:text-[#01754f] data-[state=active]:shadow-none px-4 py-3 font-semibold text-[15px] hover:bg-slate-50 transition-colors">Events</TabsTrigger>
                                    </TabsList>

                                    <div className="p-0">
                                        {/* Posts Tab */}
                                        <TabsContent value="posts" className="m-0 focus-visible:outline-none">
                                            {myPosts.length === 0 ? (
                                                <div className="p-8 text-center text-slate-500 text-[15px]">You haven't posted anything yet.</div>
                                            ) : (
                                                <div className="divide-y divide-slate-200 border-b border-slate-200">
                                                    {myPosts.slice(0, 3).map((post) => (
                                                        <div key={post.id} className="p-6 pb-2">
                                                            <PostCard posts={post} currentUser={user} getEditData={() => toast.info("Edit from feed")} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <Button variant="ghost" className="w-full rounded-none rounded-b-lg font-semibold text-slate-600 h-12 hover:bg-slate-100/50" onClick={() => navigate('/achievements')}>
                                                Show all activity <Activity className="w-4 h-4 ml-2" />
                                            </Button>
                                        </TabsContent>

                                        {/* Challenges Tab */}
                                        <TabsContent value="challenges" className="m-0 p-6 focus-visible:outline-none">
                                            {myChallenges.length === 0 ? <p className="text-slate-500 text-[15px]">No challenges initiated.</p> : (
                                                <div className="space-y-4">
                                                    {myChallenges.slice(0, 3).map(c => (
                                                        <div key={c.id} className="border-b pb-4 last:border-b-0 cursor-pointer" onClick={() => navigate("/challenges")}>
                                                            <h4 className="font-semibold text-lg hover:text-[#0a66c2] hover:underline">{c.title}</h4>
                                                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{c.description || c.category}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>

                                        {/* Opportunities Tab */}
                                        <TabsContent value="opportunities" className="m-0 p-6 focus-visible:outline-none">
                                            {myOpportunities.length === 0 ? <p className="text-slate-500 text-[15px]">No opportunities posted.</p> : (
                                                <div className="space-y-4">
                                                    {myOpportunities.slice(0, 3).map(o => (
                                                        <div key={o.id} className="border-b pb-4 last:border-b-0 cursor-pointer" onClick={() => navigate("/opportunities")}>
                                                            <h4 className="font-semibold text-lg hover:text-[#0a66c2] hover:underline">{o.title}</h4>
                                                            <p className="text-sm text-slate-500 mt-1">{o.company} • {o.type || o.roleType}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>

                                        {/* Events Tab */}
                                        <TabsContent value="events" className="m-0 p-6 focus-visible:outline-none">
                                            {myEvents.length === 0 ? <p className="text-slate-500 text-[15px]">No events created.</p> : (
                                                <div className="space-y-4">
                                                    {myEvents.slice(0, 3).map(e => (
                                                        <div key={e.id} className="border-b pb-4 last:border-b-0 cursor-pointer" onClick={() => navigate("/events")}>
                                                            <h4 className="font-semibold text-lg hover:text-[#0a66c2] hover:underline">{e.title}</h4>
                                                            <p className="text-sm text-slate-500 mt-1">{e.date} • {e.location || 'Online'}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>
                                    </div>
                                </Tabs>
                            </CardContent>
                        </Card>

                        {/* 4. Experience & Education */}
                        <Card className="border-slate-300/60 shadow-none rounded-lg bg-white">
                            <CardHeader className="px-6 py-4 pb-2 flex flex-row items-center justify-between border-0 pt-5">
                                <CardTitle className="text-xl font-semibold text-slate-900">Experience</CardTitle>
                                {isOwnProfile && (
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-slate-100 text-slate-600" onClick={() => setEditOpen(true)}><Plus className="h-6 w-6" /></Button>
                                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-slate-100 text-slate-600" onClick={() => setEditOpen(true)}><PenTool className="h-5 w-5" /></Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="px-6 pb-6 border-b border-slate-200">
                                {displayUser?.company ? (
                                    <div className="flex gap-4">
                                        <div className="mt-1 shrink-0">
                                            <div className="h-12 w-12 bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                                <Briefcase className="h-6 w-6 text-slate-400" />
                                            </div>
                                        </div>
                                        <div className="flex flex-col w-full">
                                            <h3 className="text-base font-semibold text-slate-900 leading-tight">{displayUser.role || "Professional"}</h3>
                                            <p className="text-[15px] text-slate-800">{displayUser.company}</p>
                                            <p className="text-sm text-slate-500 mt-1">Full-time • Present</p>
                                            {displayUser.achievement && <p className="text-[15px] text-slate-800 mt-3 whitespace-pre-wrap">{displayUser.achievement}</p>}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[15px] text-slate-500 italic">No professional experience listed.</p>
                                )}
                            </CardContent>

                            <CardHeader className="px-6 py-4 pb-2 flex flex-row items-center justify-between border-0 pt-5">
                                <CardTitle className="text-xl font-semibold text-slate-900">Education</CardTitle>
                                {isOwnProfile && (
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-slate-100 text-slate-600" onClick={() => setEditOpen(true)}><Plus className="h-6 w-6" /></Button>
                                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-slate-100 text-slate-600" onClick={() => setEditOpen(true)}><PenTool className="h-5 w-5" /></Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="px-6 pb-6">
                                <div className="flex gap-4">
                                    <div className="mt-1 shrink-0">
                                        <div className="h-12 w-12 bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                            <span className="font-extrabold text-slate-800 tracking-tighter">LDCE</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col w-full">
                                        <h3 className="text-base font-semibold text-slate-900 leading-tight">L.D. College of Engineering</h3>
                                        <p className="text-[15px] text-slate-800">{displayUser?.department || "Bachelor's Degree"}</p>
                                        <p className="text-sm text-slate-500 mt-1">Founding Batch {displayUser?.graduationYear}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Rail (Takes up 1/4) */}
                    <div className="md:col-span-1 space-y-4 hidden md:block">
                        <Card className="border-slate-300/60 shadow-none rounded-lg bg-white">
                            <CardHeader className="px-5 py-4 pb-2 border-0">
                                <div className="flex justify-between items-center group cursor-pointer" onClick={() => setEditOpen(true)}>
                                    <div>
                                        <CardTitle className="text-[15px] font-semibold text-slate-900 group-hover:underline">Profile language</CardTitle>
                                        <p className="text-sm text-slate-500">English</p>
                                    </div>
                                    <PenTool className="h-4 w-4 text-slate-600" />
                                </div>
                            </CardHeader>
                            <Separator className="my-2" />
                            <CardHeader className="px-5 py-2 pt-0 border-0">
                                <div className="flex justify-between items-center group cursor-pointer" onClick={() => setEditOpen(true)}>
                                    <div className="truncate pr-4 flex-1">
                                        <CardTitle className="text-[15px] font-semibold text-slate-900 group-hover:underline truncate">Public profile & URL</CardTitle>
                                        <a href={`/profile/${profileUserId}`} className="text-sm text-slate-500 truncate block">www.aluverse.com/in/{profileUserId?.substring(0, 8)}...</a>
                                    </div>
                                    <PenTool className="h-4 w-4 text-slate-600 shrink-0" />
                                </div>
                            </CardHeader>
                        </Card>

                        <Card className="border-slate-300/60 shadow-none rounded-lg bg-white" id="network">
                            <CardHeader className="px-5 py-4 border-b border-slate-200/50">
                                <CardTitle className="text-[15px] font-semibold text-slate-900">People you may know</CardTitle>
                                <p className="text-xs text-slate-500 font-medium mt-1">From your alumni network</p>
                            </CardHeader>
                            <CardContent className="px-5 py-3">
                                {connectionDetails.length === 0 ? (
                                    <div className="py-6 text-center text-sm text-slate-500">No connections mapped yet.</div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {connectionDetails.slice(0, 5).map((con) => (
                                            <div key={con.id} className="py-3 flex items-start gap-3">
                                                <Avatar className="h-12 w-12 border border-slate-200 shadow-none cursor-pointer">
                                                    <AvatarImage src={con.photoURL} alt={con.name} />
                                                    <AvatarFallback className="bg-slate-100 text-slate-400 font-semibold">{con.name?.[0]?.toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-slate-900 text-[15px] hover:underline cursor-pointer truncate leading-tight mb-0.5" onClick={() => navigate(`/profile/${con.partnerId}`)}>{con.name}</h3>
                                                    <p className="text-xs text-slate-500 truncate leading-tight mb-2">{con.role} at {con.department}</p>
                                                    <Button variant="outline" size="sm" className="rounded-full h-8 px-4 border-slate-500 text-slate-600 font-semibold hover:bg-slate-100 hover:border-slate-700 w-full" onClick={() => handleMessage(con.partnerId)}>
                                                        Message
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                            <Button variant="ghost" className="w-full rounded-none rounded-b-lg font-semibold text-slate-600 h-10 border-t border-slate-200/50 hover:bg-slate-50" onClick={() => navigate('/directory')}>
                                Show all
                            </Button>
                        </Card>
                    </div>
                </div>

                {/* Edit Profile Dialog */}
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto px-0 bg-white shadow-xl rounded-xl">
                        <DialogHeader className="px-6 py-4 border-b border-slate-200">
                            <DialogTitle className="text-xl font-semibold text-slate-800">Edit intro</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleEditSubmit} className="space-y-6 px-6 py-4">
                            <p className="text-xs text-slate-500">* Indicates required</p>

                            {/* Photo Upload */}
                            <div className="space-y-3">
                                <Label className="font-semibold text-slate-700">Profile Photo</Label>
                                <div className="flex items-center gap-6">
                                    <Avatar className="h-24 w-24 border-2 border-slate-200">
                                        <AvatarImage src={photoPreview} />
                                        <AvatarFallback className="text-3xl bg-slate-100">{editData.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                        <Button type="button" variant="outline" className="border-[#0a66c2] text-[#0a66c2] hover:bg-[#ebf4fd] hover:border-[#0a66c2] font-semibold rounded-full px-5" onClick={() => fileInputRef.current?.click()}>
                                            {photoFile ? "Change Photo" : "Add Photo"}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label htmlFor="name" className="font-semibold text-slate-700">Full name *</Label>
                                    <Input id="name" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="border-slate-500 text-[15px] h-10 rounded focus-visible:ring-[#0a66c2]" required />
                                </div>
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label htmlFor="company" className="font-semibold text-slate-700">Current company</Label>
                                    <Input id="company" value={editData.company} onChange={(e) => setEditData({ ...editData, company: e.target.value })} className="border-slate-500 text-[15px] h-10 rounded focus-visible:ring-[#0a66c2]" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bio" className="font-semibold text-slate-700">Headline</Label>
                                <textarea id="bio" value={editData.bio} onChange={(e) => setEditData({ ...editData, bio: e.target.value })} className="w-full px-3 py-2 border border-slate-500 rounded focus:outline-none focus:ring-1 focus:ring-[#0a66c2] resize-none text-[15px]" rows={3} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="achievement" className="font-semibold text-slate-700">Experience summary</Label>
                                <textarea id="achievement" value={editData.achievement} onChange={(e) => setEditData({ ...editData, achievement: e.target.value })} className="w-full px-3 py-2 border border-slate-500 rounded focus:outline-none focus:ring-1 focus:ring-[#0a66c2] resize-none text-[15px]" rows={4} />
                            </div>

                            <div className="border-t border-slate-200 pt-6">
                                <h3 className="font-semibold text-slate-800 mb-4 text-lg">Contact info</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="linkedin" className="font-semibold text-slate-700">LinkedIn Profile</Label>
                                        <Input id="linkedin" type="url" value={editData.linkedinUrl} onChange={(e) => setEditData({ ...editData, linkedinUrl: e.target.value })} className="border-slate-500 text-[15px] h-10 rounded" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="portfolio" className="font-semibold text-slate-700">Personal Website</Label>
                                        <Input id="portfolio" type="url" value={editData.portfolioUrl} onChange={(e) => setEditData({ ...editData, portfolioUrl: e.target.value })} className="border-slate-500 text-[15px] h-10 rounded" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 pb-2">
                                <Button type="button" variant="ghost" className="font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full px-5" onClick={() => setEditOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={editLoading} className="font-semibold bg-[#0a66c2] hover:bg-[#004182] text-white rounded-full px-6">
                                    {editLoading ? "Saving..." : "Save"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default Profile;
