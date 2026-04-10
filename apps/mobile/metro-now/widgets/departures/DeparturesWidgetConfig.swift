// metro-now
// https://github.com/krystxf/metro-now

import AppIntents
import WidgetKit

struct MetroStationAppEntity: AppEntity {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Metro Station")
    static var defaultQuery = MetroStationQuery()

    var id: String

    var name: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

struct MetroStationQuery: EntityStringQuery {
    func entities(for identifiers: [String]) async throws -> [MetroStationAppEntity] {
        let stops = await DeparturesWidgetManager.fetchMetroStops() ?? []
        return stops
            .filter { identifiers.contains($0.id) }
            .map { MetroStationAppEntity(id: $0.id, name: $0.name) }
    }

    func entities(matching string: String) async throws -> [MetroStationAppEntity] {
        let all = try await suggestedEntities()
        guard !string.isEmpty else { return all }
        return all.filter { $0.name.localizedCaseInsensitiveContains(string) }
    }

    func suggestedEntities() async throws -> [MetroStationAppEntity] {
        let stops = await DeparturesWidgetManager.fetchMetroStops() ?? []
        return stops
            .sorted { $0.name < $1.name }
            .map { MetroStationAppEntity(id: $0.id, name: $0.name) }
    }
}

struct DeparturesWidgetConfigIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Metro Departures"
    static var description = IntentDescription("Show departures from a metro station. Leave station empty to use your nearest station.")

    @Parameter(title: "Station")
    var station: MetroStationAppEntity?
}
