import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { subscribeToIncomingRequests, acceptConnection, rejectConnection, subscribeToConnections, subscribeToActivities, subscribeToIncomingMessages } from "@/services/socialService";
import { Button, Avatar, AvatarImage, AvatarFallback, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { User, Check, X, Bell, Briefcase, CheckCircle, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/services/firebase";
import { collection, onSnapshot, query, where, orderBy, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Notifications = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [pendingRequests, setPendingRequests] = useState([]);
    const [acceptedConnections, setAcceptedConnections] = useState([]);
    const [activities, setActivities] = useState([]);
    const [incomingMessages, setIncomingMessages] = useState([]);
    const [senderData, setSenderData] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const pendingQ = query(
            collection(db, "connections"),
            where("toId", "==", user.uid),
            where("status", "==", "pending"),
            orderBy("timestamp", "desc")
        );
        const unsubPending = onSnapshot(pendingQ, (snapshot) => {
            const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingRequests(requests);
        });

        const acceptedQ = query(
            collection(db, "connections"),
            where("fromId", "==", user.uid),
            where("status", "==", "accepted"),
            orderBy("timestamp", "desc")
        );
        const unsubAccepted = onSnapshot(acceptedQ, (snapshot) => {
            const connections = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAcceptedConnections(connections);
        });

        const unsubConnections = subscribeToConnections(user.uid, (cons) => {
            const partnerIds = cons.map(c => c.partnerId);
            if (partnerIds.length > 0) {
                const unsubActivities = subscribeToActivities(partnerIds, (newActs) => {
                    setActivities(newActs);
                });
                return () => unsubActivities();
            }
            setLoading(false);
        });

        const unsubMessages = subscribeToIncomingMessages(user.uid, (messages) => {
            const uniqueMessages = Array.from(
                new Map(messages.map(m => [m.partnerId, m])).values()
            ).slice(0, 5);

            setIncomingMessages(uniqueMessages);

            Promise.all(
                uniqueMessages.map(async (msg) => {
                    const userDoc = await getDoc(doc(db, "users", msg.senderId));
                    if (userDoc.exists()) {
                        return [msg.senderId, userDoc.data()];
                    }
                    return null;
                })
            ).then(results => {
                const senders = {};
                results.forEach(result => {
                    if (result) senders[result[0]] = result[1];
                });
                setSenderData(senders);
            });
        });

        return () => {
            unsubPending();
            unsubAccepted();
            unsubConnections();
            unsubMessages();
        };
    }, [user]);

    const handleAccept = async (requestId, name) => {
        try {
            await acceptConnection(requestId);
            toast.success(`Connected with ${name}!`);
        } catch (error) {
            console.error("Failed to accept connection:", error);
            toast.error("Failed to accept request.");
        }
    };

    const handleReject = async (requestId, name) => {
        try {
            await rejectConnection(requestId);
            toast.success(`Rejected connection request from ${name}`);
        } catch (error) {
            console.error("Failed to reject connection:", error);
            toast.error("Failed to reject request.");
        }
    };

    return (
        <div className="container max-w-2xl mx-auto px-4 py-20 min-h-screen">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Bell className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Notifications</h1>
                    <p className="text-muted-foreground">Manage connections and view network updates</p>
                </div>
            </div>

            <div className="space-y-8">
                {/* Activity Updates */}
                {activities.length > 0 && (
                    <Card className="border-slate-200 shadow-xl overflow-hidden rounded-[2rem]">
                        <CardHeader className="bg-slate-50 border-b py-4">
                            <CardTitle className="text-lg font-bold">Network Updates</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {activities.map((act) => (
                                    <div key={act.id} className="p-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                                        <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 shrink-0">
                                            <Briefcase className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-800">
                                                <span className="font-bold">{act.authorName}</span> posted a new {act.type}: 
                                                <span className="font-semibold text-primary ml-1">{act.title}</span> at {act.company}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                {act.timestamp?.toDate().toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Connection Requests */}
                <Card className="border-slate-200 shadow-xl overflow-hidden rounded-[2rem]">
                    <CardHeader className="bg-slate-50 border-b py-4">
                        <CardTitle className="text-lg font-bold">Connection Requests</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-12 text-center text-muted-foreground">Loading requests...</div>
                        ) : pendingRequests.length === 0 ? (
                            <div className="p-20 text-center text-muted-foreground">
                                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <User className="h-8 w-8 text-slate-300" />
                                </div>
                                <p className="font-medium">No pending requests</p>
                                <p className="text-sm">When someone wants to connect, you'll see them here.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                <AnimatePresence>
                                    {pendingRequests.map((req) => (
                                        <motion.div
                                            key={req.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                                    <AvatarImage src={req.fromPhoto} />
                                                    <AvatarFallback><User className="h-6 w-6 text-slate-400" /></AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h3 className="font-bold text-slate-800">{req.fromName}</h3>
                                                    <p className="text-xs text-muted-foreground">Wants to connect with you</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="rounded-full border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100"
                                                    onClick={() => handleReject(req.id, req.fromName)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleAccept(req.id, req.fromName)}
                                                    className="rounded-full gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                >
                                                    <Check className="h-4 w-4 mr-1" /> Accept
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Incoming Messages */}
                {incomingMessages.length > 0 && (
                    <Card className="border-slate-200 shadow-xl overflow-hidden rounded-[2rem]">
                        <CardHeader className="bg-slate-50 border-b py-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <MessageCircle className="h-5 w-5 text-cyan-500" />
                                New Messages
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                <AnimatePresence>
                                    {incomingMessages.map((msg) => {
                                        const sender = senderData[msg.senderId];
                                        return (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="p-4 flex items-start gap-3 hover:bg-slate-50/50 transition-colors cursor-pointer"
                                                onClick={() => navigate(`/chat/${msg.chatId}`)}
                                            >
                                                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                                    <AvatarImage src={sender?.photoURL} />
                                                    <AvatarFallback>{sender?.name?.[0]?.toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-slate-800">{sender?.name || "Unknown"}</h3>
                                                    <p className="text-sm text-slate-700 truncate">{msg.text}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-1">
                                                        {msg.timestamp?.toDate?.().toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit' }) || 'Just now'}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    className="rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/chat/${msg.chatId}`);
                                                    }}
                                                >
                                                    <MessageCircle className="h-4 w-4" />
                                                </Button>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default Notifications;
