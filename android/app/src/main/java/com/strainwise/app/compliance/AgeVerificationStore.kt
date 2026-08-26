package com.strainwise.app.compliance

import android.content.Context
import com.strainwise.app.BuildConfig
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.LocalDate
import java.time.Period
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Age-verification record persisted in DataStore. Mirrors the iOS
 * `AgeVerificationRecord` struct field-for-field (region + birth
 * date + attested-at + expires-at + the two acceptance
 * timestamps). Stored as a single JSON blob in a Preferences
 * DataStore so the rest of the app can observe it through a
 * [Flow] without any extra boilerplate.
 */
@Serializable
data class AgeVerificationRecord(
    val region: AgeRegion,
    /** ISO 8601 yyyy-MM-dd, matches the iOS wire format. */
    val birthDate: String,
    val attestedAt: Long,
    val expiresAt: Long,
    val termsAcceptedAt: Long,
    val privacyAcceptedAt: Long,
)

/** Failure modes for a single age-verification submission.
 *
 *  - [MissingBirthDate] / [Invalid] / [Future] mean the user
 *    typed something bad — the gate re-prompts with a cleared
 *    date picker.
 *  - [Underage] is a hard lockout: the gate keeps the typed
 *    birth date so the user can't keep retrying different values. */
sealed class AgeFailure {
    data object MissingBirthDate : AgeFailure()
    data object Invalid : AgeFailure()
    data object Future : AgeFailure()
    data object Underage : AgeFailure()
}

private val Context.ageDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "strainease_age_verification",
)

private val AGE_RECORD_KEY = stringPreferencesKey("age_record_v1")

/**
 * Process-wide age verification state. Mirrors the iOS
 * `AgeVerificationStore`: a single source of truth that survives
 * process death via DataStore preferences.
 *
 *  - [isVerified] is `true` when there's a non-expired record.
 *  - [verify] runs the same checks as the iOS source: rejects
 *    future dates, ages under the region's minimum, ages above
 *    120 (typo guard).
 *  - [reset] wipes the record; used by the Compliance footer
 *    "Reset age verification" action.
 *  - [seedIfNeeded] pre-populates a valid record in debug builds
 *    so the age gate is bypassed during development. No-op in
 *    release builds — production logic is unaffected.
 */
class AgeVerificationStore(private val context: Context) {

    private val json: Json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    @Volatile
    var record: AgeVerificationRecord? = null
        private set

    val recordFlow: Flow<AgeVerificationRecord?> =
        context.ageDataStore.data.map { prefs ->
            prefs[AGE_RECORD_KEY]?.let { decode(it) }
        }

    suspend fun refresh() {
        record = context.ageDataStore.data.first()[AGE_RECORD_KEY]?.let { decode(it) }
    }

    /**
     * Development shortcut: if no valid record exists, seed one that
     * passes [isVerified]. No-op in release builds — production age
     * gate logic is untouched.
     *
     * Call once at startup (e.g. from `RootView`) before the gate
     * decision is evaluated.
     */
    suspend fun seedIfNeeded() {
        if (isVerified) return
        if (!BuildConfig.DEBUG) return
        val now = System.currentTimeMillis()
        val seed = AgeVerificationRecord(
            region = AgeRegion.US,
            birthDate = LocalDate.now(ZoneId.systemDefault())
                .minusYears(25).format(DateTimeFormatter.ISO_LOCAL_DATE),
            attestedAt = now,
            expiresAt = now + TTL_MS,
            termsAcceptedAt = now,
            privacyAcceptedAt = now,
        )
        persist(seed)
    }

    val isVerified: Boolean
        get() {
            if (BuildConfig.DEBUG) return true  // bypass gate in debug builds
            val r = record ?: return false
            return r.expiresAt > System.currentTimeMillis()
        }

    val region: AgeRegion?
        get() = if (isVerified) record?.region else null

    val minimumAge: Int
        get() = region?.minimumAge ?: 21

    /** Result of a single age-verification submission. Either
     *  [Success] with the persisted record, or [Failure] with
     *  the [AgeFailure] reason. */
    sealed class VerifyResult {
        data class Success(val record: AgeVerificationRecord) : VerifyResult()
        data class Failure(val reason: AgeFailure) : VerifyResult()
    }

    suspend fun verify(
        region: AgeRegion,
        birthDate: LocalDate,
    ): VerifyResult {
        val today = LocalDate.now(ZoneId.systemDefault())
        if (birthDate.isAfter(today)) return VerifyResult.Failure(AgeFailure.Future)
        val age = Period.between(birthDate, today).years
        if (age < region.minimumAge) return VerifyResult.Failure(AgeFailure.Underage)
        if (age > 120) return VerifyResult.Failure(AgeFailure.Invalid)

        val now = System.currentTimeMillis()
        val next = AgeVerificationRecord(
            region = region,
            birthDate = birthDate.format(DateTimeFormatter.ISO_LOCAL_DATE),
            attestedAt = now,
            expiresAt = now + TTL_MS,
            termsAcceptedAt = now,
            privacyAcceptedAt = now,
        )
        persist(next)
        return VerifyResult.Success(next)
    }

    suspend fun reset() {
        record = null
        context.ageDataStore.edit { it.remove(AGE_RECORD_KEY) }
    }

    private suspend fun persist(next: AgeVerificationRecord) {
        record = next
        context.ageDataStore.edit { prefs ->
            prefs[AGE_RECORD_KEY] = json.encodeToString(next)
        }
    }

    private fun decode(raw: String): AgeVerificationRecord? = try {
        json.decodeFromString<AgeVerificationRecord>(raw)
    } catch (t: Throwable) {
        android.util.Log.w("AgeVerificationStore", "decode failed: ${t.message}")
        null
    }

    companion object {
        /** 30 days, mirrors the iOS `ttl: 30 * 24 * 60 * 60`. */
        const val TTL_MS: Long = 30L * 24 * 60 * 60 * 1000
    }
}
