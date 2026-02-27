
import { useState, useEffect } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, Label, Input, Textarea } from "@/components/ui";
import { motion } from "framer-motion";
import { blogs as dummyBlogs } from "@/data/dummyData.js";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Heart, MessageCircle, PenTool } from "lucide-react";
import { addBlog } from "@/services/dataService";
import { db } from "@/services/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { toast } from "sonner";

const Blogs = () => {
  const { user, requireAuth } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [blogList, setBlogList] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    tags: "",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600"
  });

  useEffect(() => {
    const q = query(collection(db, "blogs"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBlogList(data.length > 0 ? data : dummyBlogs);
    }, (error) => {
      console.error("Firestore error:", error);
      setBlogList(dummyBlogs);
    });
    return () => unsubscribe();
  }, []);

  const handleWrite = () => {
    if (!requireAuth("blog")) return;
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const tagsArray = formData.tags.split(",").map(t => t.trim()).filter(t => t);
    const result = await addBlog({ ...formData, tags: tagsArray, readTime: "5 min", date: new Date().toISOString().split('T')[0] }, user);
    setLoading(false);

    if (result.success) {
      setIsDialogOpen(false);
      setFormData({
        title: "",
        excerpt: "",
        tags: "",
        image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600"
      });
      toast.success("Blog post published!");
    } else {
      toast.error("Failed to publish: " + result.error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Blogs</h1>
          <p className="text-muted-foreground mt-1">Stories, tips, and insights from our alumni community</p>
        </div>
        <Button onClick={handleWrite} className="gradient-primary text-primary-foreground gap-2">
          <PenTool className="h-4 w-4" /> Write a Blog
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Write a Blog Post</DialogTitle>
            <DialogDescription>
              Share your experiences and insights with the community.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. How I landed my first job" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt / Summary</Label>
              <Textarea id="excerpt" required value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} placeholder="Short summary of your blog post..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input id="tags" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="Career, Tech, Interview" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full gradient-primary">
                {loading ? "Publishing..." : "Publish Blog"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogList.map((blog, i) => (
          <motion.div
            key={blog.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all group"
          >
            <div className="h-48 overflow-hidden">
              <img src={blog.image} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
            <div className="p-5">
              <div className="flex gap-2">
                {blog.tags.map((t) => (
                  <span key={t} className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
              <h2 className="font-bold text-lg mt-2 line-clamp-2">{blog.title}</h2>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{blog.excerpt}</p>
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{blog.author}</span>
                  <br />
                  {blog.authorRole} · {blog.readTime}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => requireAuth("like")}>
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => requireAuth("comment")}>
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Blogs;
