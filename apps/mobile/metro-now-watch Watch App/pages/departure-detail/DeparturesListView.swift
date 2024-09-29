import SwiftUI

struct DeparturesListView: View {
    let platformID: String

    var body: some View {
        NavigationView {
            List {
                Text("A List Item")
                Text("A Second List Item")
                Text("A Third List Item")
                Text("A List Item")
                Text("A Second List Item")
                Text("A Third List Item")
            }
        }

        .containerBackground(
            .red.gradient,
            for: .tabView
        )
    }
}
