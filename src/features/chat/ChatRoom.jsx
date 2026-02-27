import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { subscribeToMessages, sendMessage, getOrCreateChat } from "@/services/socialService";
import { db } from "@/services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Button, Input, Avatar, AvatarImage, AvatarFallback, Card, CardContent, CardHeader, CardTitle, ScrollArea } from "@/components/ui";
import { Send, User, Info, MessageCircle } from "lucide-react";
import ChatSidebar from "./ChatSidebar";

const ChatRoom = () => {
    const { id: initialChatId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedUserData, setSelectedUserData] = useState(null);
    const [currentChatId, setCurrentChatId] = useState(initialChatId);
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (!currentChatId) return;

        const unsubscribe = subscribeToMessages(currentChatId, (msgs) => {
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [currentChatId]);

    const handleSelectUser = async (partnerId, userData) => {
        setSelectedUserId(partnerId);
        setSelectedUserData(userData);
        
        const newChatId = await getOrCreateChat(user.uid, partnerId);
        setCurrentChatId(newChatId);
        navigate(`/chat/${newChatId}`);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !currentChatId || isSending) return;

        const messageText = newMessage;
        setNewMessage("");
        setIsSending(true);

        try {
            await sendMessage(currentChatId, user.uid, messageText);
        } catch (error) {
            console.error("Failed to send message:", error);
            setNewMessage(messageText);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-6rem)] bg-white overflow-hidden">
            {/* Sidebar */}
            <ChatSidebar selectedUserId={selectedUserId} onSelectUser={handleSelectUser} />

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {currentChatId ? (
                    <Card className="flex-grow flex flex-col overflow-hidden border-0 rounded-0 shadow-none">
                        <CardHeader className="border-b bg-white flex flex-row items-center justify-between gap-4 py-4 px-6">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-sm">
                                    <AvatarImage src={selectedUserData?.photoURL} />
                                    <AvatarFallback><User className="h-6 w-6 text-slate-400" /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-lg font-bold text-slate-800">
                                        {selectedUserData?.name || "Chat Room"}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedUserData?.role} · {selectedUserData?.department}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    if (selectedUserData?.partnerId) {
                                        navigate(`/profile/${selectedUserData.partnerId}`, { state: { userData: selectedUserData } });
                                    }
                                }}
                                className="rounded-full hover:bg-slate-100"
                            >
                                <Info className="h-5 w-5 text-slate-600" />
                            </Button>
                        </CardHeader>

                        <CardContent className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50/50" id="messages-container">
                            {messages.length === 0 ? (
                                <div className="text-center text-muted-foreground py-12">
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.senderId === user?.uid;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${isMe
                                                        ? "bg-primary text-primary-foreground rounded-br-none"
                                                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                                                    }`}
                                            >
                                                <p>{msg.text}</p>
                                                <span className={`text-[10px] block mt-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                                    {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={scrollRef} />
                        </CardContent>

                        <div className="p-4 bg-white border-t">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    disabled={isSending}
                                    className="flex-grow bg-slate-50 border-slate-200 focus-visible:ring-primary disabled:opacity-50"
                                />
                                <Button 
                                    type="submit" 
                                    size="icon" 
                                    disabled={isSending || !newMessage.trim()}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50"
                                >
                                    <Send className="h-5 w-5" />
                                </Button>
                            </form>
                        </div>
                    </Card>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <MessageCircle className="h-10 w-10 text-slate-300" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Select a conversation</h2>
                        <p className="text-muted-foreground mt-2">Choose someone from your connections to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatRoom;
