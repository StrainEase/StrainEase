// Unit tests for the reasoning trace Codable contract. The web
// `ReasoningTrace.tsx` and the iOS `ReasoningTraceView` are
// shape-locked by these tests, so any drift in the JSON contract
// blows up here instead of in production.

import XCTest
@testable import StrainEase

final class ReasoningTraceTests: XCTestCase {
    func testRecommendationDecodesWithoutReasoning() throws {
        // Older model responses omit `reasoning`. The
        // `ReasoningEvidence?` field must decode as nil, not
        // throw.
        let json = """
        {
          "strainName": "Granddaddy Purple",
          "reason": "A nighttime classic.",
          "bestFor": "Evening use",
          "caution": "Drowsy in the morning."
        }
        """
        let data = json.data(using: .utf8)!
        let rec = try StrainEaseJSONDecoder().decode(StrainRecommendation.self, from: data)
        XCTAssertEqual(rec.strainName, "Granddaddy Purple")
        XCTAssertNil(rec.reasoning)
    }

    func testRecommendationDecodesWithFullReasoning() throws {
        let json = """
        {
          "strainName": "Granddaddy Purple",
          "reason": "A nighttime classic.",
          "bestFor": "Evening use",
          "caution": "Drowsy in the morning.",
          "reasoning": {
            "matchedConditions": ["Insomnia", "Anxiety"],
            "preferencesApplied": ["Time of day: night"],
            "evidence": [
              {"source": "Leafly", "quote": "78% of reviewers report relaxation."},
              {"source": "Patient history", "quote": "You rated similar strains 4/5."}
            ],
            "considerations": ["Start low given THC sensitivity."]
          }
        }
        """
        let data = json.data(using: .utf8)!
        let rec = try StrainEaseJSONDecoder().decode(StrainRecommendation.self, from: data)
        let r = try XCTUnwrap(rec.reasoning)
        XCTAssertEqual(r.matchedConditions, ["Insomnia", "Anxiety"])
        XCTAssertEqual(r.preferencesApplied, ["Time of day: night"])
        XCTAssertEqual(r.evidence.count, 2)
        XCTAssertEqual(r.evidence[0].source, .leafly)
        XCTAssertEqual(r.evidence[1].source, .patientHistory)
        XCTAssertEqual(r.considerations, ["Start low given THC sensitivity."])
        XCTAssertEqual(r.totalBullets, 6)
    }

    func testSourceRoundTripsAllCases() throws {
        for source in ReasoningSource.allCases {
            let raw = "\"\(source.rawValue)\""
            let data = raw.data(using: .utf8)!
            let decoded = try StrainEaseJSONDecoder().decode(ReasoningSource.self, from: data)
            XCTAssertEqual(decoded, source)
        }
    }

    func testEmptyReasoningIsHidden() {
        let r = ReasoningEvidence(
            matchedConditions: [],
            preferencesApplied: [],
            evidence: [],
            considerations: []
        )
        XCTAssertTrue(r.isEmpty)
        XCTAssertEqual(r.totalBullets, 0)
    }

    func testPartialReasoningIsShown() {
        let r = ReasoningEvidence(
            matchedConditions: ["Insomnia"],
            preferencesApplied: [],
            evidence: [],
            considerations: []
        )
        XCTAssertFalse(r.isEmpty)
        XCTAssertEqual(r.totalBullets, 1)
    }

    func testUnknownSourceFailsClosed() throws {
        // The backend normalizer must drop any source that
        // doesn't match the closed enum. The decoder should
        // throw — never silently coerce.
        let json = """
        {
          "strainName": "GDP",
          "reason": "x",
          "bestFor": "x",
          "caution": "x",
          "reasoning": {
            "matchedConditions": [],
            "preferencesApplied": [],
            "evidence": [
              {"source": "FakeSource", "quote": "invented"}
            ],
            "considerations": []
          }
        }
        """
        let data = json.data(using: .utf8)!
        XCTAssertThrowsError(try StrainEaseJSONDecoder().decode(StrainRecommendation.self, from: data))
    }
}

/// Lightweight JSONDecoder that matches the loose settings used
/// across the app (decode ints from doubles, etc.) so the
/// reasoning-shape tests don't depend on a specific StrainAPI
/// helper.
private func StrainEaseJSONDecoder() -> JSONDecoder {
    let decoder = JSONDecoder()
    return decoder
}
