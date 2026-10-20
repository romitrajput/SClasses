# MyTution – Android app

Admin app for tuition classes: enroll students, track monthly fees, and send reminders to parents on WhatsApp. All data stays on the admin's phone (PIN-protected, with backup/restore).

## Features
- Register students: name, school, standard, parents' phone numbers (father and mother), monthly fee (in Rs), joining date and fee due date
- **Fee tracker**, month by month: once a due date has passed, a reminder shows on Home and one tap sends it to the father or mother on WhatsApp, signed with the teacher's name
- **Professional PDF receipt** (Rs symbol, amount in words, teacher's signature) shared to parents along with the fees-paid message
- Month-wise fee view with paid / pending students and a shareable PDF report
- Greeting by the teacher's name; PIN lock with forgot-PIN reset; eye button hides fee amounts; backup/restore
- Attendance is hidden by default; switch it on in Settings (gear icon) when needed

## Get the APK (easiest – no Android Studio needed)
1. Create a free GitHub account and a new repository.
2. Upload all files of this folder (keep the `.github` folder).
3. Open the **Actions** tab → **Build Android APK** → **Run workflow**.
4. After ~5 minutes the file **MyTution.apk** is ready. Easiest: open the repo's **Releases** (right side of the repo page) → **MyTution (latest build)** → tap **MyTution.apk**. Or open the finished run → Artifacts → `MyTution-apk`.
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
- A fee reminder appears on **Home** once a month's due date has passed and stays until the fee is paid (it re-appears after the "remind again" days in Settings).
- Tap **Send to Father/Mother**: WhatsApp opens with the message ready; one tap sends it.
- After **Record payment**, the receipt screen offers the PDF + message share, or a message-only chat with each parent.
- A daily 6 PM notification reminds you to check pending reminders.
