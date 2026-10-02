# Saroj Classes – Android app

Admin app for tuition classes: enroll students, track monthly fees, record test marks and homework, and send reminders to parents on WhatsApp. All data stays on the admin's phone (PIN-protected, with backup/restore).

## Get the APK (easiest – no Android Studio needed)
1. Create a free GitHub account and a new repository.
2. Upload all files of this folder (keep the `.github` folder).
3. Open the **Actions** tab → **Build Android APK** → **Run workflow**.
4. After ~5 minutes download `saroj-classes-apk` → unzip → `app-debug.apk`.
5. Copy it to the phone, open it, allow "Install unknown apps", install.

## Build on your own computer instead
Needs Node 20+, JDK 17, Android Studio (SDK).

    npm install
    npx cap add android
    npx cap sync android
    cd android && ./gradlew assembleDebug

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Try quickly in a browser
    npm run serve      # then open http://localhost:8080 on a phone-size window

## How reminders work
- **Fees**: a reminder appears when a month's fee is unpaid past its due day, and repeats every 7 days until paid.
- **Test marks**: one reminder per test entry.
- **Homework**: one reminder per student of that class.
- Open the **Reminders** tab, tap **Send to Father/Mother** – WhatsApp opens with the message ready; one tap sends it.
- A daily 6 PM phone notification reminds you to send pending messages.

Fully automatic sending (no tap) needs the paid WhatsApp Business API or an SMS gateway and a small server; this can be added later.
