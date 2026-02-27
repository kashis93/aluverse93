
import { useState, useEffect } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, Input, Textarea } from "@/components/ui";
import { motion } from "framer-motion";
import { MessageCircle as MsgIcon, ThumbsUp as LikeIcon, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { qna as dummyQna } from "@/data/dummyData.js";
import { addQuestion } from "@/services/dataService";
import { db } from "@/services/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { toast } from "sonner";

const QnA = () => {
  const { user, requireAuth } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "qna"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const qData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuestions(qData.length > 0 ? qData : dummyQna);
    }, (error) => {
      console.error("Firestore error:", error);
      setQuestions(dummyQna);
    });
    return () => unsubscribe();
  }, []);

  const handleAsk = () => {
    if (!requireAuth("ask")) return;
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim() || !user) return;

    setLoading(true);
    const result = await addQuestion(newQuestion, user);
    setLoading(false);

    if (result.success) {
      setNewQuestion("");
      setIsDialogOpen(false);
      toast.success("Question posted successfully!");
    } else {
      toast.error("Failed to post question: " + result.error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">Startup Hub · Q&A</h1>
        <p className="text-muted-foreground mt-1">Ask questions and get answers from alumni</p>
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={handleAsk} className="gradient-primary text-primary-foreground hover:opacity-90">
          Ask a Question
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ask a Question</DialogTitle>
            <DialogDescription>
              Get insights from our alumni community. Be specific to get better answers.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="What's on your mind?"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              className="min-h-[120px]"
              required
            />
            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Posting..." : "Post Question"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {questions.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all border border-border"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{item.question}</h2>
                <p className="text-sm text-muted-foreground mt-1">Asked by {item.askedBy}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MsgIcon className="h-4 w-4" />
                <span>{item.answers?.length || 0} answers</span>
              </div>
            </div>
            {item.answers && item.answers.length > 0 && (
              <div className="mt-3 space-y-2">
                {item.answers.slice(0, 2).map((ans) => (
                  <div key={ans.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{ans.author}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <LikeIcon className="h-3 w-3" /> {ans.votes}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{ans.content}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-3">
              <Button variant="outline" onClick={() => requireAuth("answer")}>
                Answer
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default QnA;
