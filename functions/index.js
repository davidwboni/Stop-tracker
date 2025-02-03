const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.assignRoleOnSignup = functions.auth.user().onCreate(async (user) => {
  try {
    const userRef = admin.firestore().collection("users").doc(user.uid);
    await userRef.set({
      email: user.email || "No email provided",
      name: user.displayName || "Anonymous",
      role: "free", // Default role
    });
    console.log(`User ${user.uid} assigned default role: free`);
  } catch (error) {
    console.error(`Error assigning role for user ${user.uid}:`, error);
  }
});
