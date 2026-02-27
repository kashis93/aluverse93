import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { db, storage, auth } from "@/services/firebase";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription, Avatar, AvatarImage, AvatarFallback } from "@/components/ui";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Building2, Briefcase, Award, User, Upload } from "lucide-react";

const CompleteProfile = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(user?.photoURL || null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || user?.displayName || "",
    graduationYear: user?.graduationYear || "",
    department: user?.department || "CSE",
    company: user?.company || "",
    achievement: user?.achievement || "",
    role: user?.role || "student"
  });

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async () => {
    if (!photoFile || !user) return null;

    try {
      setUploading(true);
      const storageRef = ref(storage, `profile-photos/${user.uid}/${Date.now()}-${photoFile.name}`);
      console.info("Starting upload to:", storageRef.fullPath);
      // include contentType metadata to ensure proper handling and correct download URLs
      // Guard upload and download with timeouts to avoid hanging indefinitely
      const withTimeout = (p, ms, label) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        p.then((v) => { clearTimeout(timer); resolve(v); }).catch((err) => { clearTimeout(timer); reject(err); });
      });

      const uploadPromise = uploadBytes(storageRef, photoFile, { contentType: photoFile.type });
      const uploadResult = await withTimeout(uploadPromise, 30000, 'uploadBytes');
      console.info("Upload result:", uploadResult?.metadata?.fullPath || uploadResult);

      const downloadPromise = getDownloadURL(storageRef);
      const downloadURL = await withTimeout(downloadPromise, 15000, 'getDownloadURL');
      console.info("Download URL:", downloadURL);
      return downloadURL;
    } catch (error) {
      console.error("Photo upload error:", error?.code || error?.message || error);
      toast.error("Failed to upload photo");
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!formData.graduationYear) {
      toast.error("Please enter your graduation year");
      return;
    }

    if (formData.role === "alumni" && !formData.company.trim()) {
      toast.error("Please enter your company");
      return;
    }

    if (formData.role === "alumni" && !formData.achievement.trim()) {
      toast.error("Please enter your achievement");
      return;
    }

    setLoading(true);
    try {
      let photoURL = user.photoURL || "";
      
      if (photoFile) {
        try {
          photoURL = await uploadPhoto();
        } catch (photoError) {
          console.warn("Photo upload failed, continuing without photo", photoError);
          toast.warning("Photo upload failed, but profile will be updated");
        }
      }

      const userRef = doc(db, "users", user.uid);
      const updateData = {
        name: formData.name,
        graduationYear: parseInt(formData.graduationYear),
        department: formData.department,
        company: formData.company,
        achievement: formData.achievement,
        role: formData.role,
        photoURL,
        updatedAt: new Date()
      };

      try {
        await updateDoc(userRef, updateData);
      } catch (updateError) {
        console.warn("updateDoc failed, trying setDoc:", updateError?.code || updateError?.message || updateError);
        // If the document doesn't exist, set it instead
        await setDoc(userRef, { uid: user.uid, email: user.email, createdAt: new Date(), ...updateData }, { merge: true });
      }

      // Update the Firebase Auth profile photoURL so onAuthStateChanged picks it up
      try {
        if (photoURL && auth?.currentUser) {
          await updateAuthProfile(auth.currentUser, { photoURL });
          console.info("Auth profile photoURL updated");
        }
      } catch (authProfileError) {
        console.warn("Failed to update auth profile:", authProfileError?.code || authProfileError?.message || authProfileError);
      }
      // Refresh cached user data in context so the app reflects changes immediately
      try {
        await refreshUser(user.uid);
      } catch (e) {
        console.warn("refreshUser failed after profile update", e);
      }

      toast.success("Profile updated! Welcome aboard.");
      // Navigate after refreshUser completes. Avoid forcing a full reload which can cause
      // onAuthStateChanged and Firestore reads to race and re-show the complete-profile page.
      try {
        await refreshUser(user.uid);
      } catch (e) {
        console.warn("refreshUser failed before final navigate", e);
      }
      navigate("/");
    } catch (error) {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-lg mx-auto px-4 py-20 min-h-screen">
      <Card className="shadow-2xl border-slate-200 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-slate-50 border-b p-8 text-center">
          <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>We need a few more details to get you started.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2"><User className="h-4 w-4" /> Full Name</Label>
              <Input
                id="name"
                placeholder="e.g. Priya Sharma"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2"><Upload className="h-4 w-4" /> Profile Photo (Optional)</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-primary/20">
                  <AvatarImage src={photoPreview} />
                  <AvatarFallback><User className="h-10 w-10 text-slate-400" /></AvatarFallback>
                </Avatar>
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full cursor-pointer"
                    onClick={(e) => e.currentTarget.previousElementSibling.click()}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : photoFile ? "Change Photo" : "Choose Photo"}
                  </Button>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">Max 5MB. JPG, PNG supported.</p>
            </div>

            <div className="space-y-2">
              <Label>I am a...</Label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full h-11 px-4 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="student">Student</option>
                <option value="alumni">Alumni</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year" className="flex items-center gap-2"><CalendarCheck className="h-4 w-4" /> Graduation Batch</Label>
                <Input
                  id="year"
                  type="number"
                  placeholder="e.g. 2024"
                  required
                  value={formData.graduationYear}
                  onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept" className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Department</Label>
                <select
                  id="dept"
                  className="w-full h-10 px-3 border rounded-md text-sm"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                >
                  {["CSE", "IT", "ECE", "ME", "Civil", "EE", "Chemical", "Plastic", "Environmental"].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {formData.role === "alumni" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="company" className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Current Company / Organization</Label>
                  <Input
                    id="company"
                    placeholder="e.g. Google / Self-Employed"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="achievement" className="flex items-center gap-2"><Award className="h-4 w-4" /> Main Achievement</Label>
                  <textarea
                    id="achievement"
                    className="w-full min-h-[100px] p-4 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. Won Smart India Hackathon / 10+ years experience in Fintech..."
                    required
                    value={formData.achievement}
                    onChange={(e) => setFormData({ ...formData, achievement: e.target.value })}
                  />
                </div>
              </>
            )}

            <Button type="submit" disabled={loading} className="w-full gradient-primary py-6 rounded-xl font-bold text-lg">
              {loading ? "Saving..." : "Start Exploring"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// Simple CalendarCheck icon placeholder
const CalendarCheck = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="m9 16 2 2 4-4" /></svg>
);

export default CompleteProfile;
