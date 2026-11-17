import Foundation
@testable import metro_now
import Testing

@Suite(.tags(.api))
@MainActor
struct InfotextsViewModelTests {
    private func makeInfotext(
        id: String,
        text: String,
        priority: String = "NORMAL",
        relatedStops: [String] = []
    ) -> ApiInfotext {
        ApiInfotext(
            id: id,
            text: text,
            textEn: nil,
            priority: priority,
            displayType: "banner",
            validFrom: nil,
            validTo: nil,
            relatedStops: relatedStops.map(ApiInfotextRelatedStop.init)
        )
    }

    @Test("severity and related stop helpers map infotext metadata")
    func infotextMetadataHelpers() {
        let infotext = makeInfotext(
            id: "1",
            text: "Escalator outage",
            priority: "HIGH",
            relatedStops: ["Můstek", "Můstek", "", "Muzeum"]
        )

        #expect(infotext.severity == .high)
        #expect(infotext.severity.title == "Critical")
        #expect(infotext.relatedStopNames == ["Můstek", "Muzeum"])
    }

    @Test("uses fresh cache immediately and refreshes from the network")
    func usesFreshCacheAndRefreshes() async {
        let cached = makeInfotext(id: "cached", text: "Cached")
        let refreshed = makeInfotext(id: "fresh", text: "Fresh")
        var saved: [ApiInfotext]?
        let viewModel = InfotextsViewModel(
            fetchInfotexts: { [refreshed] },
            loadCachedInfotexts: { [cached] },
            loadStaleCachedInfotexts: { nil },
            saveCachedInfotexts: { saved = $0 }
        )

        #expect(viewModel.infotexts.first?.id == cached.id)
        #expect(viewModel.isLoading == false)

        await eventually {
            viewModel.infotexts.first?.id == refreshed.id && viewModel.isLoading == false
        }

        #expect(saved?.first?.id == refreshed.id)
    }

    @Test("keeps stale cache visible when refresh fails")
    func keepsStaleCacheOnFailure() async {
        struct FetchFailure: Error {}
        let stale = makeInfotext(id: "stale", text: "Stale")
        let viewModel = InfotextsViewModel(
            fetchInfotexts: { throw FetchFailure() },
            loadCachedInfotexts: { nil },
            loadStaleCachedInfotexts: { [stale] },
            saveCachedInfotexts: { _ in Issue.record("save should not be called on failure") }
        )

        #expect(viewModel.infotexts.first?.id == stale.id)
        #expect(viewModel.isLoading == true)

        await eventually {
            viewModel.infotexts.first?.id == stale.id && viewModel.isLoading == false
        }
    }

    @Test("shows fetched infotexts when there is no cache")
    func showsFetchedInfotextsWithoutCache() async {
        let fetched = makeInfotext(id: "fetched", text: "Fetched")
        let viewModel = InfotextsViewModel(
            fetchInfotexts: { [fetched] },
            loadCachedInfotexts: { nil },
            loadStaleCachedInfotexts: { nil },
            saveCachedInfotexts: { _ in }
        )

        await eventually {
            viewModel.infotexts.first?.id == fetched.id && viewModel.isLoading == false
        }
    }
}
