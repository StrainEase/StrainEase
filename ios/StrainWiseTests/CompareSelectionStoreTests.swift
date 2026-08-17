import Foundation
import XCTest
@testable import StrainWise

@MainActor
final class CompareSelectionStoreTests: XCTestCase {
    func testAddRemoveAndCaseInsensitiveDedup() {
        let store = CompareSelectionStore()

        XCTAssertTrue(store.add(" Blue Dream "))
        XCTAssertFalse(store.add("blue dream"))
        XCTAssertEqual(store.names, ["Blue Dream"])
        XCTAssertTrue(store.isIn("BLUE DREAM"))

        store.remove("blue DREAM")
        XCTAssertTrue(store.names.isEmpty)
    }

    func testToggleAndCap() {
        let store = CompareSelectionStore()

        XCTAssertEqual(store.cap, 3)
        XCTAssertTrue(store.toggle("Blue Dream"))
        XCTAssertTrue(store.isIn("Blue Dream"))
        XCTAssertFalse(store.toggle("Blue Dream"))
        XCTAssertFalse(store.isIn("Blue Dream"))

        XCTAssertTrue(store.toggle("Blue Dream"))
        XCTAssertTrue(store.toggle("OG Kush"))
        XCTAssertTrue(store.toggle("Gelato"))
        XCTAssertTrue(store.atCap)
        XCTAssertFalse(store.toggle("Sour Diesel"))
        XCTAssertFalse(store.isIn("Sour Diesel"))
        XCTAssertEqual(store.names, ["Blue Dream", "OG Kush", "Gelato"])
    }

    func testClearAndCanRunCompare() {
        let store = CompareSelectionStore()

        XCTAssertEqual(store.count, 0)
        XCTAssertFalse(store.canRunCompare)
        store.add("Blue Dream")
        XCTAssertFalse(store.canRunCompare)
        store.add("OG Kush")
        XCTAssertTrue(store.canRunCompare)
        XCTAssertEqual(store.count, 2)

        store.clear()
        XCTAssertTrue(store.names.isEmpty)
        XCTAssertFalse(store.canRunCompare)
    }

    func testSetNamesReplacesDedupeCapsAndPreservesFirstCase() {
        let store = CompareSelectionStore()
        store.setNames(["Blue Dream", "blue dream", "OG Kush", "Gelato", "Sour Diesel"])

        XCTAssertEqual(store.names, ["Blue Dream", "OG Kush", "Gelato"])
    }

    func testSetNamesEmptyClearsSelection() {
        let store = CompareSelectionStore()
        store.add("Blue Dream")

        store.setNames([])

        XCTAssertTrue(store.names.isEmpty)
    }

    func testRunCompareSetsComparisonAndClearsRunningState() async {
        let store = CompareSelectionStore()
        store.add("Blue Dream")
        store.add("OG Kush")
        store.compareError = "Previous error"

        await store.runCompare(
            api: PreviewStrainAPI(),
            conditions: ["Insomnia"],
            prefs: ResearchPrefs(),
            reliefSummary: "Need to sleep"
        )

        XCTAssertEqual(store.comparison, .sample)
        XCTAssertFalse(store.isComparing)
        XCTAssertNil(store.compareError)
    }

    func testRunCompareSetsErrorAndClearsRunningState() async {
        let store = CompareSelectionStore()
        store.add("Blue Dream")
        store.add("OG Kush")
        let api = StubCompareAPI(result: .failure(CompareFailure(message: "Offline")))

        await store.runCompare(
            api: api,
            conditions: [],
            prefs: ResearchPrefs(),
            reliefSummary: nil
        )

        XCTAssertNil(store.comparison)
        XCTAssertFalse(store.isComparing)
        XCTAssertEqual(store.compareError, "Offline")
    }

    func testSelectionEditsClearStaleCompareError() {
        let store = CompareSelectionStore()
        store.add("Blue Dream")
        store.add("OG Kush")
        store.compareError = "Previous run failed"

        store.remove("Blue Dream")
        XCTAssertNil(store.compareError, "remove should clear stale error")

        store.compareError = "Another failure"
        store.toggle("OG Kush")
        XCTAssertNil(store.compareError, "toggle should clear stale error")

        store.compareError = "Yet another"
        store.add("Gelato")
        XCTAssertNil(store.compareError, "add should clear stale error")

        store.compareError = "Still failing"
        store.setNames(["Sour Diesel", "Northern Lights"])
        XCTAssertNil(store.compareError, "setNames should clear stale error")

        store.compareError = "Worse"
        store.clear()
        XCTAssertNil(store.compareError, "clear should clear stale error")
    }
}

private struct StubCompareAPI: StrainServicing {
    let result: Result<StrainComparison, Error>

    func recommend(conditions: [String], potency: Potency, prefs: ResearchPrefs, reliefSummary: String?) async throws -> RecommendationResult {
        .sample
    }

    func compare(strainNames: [String], conditions: [String], prefs: ResearchPrefs, reliefSummary: String?) async throws -> StrainComparison {
        try result.get()
    }

    func search(name: String) async throws -> StrainProfile? {
        .sampleGDP
    }

    func popular() async throws -> [StrainProfile] {
        StrainCatalog.all
    }

    func findDoctors(query: DoctorQuery) async throws -> DoctorResult {
        DoctorResult(doctors: [.sample], resolvedLocation: nil, source: "test")
    }

    func describe(
        strain: StrainProfile,
        ailments: [String],
        medications: [String],
        reliefHistory: String
    ) async throws -> StrainDescription? {
        .sample
    }
}

private struct CompareFailure: LocalizedError {
    let message: String

    var errorDescription: String? { message }
}

final class LiveStrainAPIFriendlyMessageTests: XCTestCase {
    func testPrefersFirebaseFunctionsServerMessage() {
        // Mimic the shape Firebase Functions v2 NSErrors carry: the actual
        // server text lives in userInfo["message"]. The generic
        // NSLocalizedDescription is "The operation couldn't be completed (…)"
        // and is useless to end users.
        let error = NSError(
            domain: "FIRFunctionsErrorDomain",
            code: 5,
            userInfo: [
                "NSLocalizedDescription": "The operation couldn't be completed (FIRFunctionsErrorDomain code 5.)",
                "message": "Select 2–3 strains to compare.",
            ]
        )

        XCTAssertEqual(LiveStrainAPI.friendlyMessage(from: error), "Select 2–3 strains to compare.")
    }

    func testFallsBackToNSLocalizedDescription() {
        let error = NSError(
            domain: "SomeDomain",
            code: 1,
            userInfo: [
                "NSLocalizedDescription": "Couldn't reach Leafly.",
            ]
        )

        XCTAssertEqual(LiveStrainAPI.friendlyMessage(from: error), "Couldn't reach Leafly.")
    }
}
