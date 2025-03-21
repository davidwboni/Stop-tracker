const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.assignRoleOnSignup = functions.auth.user().onCreate(async (user) => {
  const userRef = admin.firestore().collection("users").doc(user.uid);

  try {
    // Assign default role
    await userRef.set({
      email: user.email,
      name: user.displayName || "Anonymous",
      role: "free", // Default role
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log success
  } catch (error) {
    console.error(`Error assigning role to user ${user.uid}:`, error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to assign user role."
    );
  }
});
