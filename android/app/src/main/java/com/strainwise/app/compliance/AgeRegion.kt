package com.strainwise.app.compliance

import kotlinx.serialization.Serializable

/**
 * Region codes supported by StrainEase. Direct port of the iOS
 * `AgeRegion` enum, which mirrors `src/lib/age-policy.ts` on the
 * web. Single source of truth for the supported regions + their
 * minimum ages; every screen that talks about age reads from here.
 *
 *  - US:        21
 *  - Canada:    19 (Alberta is split out at 18)
 *  - EU:        18
 *  - UK:        18
 *  - Australia: 18
 *  - Other:     21 (strictest common standard, used as the fallback)
 */
@Serializable
enum class AgeRegion(val wire: String) {
    US("US"),
    Canada("CA"),
    Alberta("CA-AB"),
    EU("EU"),
    UK("UK"),
    Australia("AU"),
    Other("OTHER");

    val label: String
        get() = when (this) {
            US -> "United States"
            Canada -> "Canada (except Alberta)"
            Alberta -> "Canada (Alberta)"
            EU -> "European Union"
            UK -> "United Kingdom"
            Australia -> "Australia"
            Other -> "Other / not listed"
        }

    val minimumAge: Int
        get() = when (this) {
            US -> 21
            Canada -> 19
            Alberta -> 18
            EU -> 18
            UK -> 18
            Australia -> 18
            Other -> 21
        }

    val legalNote: String
        get() = when (this) {
            US -> "Cannabis laws vary by state. StrainEase provides research information only."
            Canada -> "Provincial minimum age is 19 in most provinces and territories."
            Alberta -> "Alberta's minimum age is 18."
            EU -> "Most EU member states set 18 as the minimum age for medical or adult-use cannabis."
            UK -> "Cannabis is currently prescription-only in the UK. StrainEase is research, not a prescription."
            Australia -> "Cannabis is prescription-only nationally except the ACT, where adults 18+ may possess small amounts."
            Other -> "When no specific rule applies we default to 21+, the strictest common standard."
        }

    companion object {
        fun parse(raw: String?): AgeRegion? = entries.firstOrNull { it.wire == raw }
    }
}
