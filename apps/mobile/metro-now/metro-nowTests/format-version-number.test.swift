// metro-now
// https://github.com/krystxf/metro-now

@testable import metro_now
import Testing

@Suite(.tags(.utils))
struct FormatVersionNumberTests {
    @Test("formats version and build as version(build)")
    func formatsVersionAndBuild() {
        #expect(formatVersionNumber(version: "1.2.3", build: "42") == "1.2.3(42)")
    }

    @Test("omits the build suffix when only the version is present")
    func omitsBuildWhenNil() {
        #expect(formatVersionNumber(version: "1.2.3", build: nil) == "1.2.3")
    }

    @Test("shows just the build in parentheses when version is missing")
    func showsBuildOnlyWhenVersionNil() {
        // This path matters during internal builds where Info.plist may omit
        // CFBundleShortVersionString while still producing a dated CFBundleVersion.
        #expect(formatVersionNumber(version: nil, build: "42") == "(42)")
    }

    @Test("falls back to the unknown-version literal when both are missing")
    func fallbackWhenBothNil() {
        // Locking in the current user-visible text verbatim (typo included)
        // so a future rename is an explicit, reviewed behaviour change
        // rather than an accidental regression.
        #expect(formatVersionNumber(version: nil, build: nil) == "uknknown version")
    }

    @Test("preserves semver with pre-release identifiers")
    func preservesSemverPreReleaseIdentifiers() {
        #expect(
            formatVersionNumber(version: "2.0.0-beta.1", build: "100")
                == "2.0.0-beta.1(100)"
        )
    }
}
