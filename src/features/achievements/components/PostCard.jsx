import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deletePost } from "@/services/postsAPI";
import LikeButton from "./LikeButton";
import { MoreHorizontal, Trash2, Edit2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback, Card, CardContent, Button } from "@/components/ui";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui";
import { Dialog, DialogContent } from "@/components/ui";

export default function PostCard({ posts, getEditData, currentUser }) {
    const navigate = useNavigate();
    const [imageModal, setImageModal] = useState(false);

    // Fallback structure in case users don't have certain properties
    const isOwner = currentUser?.uid === posts.userID;

    return (
        <Card className="border-slate-200 shadow-xl rounded-[2rem] overflow-hidden mb-6 bg-white transition-all hover:shadow-2xl">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4">
                        <Avatar
                            className="h-12 w-12 cursor-pointer ring-2 ring-primary/10 shadow-sm"
                            onClick={() => navigate(`/profile/${posts.userID}`)}
                        >
                            <AvatarImage src={posts.userPhotoURL} alt={posts.userName} />
                            <AvatarFallback>{posts.userName?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p
                                className="font-bold text-slate-900 cursor-pointer hover:text-primary transition-colors hover:underline decoration-2 underline-offset-4"
                                onClick={() => navigate(`/profile/${posts.userID}`)}
                            >
                                {posts.userName}
                            </p>
                            <p className="text-xs font-medium text-slate-500 mb-0.5">{posts.userHeadline || "Alumni Member"}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{posts.timeStamp}</p>
                        </div>
                    </div>

                    {isOwner && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                                    <MoreHorizontal className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-2xl border-slate-100 shadow-xl p-2">
                                <DropdownMenuItem
                                    onClick={() => getEditData(posts)} className="cursor-pointer font-bold text-slate-600 focus:bg-primary/10 focus:text-primary rounded-xl mb-1 py-3"
                                >
                                    <Edit2 className="h-4 w-4 mr-2" /> Edit Post
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        if (window.confirm("Are you sure you want to delete this post?")) {
                                            deletePost(posts.id);
                                        }
                                    }}
                                    className="cursor-pointer font-bold text-rose-600 focus:bg-rose-50 focus:text-rose-700 rounded-xl py-3"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                <div className="prose prose-slate max-w-none mb-4 text-slate-700 text-[15px] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: posts.content || posts.status }} />

                {posts.postImage && (
                    <div
                        className="relative rounded-2xl overflow-hidden cursor-pointer group border border-slate-200 shadow-sm"
                        onClick={() => setImageModal(true)}
                    >
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors z-10" />
                        <img
                            src={posts.postImage}
                            className="w-full max-h-[500px] object-cover"
                            alt="Post attachment"
                        />
                    </div>
                )}

                <LikeButton
                    userId={currentUser?.uid}
                    postId={posts.id}
                    currentUser={currentUser}
                />
            </CardContent>

            <Dialog open={imageModal} onOpenChange={setImageModal}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
                    <img
                        src={posts.postImage}
                        className="max-h-[85vh] w-auto max-w-full rounded-2xl shadow-2xl"
                        alt="Expanded post content"
                    />
                </DialogContent>
            </Dialog>
        </Card>
    );
}
