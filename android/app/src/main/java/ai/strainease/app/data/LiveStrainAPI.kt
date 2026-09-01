package ai.strainease.app.data

import com.google.firebase.FirebaseApp
import com.google.firebase.functions.FirebaseFunctions
import ai.strainease.app.models.DoctorQuery
import ai.strainease.app.models.DoctorResult
import ai.strainease.app.models.ElaboratedSection
import ai.strainease.app.models.Potency
import ai.strainease.app.models.RedditSource
import ai.strainease.app.models.ResearchPrefs
import ai.strainease.app.models.StrainComparison
import ai.strainease.app.models.StrainDescription
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.models.RecommendationResult
import ai.strainease.app.services.FirebaseBootstrap
import android.util.Base64
import kotlinx.coroutines.tasks.await
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonObjectBuilder
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.serializer

/**
 * Live Firebase-backed [StrainAPI]. Direct port of the iOS
 * `LiveStrainAPI` struct, calling the same Cloud Functions the
 * web + iOS clients use. The wire payload is hand-built with
 * `kotlinx.serialization.json` so the JSON sent over the wire
 * matches the iOS `[String: Any]` payloads exactly.
 *
 * Errors are normalized through [friendlyMessage] so the patient
 * sees the server's `HttpsError.message` (e.g. "Select 2–3 strains
 * to compare.") instead of the Android SDK's generic
 * "The operation couldn't be completed" boilerplate.
 */
class LiveStrainAPI(
    private val functions: FirebaseFunctions = FirebaseFunctions.getInstance(
        FirebaseApp.getInstance(),
    ),
    private val json: Json = DefaultJson,
) : StrainAPI {

    override suspend fun recommend(
        conditions: List<String>,
        potency: Potency,
        prefs: ResearchPrefs,
        reliefSummary: String?,
        language: String,
    ): RecommendationResult {
        val payload = buildJsonObject {
            put("conditions", buildJsonArray { conditions.forEach { add(it) } })
            if (potency != Potency.Any) put("potency", potency.wire)
            putPrefsAndLanguage(prefs, reliefSummary, language)
        }
        return call("recommendStrainsForConditions", payload)
    }

    override suspend fun compare(
        strainNames: List<String>,
        conditions: List<String>,
        prefs: ResearchPrefs,
        reliefSummary: String?,
        language: String,
    ): StrainComparison {
        val payload = buildJsonObject {
            put("strainNames", buildJsonArray { strainNames.forEach { add(it) } })
            if (conditions.isNotEmpty()) {
                put("condition", buildJsonArray { conditions.forEach { add(it) } })
            }
            putPrefsAndLanguage(prefs, reliefSummary, language)
        }
        return call("compareStrains", payload)
    }

    override suspend fun search(
        name: String,
        conditions: List<String>,
    ): StrainProfile? {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return null
        val payload = buildJsonObject {
            put("name", trimmed)
            if (conditions.isNotEmpty()) {
                put("conditions", buildJsonArray { conditions.forEach { add(it) } })
            }
        }
        return callOptional("searchStrain", payload)
    }

    override suspend fun popular(): List<StrainProfile> {
        return call("popularStrains", buildJsonObject { })
    }

    override suspend fun findDoctors(query: DoctorQuery): DoctorResult {
        val payload = buildJsonObject {
            query.lat?.let { put("lat", it) }
            query.lon?.let { put("lon", it) }
            query.city?.takeIf { it.isNotEmpty() }?.let { put("city", it) }
            query.state?.takeIf { it.isNotEmpty() }?.let { put("state", it) }
            query.zip?.takeIf { it.isNotEmpty() }?.let { put("zip", it) }
            query.radiusMiles?.let { put("radiusMiles", it) }
        }
        return call("findDoctors", payload)
    }

    override suspend fun describe(
        strain: StrainProfile,
        ailments: List<String>,
        medications: List<String>,
        reliefHistory: String,
        language: String,
    ): StrainDescription? {
        val trimmedName = strain.name.trim()
        if (trimmedName.isEmpty()) return null
        val cleanedAilments = ailments.map { it.trim() }.filter { it.isNotEmpty() }.take(16)
        val cleanedMedications = medications.map { it.trim() }.filter { it.isNotEmpty() }.take(24)
        val cleanedRelief = reliefHistory.trim()
        val payload = buildJsonObject {
            put("strain", strainToPayload(strain))
            put("ailments", buildJsonArray { cleanedAilments.forEach { add(it) } })
            put("medications", buildJsonArray { cleanedMedications.forEach { add(it) } })
            put("language", language)
            if (cleanedRelief.isNotEmpty()) {
                put("reliefHistory", cleanedRelief.take(800))
            }
        }
        return callOptional("describeStrainForUser", payload)
    }

    override suspend fun elaborate(
        strain: StrainProfile,
        sectionHeading: String,
        sectionBody: String,
        ailments: List<String>,
        medications: List<String>,
        reliefHistory: String,
        language: String,
    ): String {
        val trimmedName = strain.name.trim()
        require(trimmedName.isNotEmpty()) { "Strain name is required." }
        val trimmedHeading = sectionHeading.trim()
        require(trimmedHeading.isNotEmpty()) { "Section heading is required." }
        val cleanedAilments = ailments.map { it.trim() }.filter { it.isNotEmpty() }.take(16)
        val cleanedMedications = medications.map { it.trim() }.filter { it.isNotEmpty() }.take(24)
        val cleanedRelief = reliefHistory.trim()
        val payload = buildJsonObject {
            put("strain", strainToPayload(strain))
            put("sectionHeading", trimmedHeading.take(80))
            put("sectionBody", sectionBody.trim().take(2000))
            put("ailments", buildJsonArray { cleanedAilments.forEach { add(it) } })
            put("medications", buildJsonArray { cleanedMedications.forEach { add(it) } })
            put("language", language)
            put("reliefHistory", cleanedRelief.take(800))
        }
        val result = call<ElaboratedSection>("elaborateSection", payload)
        return result.elaboration
    }

    override suspend fun redditThreads(
        name: String,
        conditions: List<String>,
    ): List<RedditSource> {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return emptyList()
        val cleaned = conditions.map { it.trim() }.filter { it.isNotEmpty() }
        val payload = buildJsonObject {
            put("name", trimmed)
            if (cleaned.isNotEmpty()) {
                put("conditions", buildJsonArray { cleaned.forEach { add(it) } })
            }
        }
        return call<List<RedditSource>>("redditThreadsForStrain", payload)
    }

    override suspend fun clinicianReportPdf(
        language: String,
        includeKayaSummary: Boolean,
    ): ClinicianReportPdf {
        val payload = buildJsonObject {
            put("language", language)
            put("includeKayaSummary", includeKayaSummary)
        }
        data class Wire(
            val pdfBase64: String,
            val filename: String,
            val contentType: String,
            val byteLength: Int,
            val kayaIncluded: Boolean,
        )
        val wire = call<Wire>("generateClinicianReportPdf", payload)
        val bytes = Base64.decode(wire.pdfBase64, Base64.DEFAULT)
        if (bytes.size != wire.byteLength) {
            // Decode mismatch usually means the base64 alphabet is
            // wrong or the server miscounted. Surface as a normal
            // StrainAPIException so the caller can show a toast.
            throw StrainAPIException(
                "Report payload size mismatch (got ${bytes.size}, expected ${wire.byteLength})."
            )
        }
        return ClinicianReportPdf(
            pdfBytes = bytes,
            filename = wire.filename,
            contentType = wire.contentType,
            byteLength = wire.byteLength,
            kayaIncluded = wire.kayaIncluded,
        )
    }

    /** Encode the strain into a plain JSON object so the backend
     *  gets the same shape it gets from the web client. Mirrors
     *  `strainDictionary` in the iOS source. */
    private fun strainToPayload(strain: StrainProfile): JsonObject = buildJsonObject {
        put("name", strain.name)
        put("inKnowledgeBase", strain.inKnowledgeBase)
        strain.type?.let { put("type", it.wire) }
        strain.thcRange?.let { put("thcRange", it) }
        strain.cbdRange?.takeIf { it != "<1%" }?.let { put("cbdRange", it) }
        strain.lineage?.let { put("lineage", it) }
        strain.terpenes?.let { list ->
            put("terpenes", buildJsonArray {
                list.forEach { t ->
                    add(buildJsonObject {
                        put("name", t.name)
                        put("profile", t.profile)
                    })
                }
            })
        }
        strain.medicalUses?.let { list ->
            put("medicalUses", buildJsonArray { list.forEach { add(it) } })
        }
        strain.effects?.let { list ->
            put("effects", buildJsonArray {
                list.forEach { e ->
                    add(buildJsonObject {
                        put("name", e.name)
                        put("intensity", e.intensity)
                    })
                }
            })
        }
        strain.sideEffects?.let { list ->
            put("sideEffects", buildJsonArray { list.forEach { add(it) } })
        }
        strain.description?.let { put("description", it) }
        strain.communityNotes?.let { list ->
            put("communityNotes", buildJsonArray {
                list.forEach { n ->
                    add(buildJsonObject {
                        put("source", n.source)
                        put("text", n.text)
                    })
                }
            })
        }
        strain.imageUrl?.let { put("imageUrl", it) }
        strain.leaflyRating?.let { put("leaflyRating", it) }
        strain.leaflyReviewCount?.let { put("leaflyReviewCount", it) }
        strain.weedmapsRating?.let { put("weedmapsRating", it) }
        strain.weedmapsReviewCount?.let { put("weedmapsReviewCount", it) }
        strain.allbudRating?.let { put("allbudRating", it) }
        strain.allbudReviewCount?.let { put("allbudReviewCount", it) }
    }

    private fun JsonObjectBuilder.putPrefsAndLanguage(
        prefs: ResearchPrefs,
        reliefSummary: String?,
        language: String,
    ) {
        val compacted = prefs.toCompactedMap(reliefSummary)
        if (compacted.isNotEmpty()) {
            put("prefs", buildJsonObject {
                for ((k, v) in compacted) {
                    when (v) {
                        is String -> put(k, v)
                        is Number -> put(k, v)
                        is Boolean -> put(k, v)
                        is List<*> -> put(k, buildJsonArray {
                            v.forEach { item -> addAny(item) }
                        })
                        else -> put(k, v.toString())
                    }
                }
            })
        }
        put("language", language)
    }

    private fun kotlinx.serialization.json.JsonArrayBuilder.addAny(item: Any?) {
        when (item) {
            null -> add(JsonNull)
            is String -> add(item)
            is Number -> add(item)
            is Boolean -> add(item)
            else -> add(item.toString())
        }
    }

    private suspend inline fun <reified T> call(
        name: String,
        payload: JsonObject,
    ): T {
        val raw = callRaw(name, payload) ?: error("Empty response from $name.")
        return json.decodeFromJsonElement(serializer<T>(), raw)
    }

    private suspend inline fun <reified T> callOptional(
        name: String,
        payload: JsonObject,
    ): T? {
        val raw = callRaw(name, payload) ?: return null
        if (raw is JsonNull) return null
        return json.decodeFromJsonElement(serializer<T>(), raw)
    }

    private suspend fun callRaw(name: String, payload: JsonObject): JsonElement? {
        check(FirebaseBootstrap.isConfigured) { "Firebase isn't configured yet." }
        return try {
            val task = functions.getHttpsCallable(name).call(payload)
            val raw = task.await().data
            anyToJsonElement(raw)
        } catch (t: Throwable) {
            throw StrainAPIException(friendlyMessage(t))
        }
    }

    /** Convert the loose `Any?` shape Firebase Functions returns
     *  (`Map<String, Any?>` / `List<Any?>` / scalar / null) into the
     *  strict [JsonElement] tree kotlinx-serialization wants. */
    @OptIn(ExperimentalSerializationApi::class)
    private fun anyToJsonElement(value: Any?): JsonElement? = when (value) {
        null -> JsonNull
        is JsonElement -> value
        is Boolean -> JsonPrimitive(value)
        is Number -> JsonPrimitive(value)
        is String -> JsonPrimitive(value)
        is Map<*, *> -> {
            val entries = value.entries
                .filter { it.key is String }
                .mapNotNull { (k, v) ->
                    val key = k as? String ?: return@mapNotNull null
                    key to (anyToJsonElement(v) ?: JsonNull)
                }
                .toMap()
            JsonObject(entries)
        }
        is List<*> -> JsonArray(value.map { anyToJsonElement(it) ?: JsonNull })
        is Array<*> -> JsonArray(value.map { anyToJsonElement(it) ?: JsonNull })
        else -> JsonPrimitive(value.toString())
    }

    private fun friendlyMessage(error: Throwable): String {
        // Firebase Functions v2 surfaces the server's HttpsError
        // message via `error.message`. Prefer that over the generic
        // Android SDK boilerplate "The operation couldn't be completed".
        val message = error.message
        if (!message.isNullOrBlank() && !message.startsWith("The operation couldn't be completed")) {
            return message
        }
        val cause = error.cause?.message
        if (!cause.isNullOrBlank()) return cause
        return error.localizedMessage ?: "Something went wrong."
    }

    companion object {
        val DefaultJson: Json = Json {
            ignoreUnknownKeys = true
            encodeDefaults = false
            explicitNulls = false
            prettyPrint = false
        }
    }
}

class StrainAPIException(message: String) : RuntimeException(message)
