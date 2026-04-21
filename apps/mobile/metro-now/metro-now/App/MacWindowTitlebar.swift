// metro-now
// https://github.com/krystxf/metro-now

import UIKit

enum MacWindowTitlebar {
    #if targetEnvironment(macCatalyst)
        static func startObserving() {
            // Apply repeatedly for the first few seconds after launch — the NSWindow
            // isn't guaranteed to exist when the scene first activates, so a couple
            // of delayed retries handle the race.
            scheduleRetries()

            NotificationCenter.default.addObserver(
                forName: UIScene.didActivateNotification,
                object: nil,
                queue: .main
            ) { _ in
                scheduleRetries()
            }
        }

        @MainActor
        static func applyNow() {
            for scene in UIApplication.shared.connectedScenes {
                guard let windowScene = scene as? UIWindowScene else { continue }

                windowScene.title = ""

                if let titlebar = windowScene.titlebar {
                    titlebar.titleVisibility = .hidden
                    titlebar.toolbar = nil
                    titlebar.separatorStyle = .none
                }
            }

            applyNSWindowTitlebarTransparency()
        }

        private static func scheduleRetries() {
            let delays: [TimeInterval] = [0, 0.05, 0.2, 0.5, 1.0]
            for delay in delays {
                DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                    applyNow()
                }
            }
        }

        /// Reaches the underlying NSWindow on Mac Catalyst via the Objective-C
        /// runtime to enable `titlebarAppearsTransparent`. We deliberately do
        /// NOT touch `styleMask` — read-modify-write on it races with AppKit's
        /// fullscreen state during launch and triggers the
        /// "NSWindowStyleMaskFullScreen set … outside of a full screen transition"
        /// assertion.
        private static func applyNSWindowTitlebarTransparency() {
            guard let nsAppClass = NSClassFromString("NSApplication") else { return }

            let sharedSelector = NSSelectorFromString("sharedApplication")
            guard nsAppClass.responds(to: sharedSelector),
                  let sharedApp = (nsAppClass as AnyObject).perform(sharedSelector)?
                  .takeUnretainedValue() as? NSObject
            else { return }

            guard let windows = sharedApp.value(forKey: "windows") as? [NSObject],
                  !windows.isEmpty
            else { return }

            let setTransparent = NSSelectorFromString("setTitlebarAppearsTransparent:")
            let setTitle = NSSelectorFromString("setTitle:")

            for window in windows {
                if window.responds(to: setTitle) {
                    _ = window.perform(setTitle, with: "")
                }

                if window.responds(to: setTransparent) {
                    _ = window.perform(setTransparent, with: NSNumber(value: true))
                }
            }
        }
    #else
        static func startObserving() {}
        static func applyNow() {}
    #endif
}
