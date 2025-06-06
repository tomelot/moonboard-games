# 🧗‍♂️ MoonBoard Games App

An interactive Android application designed to bring classic games like Snake to the MoonBoard LED climbing wall, transforming your training sessions into engaging gaming experiences.

---

## 🌕 What is a MoonBoard?

The MoonBoard is a standardized, interactive climbing wall that connects a global community of climbers through shared problems and competitive performance rankings.
Each MoonBoard is built with identical specifications, including a grid of holds and an LED system, allowing climbers worldwide to train on the same problems.
([moonclimbing.com](https://moonclimbing.com/what-is-moonboard?utm_source=chatgpt.com))

---

## 🔍 Reverse Engineering the MoonBoard Protocol

To integrate gaming functionalities, we reverse-engineered the MoonBoard's BLE (Bluetooth Low Energy) communication protocol. The protocol structure is as follows:

- **Header**: `l#`
- **Pixel Commands**: A sequence of color-coded pixel updates
- **End Marker**: `#`

Each pixel command includes:

- **Color Identifier**:
  - `S` = Green
  - `P` = Blue
  - `E` = Red
- **Pixel Index**: A number between 0 and 197 indicating the pixel’s position

The LED grid is an 11-column by 18-row matrix (198 pixels total), with a zigzag indexing pattern:

- Pixel 0 is at the bottom-left corner.
- Indexing alternates direction column by column.

---

## 📱 App Features

- **Game Selection**: Browse and select games like Snake.
- **Live Control**: Manage gameplay directly from the app.
- **Board Display**: Visual feedback rendered on the MoonBoard screen via BLE.
- **Export Options**: Share game data with others.

---

## 🛠️ Building the App

To build the app for Android:

### Using EAS Build

Ensure you have EAS CLI installed and configured. Then run:

```bash
eas build --profile production --platform android
```

This command creates a production-ready `.aab` file suitable for distribution on the Google Play Store.
([docs.expo.dev](https://docs.expo.dev/tutorial/eas/android-production-build/?utm_source=chatgpt.com))

### Using Expo CLI for Development

For development purposes, you can run the app on an Android device or emulator:

```bash
npx expo run:android
```

This command builds and installs the app directly onto your connected Android device or emulator.
([stackoverflow.com](https://stackoverflow.com/questions/77515577/expo-how-to-create-a-development-build-for-android-and-how-to-create-a-apk-file?utm_source=chatgpt.com))

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.
