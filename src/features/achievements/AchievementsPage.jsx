import React, { useState, useEffect } from "react";
import CreatePost from "./components/CreatePost";
import { getStatus } from "@/services/postsAPI";
import { useAuth } from "@/contexts/AuthContext";

export default function AchievementsPage() {
    const { user } = useAuth();
    const [allStatuses, setAllStatuses] = useState([]);

    useEffect(() => {
        const unsubscribe = getStatus(setAllStatuses);
        return () => unsubscribe();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 py-10">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900">Alumni Achievements & Activity</h1>
                    <p className="text-slate-600 mt-2">Share your milestones, insights, and updates with the community.</p>
                </div>

                <CreatePost currentUser={user} allStatuses={allStatuses} />
            </div>
        </div>
    );
}
