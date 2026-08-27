import FirebaseCore
import Foundation
import GoogleSignIn

enum FirebaseBootstrap {
    /// iOS app registered in the same Firebase project as the web client.
    /// The iOS SDK rejects web `GOOGLE_APP_ID`s (`:web:`) — that abort is
    /// what crashed launch. Prefer `GoogleService-Info.plist` in the bundle.
    static let apiKey = "AIzaSyAVeoQkXYi3eMRaINsvDBNvbKX2XrTatBM"
    static let projectID = "strainfinder-84a9b"
    static let gcmSenderID = "89734321536"
    static let googleAppID = "1:89734321536:ios:4d986c4b721a9b28e31d65"
    static let googleClientID = "89734321536-s3njeabohn98bd8s0rqh05diur2mk9h2.apps.googleusercontent.com"

    static private(set) var isConfigured = false

    static func configure() {
        guard FirebaseApp.app() == nil else {
            isConfigured = true
            configureGoogle()
            return
        }

        let hasPlist = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil
        if hasPlist {
            FirebaseApp.configure()
        } else if googleAppID.contains(":ios:") {
            let options = FirebaseOptions(googleAppID: googleAppID, gcmSenderID: gcmSenderID)
            options.apiKey = apiKey
            options.projectID = projectID
            options.bundleID = Bundle.main.bundleIdentifier ?? "ai.strainease.app"
            options.clientID = googleClientID
            FirebaseApp.configure(options: options)
        } else {
            isConfigured = false
            return
        }

        isConfigured = FirebaseApp.app() != nil
        configureGoogle()
    }

    private static func configureGoogle() {
        let clientID = FirebaseApp.app()?.options.clientID ?? googleClientID
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
    }
}
