package ai.strainease.app.models

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class ReasoningTraceTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun `recommendation decodes without reasoning`() {
        val raw = """
        {
          "strainName": "Granddaddy Purple",
          "reason": "A nighttime classic.",
          "bestFor": "Evening use",
          "caution": "Drowsy in the morning."
        }
        """.trimIndent()
        val rec = json.decodeFromString(StrainRecommendation.serializer(), raw)
        assertEquals("Granddaddy Purple", rec.strainName)
        assertNull(rec.reasoning)
    }

    @Test
    fun `recommendation decodes with full reasoning`() {
        val raw = """
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
        """.trimIndent()
        val rec = json.decodeFromString(StrainRecommendation.serializer(), raw)
        val r = rec.reasoning
        assertNotNull(r)
        assertEquals(listOf("Insomnia", "Anxiety"), r!!.matchedConditions)
        assertEquals(listOf("Time of day: night"), r.preferencesApplied)
        assertEquals(2, r.evidence.size)
        assertEquals(ReasoningSource.Leafly, r.evidence[0].source)
        assertEquals(ReasoningSource.PatientHistory, r.evidence[1].source)
        assertEquals(listOf("Start low given THC sensitivity."), r.considerations)
        assertEquals(6, r.totalBullets)
    }

    @Test
    fun `empty reasoning is hidden`() {
        val r = ReasoningEvidence()
        assertTrue(r.isEmpty)
        assertEquals(0, r.totalBullets)
    }

    @Test
    fun `partial reasoning is shown`() {
        val r = ReasoningEvidence(matchedConditions = listOf("Insomnia"))
        assertTrue(!r.isEmpty)
        assertEquals(1, r.totalBullets)
    }

    @Test
    fun `unknown source fails closed`() {
        val raw = """
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
        """.trimIndent()
        try {
            json.decodeFromString(StrainRecommendation.serializer(), raw)
            fail("expected SerializationException for unknown source")
        } catch (e: Exception) {
            // Expected — kotlinx.serialization throws on
            // unknown enum value when no fallback is set.
        }
    }

    @Test
    fun `all sources round-trip`() {
        ReasoningSource.entries.forEach { source ->
            val raw = "\"${serialNameOf(source)}\""
            val decoded = json.decodeFromString(ReasoningSource.serializer(), raw)
            assertEquals(source, decoded)
        }
    }

    private fun serialNameOf(source: ReasoningSource): String = when (source) {
        ReasoningSource.Leafly -> "Leafly"
        ReasoningSource.Weedmaps -> "Weedmaps"
        ReasoningSource.Allbud -> "Allbud"
        ReasoningSource.Reddit -> "Reddit"
        ReasoningSource.Aggregated -> "Aggregated"
        ReasoningSource.PatientHistory -> "Patient history"
    }
}
