import React from "react";
import { motion } from "framer-motion";
import WeeklyStats from "./WeeklyStats";
import { useData } from "../contexts/DataContext";
import { TrendingUp } from "lucide-react";

const StatsPage = () => {
  const { logs } = useData();

  return (
    <motion.div
      className="max-w-4xl mx-auto pb-safe px-4 py-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Weekly Statistics</h1>
        </div>
        <p className="text-muted-foreground">
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
