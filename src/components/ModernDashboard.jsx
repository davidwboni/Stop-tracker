import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Plus, TrendingUp, FileCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import Ads from "./Ads";

const DashboardCard = ({ title, value, subtitle, icon: Icon, color }) => (
  <motion.div
    whileHover={{
      y: -2,
      scale: 1.02,
      boxShadow: "0 12px 24px rgba(0, 0, 0, 0.2)",
    }}
    className="bg-gradient-to-r from-[var(--background)] to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-md"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
        <h3 className={`text-3xl font-extrabold mt-1 text-[var(--text)]`}>{value}</h3>
        {subtitle && (
          <p className="text-sm text-[var(--text-muted)] mt-2">{subtitle}</p>
        )}
      </div>
      <div
        className={`p-3 bg-[var(--accent)] dark:bg-[var(--secondary)] rounded-full`}
      >
        <Icon size={28} className="text-[var(--text)]" />
      </div>
    </div>
  </motion.div>
);

const ModernDashboard = ({ userId }) => {
  const [role, setRole] = useState("loading");
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setRole(userSnap.data().role);
        } else {
          setRole("free");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole("free");
      } finally {
        setLoading(false);
      }
    };

    // Mock weekly data fetching
    setTimeout(() => {
      setWeeklyData([
        { day: "Mon", stops: 125, target: 120 },
        { day: "Tue", stops: 145, target: 120 },
        { day: "Wed", stops: 132, target: 120 },
        { day: "Thu", stops: 148, target: 120 },
        { day: "Fri", stops: 138, target: 120 },
      ]);
    }, 1000);

    fetchUserRole();
  }, [userId]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-[var(--background)] to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {role === "free" && <Ads />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          title="Today's Stops"
          value="138"
          subtitle="+15% vs target"
          icon={Plus}
          color="text-emerald-600 dark:text-emerald-400"
        />
        <DashboardCard
          title="Weekly Average"
          value="142"
          subtitle="Last 7 days"
          icon={TrendingUp}
          color="text-purple-600 dark:text-purple-400"
        />
        <DashboardCard
          title="Invoice Match"
          value="98.5%"
          subtitle="Current month"
          icon={FileCheck}
          color="text-blue-600 dark:text-blue-400"
        />
      </div>

      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6">
          <TabsTrigger value="weekly">Weekly Performance</TabsTrigger>
          <TabsTrigger value="comparison">Invoice Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Bar
                      dataKey="stops"
                      fill="var(--primary)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="var(--secondary)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={weeklyData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="stops"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={{ fill: "var(--primary)", strokeWidth: 2 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModernDashboard;