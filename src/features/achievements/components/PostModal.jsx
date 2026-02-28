import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from "@/components/ui";
import ReactQuill from "react-quill";
import { ImagePlus, X } from "lucide-react";
import "react-quill/dist/quill.snow.css";

const PostModal = ({
    modalOpen,
    setModalOpen,
    sendStatus,
    setStatus,
    status,
    isEdit,
    updateStatus,
    uploadPostImage,
    setPostImage,
    postImage,
    currentPost,
    setCurrentPost,
}) => {
    const [progress, setProgress] = useState(0);

    const handleClose = () => {
        setStatus("");
        setModalOpen(false);
        setPostImage("");
        setCurrentPost({});
        setProgress(0);
    };

    const customModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
            ['blockquote', 'code-block'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']                                         // remove formatting button
        ]
    };

    return (
        <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
            <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden border-0 shadow-2xl rounded-3xl">
                <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <DialogTitle className="text-xl font-black text-slate-800">
                        {isEdit ? "Edit your post" : "Create a post"}
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6">
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden mb-4">
                        <ReactQuill
                            theme="snow"
                            value={status}
                            modules={customModules}
                            placeholder="What do you want to talk about?"
                            onChange={setStatus}
                            className="border-0 bg-transparent min-h-[150px] shadow-none prose prose-slate"
                        />
                    </div>

                    {progress > 0 && progress < 100 && (
                        <div className="mb-4">
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-right text-slate-500 mt-1 font-medium">{progress}% Uploaded</p>
                        </div>
                    )}

                    {(postImage || currentPost?.postImage) && (
                        <div className="relative mb-4 rounded-2xl overflow-hidden border border-slate-200 group">
                            <img
                                className="w-full max-h-[300px] object-cover"
                                src={postImage || currentPost?.postImage}
                                alt="Post Preview"
                            />
                            <button
                                onClick={() => setPostImage("")}
                                className="absolute top-3 right-3 h-8 w-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 backdrop-blur-sm"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-4">
                        <label className="cursor-pointer h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-primary transition-colors">
                            <ImagePlus className="h-5 w-5" />
                            <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={(event) => {
                                    if (event.target.files[0]) {
                                        uploadPostImage(event.target.files[0], setPostImage, setProgress);
                                    }
                                }}
                            />
                        </label>

                        <div className="flex gap-3">
                            <Button onClick={handleClose} variant="ghost" className="rounded-xl font-bold">Cancel</Button>
                            <Button
                                onClick={isEdit ? updateStatus : sendStatus}
                                type="primary"
                                disabled={!status.trim() && !postImage && !currentPost?.postImage}
                                className="rounded-xl px-6 bg-primary hover:bg-primary/90 text-white font-bold disabled:opacity-50"
                            >
                                {isEdit ? "Update Post" : "Post"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PostModal;
