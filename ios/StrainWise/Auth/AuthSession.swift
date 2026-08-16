import AuthenticationServices
import CryptoKit
import FirebaseAuth
import Foundation
import GoogleSignIn
import UIKit

struct SessionUser: Equatable, Hashable, Sendable {
    var uid: String
    var email: String?
    var name: String
}

enum SessionStatus: Equatable {
    case loading
    case signedOut
    case signedIn(SessionUser)
}

@Observable
@MainActor
final class AuthSession {
    var status: SessionStatus = .loading
    var errorMessage: String?
    var isBusy = false

    @ObservationIgnored private var handle: AuthStateDidChangeListenerHandle?
    @ObservationIgnored private let apple = AppleSignInCoordinator()

    var user: SessionUser? {
        if case .signedIn(let user) = status { return user }
        return nil
    }

    var isSignedIn: Bool { user != nil }

    func start() {
        guard FirebaseBootstrap.isConfigured else {
            status = .signedOut
            return
        }
        handle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in
                self?.status = user.map { .signedIn(SessionUser(firebase: $0)) } ?? .signedOut
            }
        }
    }

    func signIn(email: String, password: String) async {
        await run {
            _ = try await Auth.auth().signIn(withEmail: email, password: password)
        }
    }

    func signUp(email: String, password: String) async {
        await run {
            _ = try await Auth.auth().createUser(withEmail: email, password: password)
        }
    }

    func signInWithGoogle() async {
        await run {
            guard let presenter = Self.topViewController() else {
                throw StrainAPIError.message("Couldn’t find a window to present Google sign-in.")
            }
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
            guard let idToken = result.user.idToken?.tokenString else {
                throw StrainAPIError.message("Google didn’t return an ID token.")
            }
            let credential = GoogleAuthProvider.credential(
                withIDToken: idToken,
                accessToken: result.user.accessToken.tokenString
            )
            _ = try await Auth.auth().signIn(with: credential)
        }
    }

    func signInWithApple() async {
        await run {
            let tokens = try await self.apple.signIn()
            let credential = OAuthProvider.appleCredential(
                withIDToken: tokens.idToken,
                rawNonce: tokens.nonce,
                fullName: tokens.fullName
            )
            _ = try await Auth.auth().signIn(with: credential)
        }
    }

    func updateDisplayName(_ name: String) async {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        if !FirebaseBootstrap.isConfigured {
            applyLocalName(trimmed)
            return
        }
        await run {
            guard let user = Auth.auth().currentUser else {
                throw StrainAPIError.message("You’re not signed in.")
            }
            let request = user.createProfileChangeRequest()
            request.displayName = trimmed
            try await request.commitChanges()
            self.applyLocalName(trimmed)
        }
    }

    func signOut() {
        do {
            try Auth.auth().signOut()
            GIDSignIn.sharedInstance.signOut()
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func applyLocalName(_ name: String) {
        if case .signedIn(var current) = status {
            current.name = name
            status = .signedIn(current)
        }
    }

    private func run(_ work: @escaping () async throws -> Void) async {
        isBusy = true
        errorMessage = nil
        defer { isBusy = false }
        do {
            try await work()
        } catch {
            errorMessage = Self.friendlyAuthMessage(error)
        }
    }

    static func friendlyAuthMessage(_ error: Error) -> String {
        let code = (error as NSError).code
        switch AuthErrorCode(rawValue: code) {
        case .emailAlreadyInUse:
            return "An account already exists for that email — sign in instead."
        case .wrongPassword, .invalidCredential:
            return "Incorrect email or password."
        case .userNotFound:
            return "No account found for that email — create one instead."
        case .invalidEmail:
            return "That doesn’t look like a valid email."
        case .weakPassword:
            return "Use at least 6 characters for your password."
        case .webContextCancelled:
            return "Sign-in was cancelled."
        case .keychainError:
            let reason = (error as NSError).userInfo[NSLocalizedFailureReasonErrorKey] as? String
            if let reason, !reason.isEmpty {
                return "Couldn’t save the sign-in session (\(reason)). Delete the app from the simulator or device, rebuild, and try again."
            }
            return "Couldn’t save the sign-in session to the keychain. Delete the app from the simulator or device, rebuild, and try again."
        default:
            if (error as NSError).domain == ASAuthorizationError.errorDomain,
               (error as NSError).code == ASAuthorizationError.canceled.rawValue
            {
                return "Sign-in was cancelled."
            }
            return error.localizedDescription
        }
    }

    static func topViewController(from root: UIViewController? = nil) -> UIViewController? {
        let root = root ?? UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: \.isKeyWindow)?
            .rootViewController
        if let nav = root as? UINavigationController {
            return topViewController(from: nav.visibleViewController)
        }
        if let tab = root as? UITabBarController {
            return topViewController(from: tab.selectedViewController)
        }
        if let presented = root?.presentedViewController {
            return topViewController(from: presented)
        }
        return root
    }
}

private extension SessionUser {
    init(firebase user: User) {
        uid = user.uid
        email = user.email
        name = user.displayName
            ?? user.email?.split(separator: "@").first.map(String.init)
            ?? "Patient"
    }
}

private struct AppleTokens {
    var idToken: String
    var nonce: String
    var fullName: PersonNameComponents?
}

private final class AppleSignInCoordinator: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private var continuation: CheckedContinuation<AppleTokens, Error>?
    private var nonce: String?

    func signIn() async throws -> AppleTokens {
        let nonce = Self.randomNonce()
        self.nonce = nonce
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = Self.sha256(nonce)
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: \.isKeyWindow) ?? ASPresentationAnchor()
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        defer { continuation = nil }
        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let tokenData = credential.identityToken,
            let idToken = String(data: tokenData, encoding: .utf8),
            let nonce
        else {
            continuation?.resume(throwing: StrainAPIError.message("Apple didn’t return an ID token."))
            return
        }
        continuation?.resume(returning: AppleTokens(idToken: idToken, nonce: nonce, fullName: credential.fullName))
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        continuation?.resume(throwing: error)
        continuation = nil
    }

    private static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remaining = length
        while remaining > 0 {
            var bytes = [UInt8](repeating: 0, count: 16)
            _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
            for byte in bytes where remaining > 0 {
                if byte < charset.count {
                    result.append(charset[Int(byte)])
                    remaining -= 1
                }
            }
        }
        return result
    }

    private static func sha256(_ input: String) -> String {
        let hashed = SHA256.hash(data: Data(input.utf8))
        return hashed.map { String(format: "%02x", $0) }.joined()
    }
}

extension AuthSession {
    static var previewSignedOut: AuthSession {
        let session = AuthSession()
        session.status = .signedOut
        return session
    }

    static var previewSignedIn: AuthSession {
        let session = AuthSession()
        session.status = .signedIn(SessionUser(uid: "preview", email: "patient@strainwise.app", name: "Patient"))
        return session
    }
}
