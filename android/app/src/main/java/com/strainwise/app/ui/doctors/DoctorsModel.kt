package com.strainwise.app.ui.doctors

import com.strainwise.app.StrainWiseApplication
import com.strainwise.app.data.StrainAPI
import com.strainwise.app.models.DoctorQuery
import com.strainwise.app.models.DoctorResolvedLocation
import com.strainwise.app.models.DoctorResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Doctors view-model. Direct port of the iOS `DoctorsModel`.
 *
 *  - [status] is one of idle / locating / searching / ready / error.
 *  - [city] / [state] / [radiusMiles] feed the city-search path.
 *  - [result] / [lastResolvedLocation] are the most recent
 *    successful search response.
 */
class DoctorsModel(
    private val api: StrainAPI = StrainWiseApplication.strainAPI,
    private val locationProvider: LocationProvider? = null,
) {
    enum class Status { Idle, Locating, Searching, Ready, Error }

    private val _status = MutableStateFlow(Status.Idle)
    val status: StateFlow<Status> = _status.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _result = MutableStateFlow<DoctorResult?>(null)
    val result: StateFlow<DoctorResult?> = _result.asStateFlow()

    private val _radiusMiles = MutableStateFlow(25.0)
    val radiusMiles: StateFlow<Double> = _radiusMiles.asStateFlow()

    private val _city = MutableStateFlow("")
    val city: StateFlow<String> = _city.asStateFlow()

    private val _state = MutableStateFlow("")
    val state: StateFlow<String> = _state.asStateFlow()

    private val _lastResolvedLocation = MutableStateFlow<DoctorResolvedLocation?>(null)
    val lastResolvedLocation: StateFlow<DoctorResolvedLocation?> = _lastResolvedLocation.asStateFlow()

    fun setCity(value: String) { _city.value = value }
    fun setState(value: String) { _state.value = value }
    fun setRadius(value: Double) { _radiusMiles.value = value }

    private val location: LocationProvider by lazy {
        locationProvider ?: LocationProvider(StrainWiseApplication.let { it as android.content.Context })
    }

    suspend fun useMyLocation() {
        _status.value = Status.Locating
        _errorMessage.value = null
        try {
            val coords = location.requestLocation()
            runSearch(
                DoctorQuery(
                    lat = coords.latitude,
                    lon = coords.longitude,
                    radiusMiles = _radiusMiles.value,
                ),
            )
        } catch (e: LocationProvider.LocationError) {
            _status.value = Status.Idle
            _errorMessage.value = e.message
        } catch (t: Throwable) {
            _status.value = Status.Idle
            _errorMessage.value = t.localizedMessage
        }
    }

    suspend fun searchByCity() {
        val city = _city.value.trim()
        val state = _state.value.trim()
        if (city.isEmpty() || state.isEmpty()) {
            _errorMessage.value = "Enter a city and state."
            return
        }
        runSearch(DoctorQuery(city = city, state = state, radiusMiles = _radiusMiles.value))
    }

    private suspend fun runSearch(query: DoctorQuery) {
        _status.value = Status.Searching
        _errorMessage.value = null
        try {
            val found = api.findDoctors(query = query)
            _result.value = found
            found.resolvedLocation?.let { resolved ->
                _lastResolvedLocation.value = resolved
                _city.value = resolved.city
                _state.value = resolved.state
            }
            _status.value = Status.Ready
        } catch (t: Throwable) {
            _errorMessage.value = t.localizedMessage ?: "Couldn't search."
            _status.value = Status.Error
        }
    }
}
