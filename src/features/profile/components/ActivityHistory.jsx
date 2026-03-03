import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { db } from "@/services/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Button, Avatar, AvatarImage, AvatarFallback, Badge } from "@/components/ui";
import { ArrowLeft, Clock, CalendarCheck, Briefcase, Trophy, Globe, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import PostCard from "@/features/achievements/components/PostCard";
import { toast } from "sonner";
import noteworthyAlumniRaw from "@/data/noteworthyAlumni.json";
import { alumni as dummyAlumni } from "@/data/dummyData.js";
import React, { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("ActivityHistory Render Error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return <div className="p-4 bg-red-50 text-red-600 rounded">Error rendering item: {this.state.error?.message}</div>;
        }
        return this.props.children;
    }
}

const ActivityHistory = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const profileUserId = id || user?.uid;

    const [loading, setLoading] = useState(true);
    const [displayUser, setDisplayUser] = useState(null);
    const [activities, setActivities] = useState([]);

    // Temporary specific arrays before mingling
    const [posts, setPosts] = useState([]);
    const [opportunities, setOpportunities] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [events, setEvents] = useState([]);

    // Fetch user basic data for display header
    useEffect(() => {
        if (!profileUserId) return;

        // Let's resolve the user header info first:
        let isSubscribed = true;

        import("firebase/firestore").then(({ doc, getDoc }) => {
            const fetchProfile = async () => {
                const userDocRef = doc(db, "users", profileUserId);
                const docSnap = await getDoc(userDocRef);
                if (!isSubscribed) return;

                if (docSnap.exists()) {
                    setDisplayUser({ uid: docSnap.id, ...docSnap.data() });
                } else {
                    let staticUser = dummyAlumni.find(a => a.id === profileUserId);
                    if (!staticUser && profileUserId.startsWith("nw-")) {
                        const nwId = profileUserId.replace("nw-", "");
                        const raw = noteworthyAlumniRaw.find(a => a.id == nwId);
                        if (raw) staticUser = { name: raw.name, photoURL: raw.image, role: "Alumni" };
                    }
                    if (staticUser) setDisplayUser(staticUser);
                }
            };
            fetchProfile();
        });

        // -------------------------------------------------------------
        // STRICT INLINE LISTENERS WITH CLEARED UNMOUNTS TO PREVENT CRASH
        // -------------------------------------------------------------

        // 1. Opportunities Listener
        const qOpps = query(collection(db, "opportunities"), where("userId", "==", profileUserId));
        const unsubOpps = onSnapshot(qOpps, (snapshot) => {
            const opps = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                _type: 'opportunity',
                _sortTime: doc.data().timestamp?.toMillis?.() || new Date(doc.data().timestamp || Date.now()).getTime()
            }));
            setOpportunities(opps);
        });

        // 2. Events Listener
        const qEvents = query(collection(db, "events"), where("userId", "==", profileUserId));
        const unsubEvents = onSnapshot(qEvents, (snapshot) => {
            const evts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                _type: 'event',
                _sortTime: doc.data().timestamp?.toMillis?.() || new Date(doc.data().timestamp || Date.now()).getTime()
            }));
            setEvents(evts);
        });

        // 3. Challenges Listener
        const qChallenges = query(collection(db, "challenges"), where("userId", "==", profileUserId));
        const unsubChallenges = onSnapshot(qChallenges, (snapshot) => {
            const chals = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                _type: 'challenge',
                _sortTime: doc.data().timestamp?.toMillis?.() || new Date(doc.data().timestamp || Date.now()).getTime()
            }));
            setChallenges(chals);
        });

        // 4. Posts Listener (DIRECT, NOT VIA postsAPI.js to safeguard unmounts)
        const qPosts = query(collection(db, "alumni_posts"), where("userID", "==", profileUserId));
        const unsubPosts = onSnapshot(qPosts, (snapshot) => {
            const formattedPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                _type: 'post',
                _sortTime: doc.data().timeStamp?.toMillis?.() || new Date(doc.data().timeStamp || Date.now()).getTime()
            }));
            setPosts(formattedPosts);
        });

        // Critical safety unmount block
        return () => {
            isSubscribed = false;
            unsubOpps();
            unsubEvents();
            unsubChallenges();
            unsubPosts();
        };
    }, [profileUserId]);

    // Merge and sort all activities chronologically
    useEffect(() => {
        const merged = [...posts, ...opportunities, ...challenges, ...events];
        merged.sort((a, b) => b._sortTime - a._sortTime); // newest first
        setActivities(merged);

        // Artificial small delay to prevent skeleton screen flash
        const timer = setTimeout(() => {
            setLoading(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [posts, opportunities, challenges, events]);

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return "Recently";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return formatDistanceToNow(date, { addSuffix: true });
        } catch (e) {
            return "Recently";
        }
    };

    const getFullDate = (timestamp) => {
        if (!timestamp) return "";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return "";
        }
    };

    if (!user) return null;

    return (
        <div className="bg-[#f3f2ef] w-full min-h-screen pt-8 pb-16">
            <div className="max-w-[780px] mx-auto px-4">

                {/* Header Back Button & Profile Info */}
                <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <Button variant="ghost" className="h-10 gap-2 font-semibold hover:bg-slate-200" onClick={() => navigate(`/profile/${profileUserId}`)}>
                        <ArrowLeft className="h-5 w-5" />
                        Back to Profile
                    </Button>

                    {displayUser && (
                        <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                <AvatarImage src={displayUser.photoURL} />
                                <AvatarFallback>{displayUser.name?.[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className="font-bold text-slate-900 leading-tight">{displayUser.name}'s Activity</h1>
                                <p className="text-sm text-slate-500">{activities.length} total actions</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Timeline Feed */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : activities.length === 0 ? (
                    <Card className="p-12 text-center shadow-sm">
                        <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No active history</h3>
                        <p className="text-slate-500">This user hasn't posted any activity yet.</p>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {activities.map((activity) => (
                            <div key={`${activity._type}-${activity.id}`}>
                                {/* Post Layout */}
                                {activity._type === 'post' && (
                                    <ErrorBoundary key={activity.id}>
                                        <PostCard posts={activity} currentUser={user} getEditData={() => toast.info("Edit from feed")} />
                                    </ErrorBoundary>
                                )}

                                {/* Opportunity Layout */}
                                {activity._type === 'opportunity' && (
                                    <ErrorBoundary key={activity.id}>
                                        <Card className="rounded-xl overflow-hidden border border-border/60 shadow-sm relative p-6 bg-white hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-bold uppercase tracking-wider text-[10px] px-2.5 py-1">
                                                    Opportunity Posted
                                                </Badge>
                                                <span className="text-xs text-slate-500 font-medium ml-auto flex items-center gap-1 group relative">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatTimestamp(activity.timestamp)}
                                                    <div className="absolute hidden group-hover:block bottom-full mb-2 right-0 bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                                                        {getFullDate(activity.timestamp)}
                                                    </div>
                                                </span>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="h-12 w-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-primary text-xl shrink-0">
                                                    {activity.company ? activity.company[0] : <Briefcase className="h-5 w-5" />}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">{activity.title}</h3>
                                                    <p className="font-semibold text-slate-600 text-sm mb-3">{activity.company} • {activity.type}</p>
                                                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 mb-4 bg-slate-50 p-2 rounded-md border border-slate-100 w-fit">
                                                        <span className="flex items-center gap-1.5"><CalendarCheck className="h-3.5 w-3.5 text-slate-400" /> Apply by {activity.deadline}</span>
                                                    </div>
                                                    <Button
                                                        className="rounded-full shadow-none bg-[#0a66c2] hover:bg-[#004182] font-semibold px-6 py-0 h-9"
                                                        onClick={() => window.open(activity.applicationLink || `mailto:${activity.contactInfo}`, "_blank")}
                                                    >
                                                        View Context
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    </ErrorBoundary>
                                )}

                                {/* Event Layout */}
                                {activity._type === 'event' && (
                                    <ErrorBoundary key={activity.id}>
                                        <Card className="rounded-xl overflow-hidden border border-border/60 shadow-sm relative p-0 bg-white hover:shadow-md transition-shadow">
                                            <div className="p-6">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold uppercase tracking-wider text-[10px] px-2.5 py-1">
                                                        Event Hosted
                                                    </Badge>
                                                    <span className="text-xs text-slate-500 font-medium ml-auto flex items-center gap-1 group relative">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {formatTimestamp(activity.timestamp)}
                                                        <div className="absolute hidden group-hover:block bottom-full mb-2 right-0 bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                                                            {getFullDate(activity.timestamp)}
                                                        </div>
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2">{activity.title}</h3>
                                                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{activity.description}</p>
                                                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 mb-4 bg-slate-50 p-3 rounded-md border border-slate-100 w-fit">
                                                    <span className="flex items-center gap-1.5">
                                                        <CalendarCheck className="h-3.5 w-3.5 text-slate-400" /> {activity.date} at {activity.time}
                                                    </span>
                                                    <span className="flex items-center gap-1.5 ml-2">
                                                        {activity.eventType === 'online' ? <Globe className="h-3.5 w-3.5 text-slate-400" /> : <MapPin className="h-3.5 w-3.5 text-slate-400" />}
                                                        {activity.eventType === 'online' ? 'Online' : activity.location}
                                                    </span>
                                                </div>
                                                <Button
                                                    className="rounded-full shadow-none bg-[#0a66c2] hover:bg-[#004182] font-semibold px-6 py-0 h-9"
                                                    onClick={() => window.open(activity.registrationLink || activity.meetingLink || `mailto:${activity.contactInfo}`, "_blank")}
                                                >
                                                    View Event Details
                                                </Button>
                                            </div>
                                        </Card>
                                    </ErrorBoundary>
                                )}

                                {/* Challenge Layout */}
                                {activity._type === 'challenge' && (
                                    <ErrorBoundary key={activity.id}>
                                        <Card className="rounded-xl overflow-hidden border border-border/60 shadow-sm relative p-6 bg-white hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Badge className="bg-purple-50 text-purple-700 border-purple-100 font-bold uppercase tracking-wider text-[10px] px-2.5 py-1">
                                                    Challenge Initiated
                                                </Badge>
                                                <span className="text-xs text-slate-500 font-medium ml-auto flex items-center gap-1 group relative">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatTimestamp(activity.timestamp)}
                                                    <div className="absolute hidden group-hover:block bottom-full mb-2 right-0 bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                                                        {getFullDate(activity.timestamp)}
                                                    </div>
                                                </span>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="h-12 w-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-purple-600 text-xl shrink-0">
                                                    <Trophy className="h-6 w-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2">{activity.title}</h3>
                                                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{activity.description}</p>
                                                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 mb-4 bg-slate-50 p-2 rounded-md border border-slate-100 w-fit">
                                                        <span className="flex items-center gap-1.5"><CalendarCheck className="h-3.5 w-3.5 text-slate-400" /> Deadline: {activity.deadline}</span>
                                                    </div>
                                                    <Button
                                                        className="rounded-full shadow-none bg-[#0a66c2] hover:bg-[#004182] font-semibold px-6 py-0 h-9"
                                                        onClick={() => window.open(activity.externalLink || `mailto:${activity.contactInfo}`, "_blank")}
                                                    >
                                                        Participate
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    </ErrorBoundary>
                                )}

                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityHistory;
