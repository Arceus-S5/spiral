/**
 * electron-builder 設定
 * @type {import('electron-builder').Configuration}
 */
module.exports = {
  appId: "com.spiral.browser",
  productName: "Spiral",
  copyright: "Copyright © 2024",
  
  directories: {
    buildResources: "public",
    output: "release"
  },
  
  files: [
    "dist/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  extraResources: [
    {
      from: "extensions",
      to: "extensions",
      filter: ["**/*"]
    }
  ],
  
  // macOS設定
  mac: {
    category: "public.app-category.productivity",
    target: [
      { target: "dmg", arch: ["x64", "arm64"] },  // Intel + Apple Silicon
      { target: "zip", arch: ["x64", "arm64"] }
    ],
    icon: "public/icon.icns",
    darkModeSupport: true,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    // entitlements: "build/entitlements.mac.plist",
    // entitlementsInherit: "build/entitlements.mac.plist",
    extendInfo: {
      NSCameraUsageDescription: "Camera access for video calls",
      NSMicrophoneUsageDescription: "Microphone access for video calls",
      NSLocationWhenInUseUsageDescription: "Location for maps and local services"
    }
  },
  
  dmg: {
    title: "Spiral ${version}",
    window: { width: 540, height: 380 },
    contents: [
      { x: 130, y: 220 },
      { x: 410, y: 220, type: "link", path: "/Applications" }
    ]
  },
  
  // 自動アップデート設定 (オプション)
  // publish: {
  //   provider: "github",
  //   owner: "your-github-user",
  //   repo: "arc-browser"
  // }
}
