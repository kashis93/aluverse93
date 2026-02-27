
import { Button } from "@/components/ui";
import { motion } from "framer-motion";
import { Lightbulb, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { reversePitches } from "@/data/dummyData.js";

const ReversePitching = () => {
  const { requireAuth } = useAuth();

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">Reverse Pitching</h1>
        <p className="text-muted-foreground mt-1">Alumni post real-world problems. Students apply and build.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reversePitches.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all border border-border"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{p.title}</h2>
                  <p className="text-sm text-muted-foreground">{p.domain}</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-4 w-4" /> {p.applicants}
              </div>
            </div>
            <p className="text-muted-foreground mt-3 text-sm">{p.description}</p>
            <p className="text-xs text-muted-foreground mt-2">Posted by {p.postedBy}</p>
            <Button
              className="mt-4 w-full gradient-primary text-primary-foreground hover:opacity-90"
              onClick={() => requireAuth("apply")}
            >
              Apply / Submit Solution
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ReversePitching;
