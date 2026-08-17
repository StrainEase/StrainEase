import XCTest
@testable import StrainWise

@MainActor
final class AgeVerificationStoreTests: XCTestCase {
    func testFreshStoreIsUnverified() {
        let suite = UserDefaults(suiteName: "AgeVerificationStoreTests.\(UUID().uuidString)")!
        defer { UserDefaults().removePersistentDomain(forName: suite.dictionaryRepresentation().keys.first ?? "") }
        let store = AgeVerificationStore(defaults: suite)
        XCTAssertFalse(store.isVerified)
        XCTAssertNil(store.region)
    }

    func testVerifyAcceptsAdultAboveMinimumAge() throws {
        let suite = UserDefaults(suiteName: "AgeVerificationStoreTests.\(UUID().uuidString)")!
        let store = AgeVerificationStore(defaults: suite)

        let dob = Calendar.current.date(byAdding: .year, value: -25, to: Date())!
        let result = store.verify(region: .us, birthDate: dob)
        switch result {
        case .success(let record):
            XCTAssertEqual(record.region, .us)
            XCTAssertTrue(store.isVerified)
            XCTAssertEqual(store.region, .us)
        case .failure(let failure):
            XCTFail("Expected success, got \(failure)")
        }
    }

    func testVerifyRejectsUnderageInUS() {
        let suite = UserDefaults(suiteName: "AgeVerificationStoreTests.\(UUID().uuidString)")!
        let store = AgeVerificationStore(defaults: suite)

        let dob = Calendar.current.date(byAdding: .year, value: -19, to: Date())!
        let result = store.verify(region: .us, birthDate: dob)
        XCTAssertEqual(result, .failure(.underage))
        XCTAssertFalse(store.isVerified)
    }

    func testVerifyAcceptsNineteenInCanada() {
        let suite = UserDefaults(suiteName: "AgeVerificationStoreTests.\(UUID().uuidString)")!
        let store = AgeVerificationStore(defaults: suite)

        let dob = Calendar.current.date(byAdding: .year, value: -19, to: Date())!
        let result = store.verify(region: .canada, birthDate: dob)
        if case .success = result {} else { XCTFail("Expected success for 19 in Canada") }
    }

    func testVerifyAcceptsEighteenInAlberta() {
        let suite = UserDefaults(suiteName: "AgeVerificationStoreTests.\(UUID().uuidString)")!
        let store = AgeVerificationStore(defaults: suite)

        let dob = Calendar.current.date(byAdding: .year, value: -18, to: Date())!
        let result = store.verify(region: .alberta, birthDate: dob)
        if case .success = result {} else { XCTFail("Expected success for 18 in Alberta") }
    }

    func testVerifyRejectsFutureBirthDate() {
        let suite = UserDefaults(suiteName: "AgeVerificationStoreTests.\(UUID().uuidString)")!
        let store = AgeVerificationStore(defaults: suite)

        let future = Calendar.current.date(byAdding: .day, value: 30, to: Date())!
        let result = store.verify(region: .us, birthDate: future)
        XCTAssertEqual(result, .failure(.future))
    }

    func testResetClearsTheRecord() throws {
        let suite = UserDefaults(suiteName: "AgeVerificationStoreTests.\(UUID().uuidString)")!
        let store = AgeVerificationStore(defaults: suite)

        let dob = Calendar.current.date(byAdding: .year, value: -25, to: Date())!
        _ = store.verify(region: .us, birthDate: dob)
        XCTAssertTrue(store.isVerified)

        store.reset()
        XCTAssertFalse(store.isVerified)
        XCTAssertNil(store.region)
    }

    func testReloadPicksUpPersistedRecord() throws {
        let suite = UserDefaults(suiteName: "AgeVerificationStoreTests.\(UUID().uuidString)")!
        let dob = Calendar.current.date(byAdding: .year, value: -25, to: Date())!
        let first = AgeVerificationStore(defaults: suite)
        _ = first.verify(region: .us, birthDate: dob)
        XCTAssertTrue(first.isVerified)

        let second = AgeVerificationStore(defaults: suite)
        XCTAssertTrue(second.isVerified)
        XCTAssertEqual(second.region, .us)
    }
}