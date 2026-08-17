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
