# Building Release AAB for Google Play

## Option 1: Using Android Studio GUI (Easiest)

### Step 1: Create Keystore

1. In Android Studio, go to **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle** → Click **Next**
3. Click **Create new...** under Key store path
4. Fill in the form:
   - **Key store path**: Browse and save as `stop-tracker-release.keystore` in the `/android` folder
   - **Password**: `StopTracker2026!SecureKey#`
   - **Confirm**: `StopTracker2026!SecureKey#`
   - **Alias**: `stop-tracker`
   - **Key password**: `StopTracker2026!SecureKey#`
   - **Validity**: 25 years (or maximum allowed)
   - **Certificate**:
     - First and Last Name: David Boni
     - Organizational Unit: Development
     - Organization: Stop Tracker
     - City: Crawley
     - State: West Sussex
     - Country Code: GB
5. Click **OK** → Click **Next**
6. Select **release** build variant
7. Check both signature versions (V1 and V2)
8. Click **Finish**

The AAB will be created in: `android/app/release/app-release.aab`

### Step 2: Test First (Important!)

Before building the release, test your app:

1. In Android Studio toolbar, click the **Device Manager** icon
2. Create a new **Virtual Device** (if you don't have one):
   - Click **Create Device**
   - Choose **Pixel 6** or similar
   - Select **API 34** (Android 14) or latest
   - Click **Finish**
3. Click the **Run** button (green play icon) or press **Shift+F10**
4. Test all features:
   - Route Planner with location permission
   - Invoice generation and sharing
   - Dark mode toggle
   - Navigation through all tabs

## Option 2: Using Gradle Command Line

### Step 1: Create key.properties

Create a file `android/key.properties` with:

```properties
storePassword=StopTracker2026!SecureKey#
keyPassword=StopTracker2026!SecureKey#
keyAlias=stop-tracker
storeFile=stop-tracker-release.keystore
```

### Step 2: Build

```bash
cd android
./gradlew bundleRelease
```

The AAB will be in: `android/app/build/outputs/bundle/release/app-release.aab`

## Troubleshooting

### "Keystore not found"
- Make sure the keystore file is in the `/android` folder
- Check the path in Android Studio or key.properties

### "Wrong password"
- Password: `StopTracker2026!SecureKey#`
- See KEYSTORE_CREDENTIALS.txt for all details

### "Build failed"
- Run `./gradlew clean` first
- Then try building again
- Check Android Studio's "Build" tab for error details

## What's Next?

After building the AAB:
1. Go to Google Play Console: https://play.google.com/console
2. Create a new app
3. Upload your AAB file
4. Complete store listing (see GOOGLE_PLAY_CHECKLIST.md)
