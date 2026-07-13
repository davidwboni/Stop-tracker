import React from "react";
import { motion } from "framer-motion";
import WeeklyStats from "./WeeklyStats";
import TabCoach from "./TabCoach";
import { useData } from "../contexts/DataContext";
import { TrendingUp } from "lucide-react";

const StatsPage = () => {
  const { logs } = useData();

  return (
    <motion.div
      className="max-w-4xl mx-auto pb-safe px-4 py-6 overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 120px)' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <TabCoach
        id="stats"
        title="Weekly stats"
        body="Your week at a glance. Tap Total Stops to jump to those entries, and use the arrows to step back through previous weeks."
      />

      {/* Header — compact single line so the week's data sits higher */}
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Weekly Stats</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track your delivery performance week by week
        </p>
      </div>

      {/* Weekly Stats Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <WeeklyStats logs={logs} />
      </motion.div>
    </motion.div>
  );
};

export default StatsPage;
