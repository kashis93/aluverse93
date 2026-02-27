import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { db } from "@/services/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { MessageCircle, User, ChevronRight, Search, X, Send, Phone, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Chat = ({ onClose }) => {
    const { user } = useAuth();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeChatId, setActiveChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [selectedUserData, setSelectedUserData] = useState(null);
    const [users, setUsers] = useState([]);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "chats"),
            where("participants", "array-contains", user.uid),
            orderBy("lastUpdate", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setChats(chatList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!activeChatId) return;

        const unsubscribe = onSnapshot(
            query(collection(db, `chats/${activeChatId}/messages`), orderBy("createdAt", "asc")),
            (snapshot) => {
                setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }
        );

        return () => unsubscribe();
    }, [activeChatId]);

    const handleSelectChat = async (chatId) => {
        setActiveChatId(chatId);
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
            const partnerId = chat.participants.find(p => p !== user.uid);
            const userSnap = await getDoc(doc(db, "users", partnerId));
            if (userSnap.exists()) {
                setSelectedUserData(userSnap.data());
            }
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || !activeChatId || !user) return;

        const timestamp = new Date();
        const newMsg = {
            senderId: user.uid,
            content: inputText,
            status: 'sent',
            createdAt: timestamp,
            type: 'text'
        };

        setMessages(prev => [...prev, newMsg]);

        const notif = {
            id: Date.now(),
            type: 'message_sent',
            message: `Message sent to ${selectedUserData?.name || 'User'}`,
            timestamp: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'sent'
        };
        setNotifications(prev => [...prev, notif]);

        setInputText('');

        setTimeout(() => {
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'delivered' } : n));
        }, 1000);

        setTimeout(() => {
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'read' } : n));
        }, 2000);
    };

    if (!activeChatId) {
        return (
            <div className="h-full flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-green-100">
                    <h2 className="text-lg font-bold text-gray-900">Chats</h2>
                    {onClose && <button onClick={onClose} className="p-1 hover:bg-green-200 rounded-lg transition"><X className="h-5 w-5 text-gray-600" /></button>}
                </div>
                
                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : chats.length === 0 ? (
                        <div className="text-center py-12">
                            <MessageCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500">No chats yet</p>
                        </div>
                    ) : (
                        chats.map(chat => (
                            <button
                                key={chat.id}
                                onClick={() => handleSelectChat(chat.id)}
                                className="w-full p-3 flex items-center space-x-3 hover:bg-green-50 rounded-lg transition border-l-4 border-transparent hover:border-green-500"
                            >
                                <Avatar className="h-12 w-12 border-2 border-green-200">
                                    <AvatarFallback className="bg-green-500 text-white">{selectedUserData?.name?.[0] || '?'}</AvatarFallback>
                                </Avatar>
                                <div className="text-left flex-1">
                                    <p className="font-semibold text-gray-900">{selectedUserData?.name || 'Chat'}</p>
                                    <p className="text-sm text-gray-600">{selectedUserData?.role === 'alumni' ? '👨‍🎓 Alumni' : '📚 Student'}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        );
    }

    const isAlumni = selectedUserData?.role === 'alumni';

    return (
        <div className="h-full flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-green-100">
                <div className="flex items-center space-x-3">
                    <button onClick={() => setActiveChatId(null)} className="p-1 hover:bg-green-200 rounded transition">←</button>
                    <Avatar className="h-10 w-10 border-2 border-green-500">
                        <AvatarFallback className={`text-white ${isAlumni ? 'bg-green-500' : 'bg-blue-500'}`}>
                            {selectedUserData?.name?.[0] || '?'}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="font-bold text-gray-900">{selectedUserData?.name || 'Chat'}</h3>
                        <p className="text-xs text-gray-600">{isAlumni ? '👨‍🎓 Alumni' : '📚 Student'}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-green-200 rounded-lg transition text-green-600"><Phone className="h-5 w-5" /></button>
                    <button className="p-2 hover:bg-green-200 rounded-lg transition text-green-600"><Video className="h-5 w-5" /></button>
                    {onClose && <button onClick={onClose} className="p-1 hover:bg-green-200 rounded-lg transition"><X className="h-5 w-5 text-gray-600" /></button>}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50" ref={messagesContainerRef}>
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-12">Say hello!</div>
                ) : (
                    messages.map((msg, i) => {
                        const isMe = msg.senderId === user?.uid;
                        return (
                            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs px-4 py-2 rounded-lg shadow-sm ${
                                    isMe 
                                        ? 'bg-green-600 text-white rounded-br-none' 
                                        : isAlumni 
                                        ? 'bg-blue-100 text-gray-900 border border-blue-300 rounded-bl-none' 
                                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                                }`}>
                                    <p className="text-sm">{msg.content}</p>
                                    <div className={`flex items-center justify-end mt-1 text-[10px] ${isMe ? 'text-green-100' : 'text-gray-500'}`}>
                                        {msg.createdAt?.toDate?.().toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit' }) || 'now'}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200 flex space-x-2 bg-white">
                <input
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Message..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage(e)}
                />
                <button 
                    onClick={handleSendMessage} 
                    disabled={!inputText.trim()} 
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white p-2 rounded-lg transition shadow-md"
                >
                    <Send className="h-5 w-5" />
                </button>
            </div>

            <AnimatePresence>
                {notifications.length > 0 && (
                    <div className="absolute bottom-20 right-4 max-w-xs space-y-2 z-50">
                        {notifications.map(notif => (
                            <motion.div
                                key={notif.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg text-white ${
                                    notif.status === 'read' ? 'bg-green-600' : notif.status === 'delivered' ? 'bg-blue-600' : 'bg-gray-600'
                                }`}
                            >
                                {notif.message} <span className="text-xs ml-2">{notif.status === 'read' ? '✓✓' : notif.status === 'delivered' ? '✓' : '...'}</span>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Chat;
