package com.strainwise.app.ui.doctors

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.tasks.await

/**
 * Lightweight wrapper over Fused Location Provider Client.
 * Direct port of the iOS `LocationProvider`. The caller
 * must hold ACCESS_COARSE_LOCATION or ACCESS_FINE_LOCATION
 * before calling [requestLocation]; if neither is granted,
 * the request throws [LocationError.PermissionDenied] so the
 * Doctors tab can fall back to the city / state input.
 */
class LocationProvider(
    private val context: Context,
) {
    sealed class LocationError(message: String) : Exception(message) {
        data object PermissionDenied : LocationError("Location permission not granted.")
        data object Unavailable : LocationError("Couldn't get a location fix right now.")
    }

    private val client: FusedLocationProviderClient by lazy {
        LocationServices.getFusedLocationProviderClient(context)
    }

    fun hasPermission(): Boolean {
        val granted = PackageManager.PERMISSION_GRANTED
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        ) == granted || ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == granted
    }

    @SuppressLint("MissingPermission")
    suspend fun requestLocation(): Location {
        if (!hasPermission()) throw LocationError.PermissionDenied
        val cts = CancellationTokenSource()
        return try {
            val priority = Priority.PRIORITY_BALANCED_POWER_ACCURACY
            val location = client.getCurrentLocation(priority, cts.token).await()
                ?: client.lastLocation.await()
                ?: throw LocationError.Unavailable
            location
        } catch (t: Throwable) {
            throw LocationError.Unavailable
        } finally {
            cts.cancel()
        }
    }
}
