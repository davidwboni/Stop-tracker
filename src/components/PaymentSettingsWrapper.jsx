import React from "react";
import { useAuth } from "../contexts/AuthContext";
import PaymentSettings from "./PaymentSettings";

const PaymentSettingsWrapper = () => {
  const { user } = useAuth();

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
