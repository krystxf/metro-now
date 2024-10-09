import MapKit
import SwiftUI

struct DetailedMapView: UIViewControllerRepresentable {
    typealias ViewController = UIViewController

    var location: CLLocation
    var distance: Double = 1000
    var pitch: Double = 0
    var heading: Double = 0

    class Controller: ViewController {
        var mapView: MKMapView {
            guard let tempView = view as? MKMapView else {
                fatalError("View could not be cast as MapView.")
            }
            tempView.mapType = .hybridFlyover
            return tempView
        }

        override func loadView() {
            let mapView = MKMapView()
            view = mapView

            let configuration = MKStandardMapConfiguration(elevationStyle: .realistic, emphasisStyle: .default)
            configuration.pointOfInterestFilter = .some(MKPointOfInterestFilter(including: [.publicTransport]))
            configuration.showsTraffic = false

            mapView.preferredConfiguration = configuration
            mapView.isZoomEnabled = false
            mapView.isPitchEnabled = false
            mapView.isScrollEnabled = false
            mapView.isRotateEnabled = false
            mapView.showsCompass = false
        }
    }

    func makeUIViewController(context _: Context) -> Controller {
        Controller()
    }

    func updateUIViewController(_ controller: Controller, context _: Context) {
        update(controller: controller)
    }

    func update(controller: Controller) {
        controller.additionalSafeAreaInsets.top = 20
        controller.mapView.camera = MKMapCamera(
            lookingAtCenter: location.coordinate,
            fromDistance: distance,
            pitch: pitch,
            heading: heading
        )
    }
}

struct DetailedMapView_Previews: PreviewProvider {
    static var previews: some View {
        DetailedMapView(location: CLLocation(latitude: 37.335_690, longitude: -122.013_330))
    }
}
