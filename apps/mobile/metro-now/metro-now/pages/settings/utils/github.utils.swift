// metro-now
// https://github.com/krystxf/metro-now

import Foundation

enum GithubIssueTemplate: String {
    case bug_report
    case feature_request
}

func getGithubIssueUrl(template: GithubIssueTemplate, title: String = "") -> URL? {
    let url = URL(string: "\(GITHUB_URL)/issues/new")

    guard let url else {
        return nil
    }

    let urlWithQueryParams = url.appending(queryItems: [
        URLQueryItem(name: "assignees", value: nil),
        URLQueryItem(name: "labels", value: nil),
        URLQueryItem(name: "projects", value: nil),
        URLQueryItem(name: "template", value: "\(template.rawValue).md"),
        URLQueryItem(name: "title", value: title),
    ])

    return urlWithQueryParams
}
