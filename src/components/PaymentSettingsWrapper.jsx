import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import PaymentSettings from "./PaymentSettings";

const PaymentSettingsWrapper = () => {
  const { user } = useAuth();
  const { updateLogs } = useData();

  const handleSettingsSaved = (config) => {
    // Callback when settings are saved
    console.log("Payment settings updated:", config);
  };

  return (
    <PaymentSettings
      userId={user?.uid}
      user={user}
      onSettingsSaved={handleSettingsSaved}
    />
  );
};

export default PaymentSettingsWrapper;
