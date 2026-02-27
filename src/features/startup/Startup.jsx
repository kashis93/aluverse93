import { Button } from "@/components/ui";
import { motion } from "framer-motion";
import startupsData from "@/data/startupsData.json";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Rocket, Users, ShieldCheck, ExternalLink } from "lucide-react";

const Startup = () => {
  const { requireAuth } = useAuth();

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Startup Hub</h1>
        <p className="text-muted-foreground mt-2 text-lg">Celebrating DIPP registered ventures from the LDCE ecosystem</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {startupsData.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group relative bg-card rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all border border-border overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 transition-all group-hover:bg-primary/10" />

            <div className="relative flex flex-col md:flex-row gap-6">
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Rocket className="h-8 w-8 md:h-10 md:w-10 text-primary" />
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-gray-900">{s.name}</h2>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">DIPP: {s.dippNumber}</span>
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed">{s.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold mb-1 tracking-widest">Founder</p>
                    <p className="font-semibold text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      {s.founder}
                    </p>
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="w-full py-6 rounded-xl gradient-primary text-primary-foreground shadow-lg shadow-primary/20 gap-2"
                      onClick={() => {
                        window.location.href = `mailto:secretary@ldcealumni.net?subject=Inquiry regarding ${s.name}`;
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Connect to Venture
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Startup;
