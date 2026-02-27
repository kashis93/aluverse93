import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { subscribeToConnections, subscribeToLastMessage } from "@/services/socialService";
import { db } from "@/services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Avatar, AvatarImage, AvatarFallback, Button, Input } from "@/components/ui";
import { User, Search, MessageCircle, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ChatSidebar = ({ selectedUserId, onSelectUser }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [connectionDetails, setConnectionDetails] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const messageUnsubscribes = [];

    const unsubscribe = subscribeToConnections(user.uid, async (cons) => {
      setConnections(cons);
      
      messageUnsubscribes.forEach(unsub => unsub());
      messageUnsubscribes.length = 0;

      const details = await Promise.all(cons.map(async (con) => {
        const partnerDoc = await getDoc(doc(db, "users", con.partnerId));
        return { 
          id: con.id, 
          partnerId: con.partnerId, 
          ...(partnerDoc.exists() ? partnerDoc.data() : {}) 
        };
      }));
      setConnectionDetails(details);
      setLoading(false);

      details.forEach(detail => {
        const unsubMsg = subscribeToLastMessage(user.uid, detail.partnerId, (lastMsg) => {
          setLastMessages(prev => ({
            ...prev,
            [detail.partnerId]: lastMsg
          }));
        });
        messageUnsubscribes.push(unsubMsg);
      });
    });

    return () => {
      unsubscribe();
      messageUnsubscribes.forEach(unsub => unsub?.());
    };
  }, [user]);

  const filtered = connectionDetails
    .filter(con =>
      con.name?.toLowerCase().includes(search.toLowerCase()) ||
      con.email?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const timeA = lastMessages[a.partnerId]?.timestamp?.toDate?.()?.getTime?.() || 0;
      const timeB = lastMessages[b.partnerId]?.timestamp?.toDate?.()?.getTime?.() || 0;
      return timeB - timeA;
    });

  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <h2 className="font-bold text-lg text-slate-800 mb-3">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Loading connections...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center">
            <div className="h-12 w-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-muted-foreground">
              {search ? "No conversations found" : "No conversations yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Connect with alumni or students to message them</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filtered.map((con) => {
              const lastMsg = lastMessages[con.partnerId];
              return (
                <div
                  key={con.partnerId}
                  onClick={() => onSelectUser(con.partnerId, con)}
                  className={`p-3 rounded-lg transition-all cursor-pointer border-l-4 ${
                    selectedUserId === con.partnerId
                      ? "bg-white border-l-primary shadow-sm"
                      : "bg-transparent border-l-transparent hover:bg-white/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm flex-shrink-0">
                      <AvatarImage src={con.photoURL} />
                      <AvatarFallback>{con.name?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-semibold text-sm text-slate-800 truncate">
                          {con.name || "Anonymous"}
                        </h3>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatTime(lastMsg?.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {lastMsg?.text || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
