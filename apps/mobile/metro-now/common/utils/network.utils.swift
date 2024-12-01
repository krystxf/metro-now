// metro-now
// https://github.com/krystxf/metro-now

import Alamofire

func fetchData<T: Decodable>(_ req: DataRequest, ofType _: T.Type) async throws -> T {
    try await withCheckedThrowingContinuation { continuation in
        req.responseDecodable(of: T.self) { response in
            switch response.result {
            case let .success(data):
                continuation.resume(returning: data)
            case let .failure(error):
                continuation.resume(throwing: error)
            }
        }
    }
}
