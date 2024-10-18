import SwiftUI

struct StationDeparturesView: View {
    var label: String
    
    var body: some View {
        NavigationStack {
            ScrollView {
                ForEach(0 ..< 2) { _ in
                    NavigationLink(value: 2) {
                        HStack {
                            VStack(alignment: .leading) {
                                Text("Háje")
                                Text("Also to Kačerov").font(.system(size: 12))
                            }
                            Spacer()
                            Text("20s")
                        }
                    }
                    .buttonStyle(.plain)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .padding(.horizontal, 12)
                    .background(.red)
                    .clipShape(.rect(cornerRadius: 12))
                }
            }
            .navigationTitle(label)
            .navigationDestination(for: Int.self) { _ in
                StationDepartureDetailView()
            }
        }
    }
}
