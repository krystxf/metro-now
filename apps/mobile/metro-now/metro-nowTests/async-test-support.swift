import Foundation
import Testing

@MainActor
func eventually(
    timeout: Duration = .seconds(1),
    pollInterval: Duration = .milliseconds(10),
    _ condition: @escaping @MainActor () -> Bool
) async {
    let clock = ContinuousClock()
    let deadline = clock.now + timeout

    while clock.now < deadline {
        if condition() {
            return
        }

        await Task.yield()
        try? await Task.sleep(for: pollInterval)
    }

    #expect(condition())
}
