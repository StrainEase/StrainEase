import SwiftUI
import UIKit

struct DoctorsView: View {
    @State private var model: DoctorsModel

    init(model: DoctorsModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                MeshBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        hero
                        searchForm
                        results
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("Doctors")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            .appChrome()
            .accessibilityIdentifier("doctors.root")
        }
        .tint(Palette.primary)
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 8) {
            Eyebrow(text: "Medical")
            Text("Find a doctor")
                .font(.system(.largeTitle, design: .serif).weight(.regular))
                .foregroundStyle(Palette.foreground)
            Text("Live listings from Leafly's doctors directory. Use your location for the closest clinics, or search by city.")
                .font(.system(size: 15))
                .foregroundStyle(Palette.mutedForeground)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var searchForm: some View {
        SWCard {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 10) {
                        SWField(
                            title: "City",
                            placeholder: "Denver",
                            text: Binding(
                                get: { model.city },
                                set: { model.city = $0 }
                            )
                        )
                        SWField(
                            title: "State",
                            placeholder: "CO",
                            text: Binding(
                                get: { model.state },
                                set: { model.state = $0 }
                            )
                        )
                        .frame(maxWidth: 110)
                    }
                    Button(action: { Task { await model.searchByCity() } }) {
                        HStack {
                            if model.status == .searching {
                                ProgressView().tint(Palette.primaryForeground)
                            } else {
                                Image(systemName: "magnifyingglass")
                                Text("Search by city")
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "arrow.right")
                        }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Palette.primaryForeground)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 12)
                        .background(Palette.primary, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .disabled(model.status == .searching || model.status == .locating)
                }

                Divider().overlay(Palette.border)

                VStack(alignment: .leading, spacing: 10) {
                    Button(action: { Task { await model.useMyLocation() } }) {
                        HStack {
                            if model.status == .locating {
                                ProgressView().tint(Palette.primary)
                            } else {
                                Image(systemName: "location.fill")
                                Text("Use my location")
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "arrow.right")
                        }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Palette.primary)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 12)
                        .background(Palette.card.opacity(0.55), in: Capsule())
                        .overlay(Capsule().strokeBorder(Palette.primary.opacity(0.45), lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    .disabled(model.status == .searching || model.status == .locating)

                    HStack(spacing: 10) {
                        Text("Within")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Palette.mutedForeground)
                        Picker("", selection: Binding(
                            get: { model.radiusMiles },
                            set: { model.radiusMiles = $0 }
                        )) {
                            Text("10 mi").tag(10.0)
                            Text("25 mi").tag(25.0)
                            Text("50 mi").tag(50.0)
                            Text("100 mi").tag(100.0)
                        }
                        .pickerStyle(.segmented)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var results: some View {
        if model.status == .error, let message = model.errorMessage {
            SWCard {
                VStack(alignment: .leading, spacing: 8) {
                    Text("We couldn't load clinics.")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Palette.foreground)
                    Text(message)
                        .font(.system(size: 13))
                        .foregroundStyle(Palette.mutedForeground)
                }
            }
        }

        if model.status == .searching || model.status == .locating {
            DoctorsLoadingPlaceholder()
        }

        if let result = model.result, model.status == .ready {
            if result.doctors.isEmpty {
                SWCard {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("No clinics within \(Int(model.radiusMiles)) miles")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Palette.foreground)
                        if let resolved = result.resolvedLocation {
                            Text("of \(resolved.city), \(resolved.state).")
                                .font(.system(size: 13))
                                .foregroundStyle(Palette.mutedForeground)
                        }
                        Text("Try a wider radius or a different city.")
                            .font(.system(size: 13))
                            .foregroundStyle(Palette.mutedForeground)
                            .padding(.top, 4)
                    }
                }
            } else {
                DoctorsList(
                    doctors: result.doctors,
                    resolvedLocation: result.resolvedLocation,
                )
            }
        }
    }
}

private struct DoctorsList: View {
    let doctors: [Doctor]
    let resolvedLocation: DoctorResolvedLocation?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(headerLine)
                    .font(.system(size: 12, weight: .semibold))
                    .tracking(0.6)
                    .foregroundStyle(Palette.mutedForeground)
                Spacer(minLength: 0)
            }
            VStack(spacing: 12) {
                ForEach(Array(doctors.enumerated()), id: \.element.id) { index, doctor in
                    DoctorCard(doctor: doctor)
                        .transition(.opacity.combined(with: .move(edge: .top)))
                        .animation(.easeOut(duration: 0.3).delay(Double(index) * 0.04), value: doctor.id)
                }
            }
            Text("Listings from Leafly's medical-marijuana doctor directory. Always verify licensing and book directly with the clinic.")
                .font(.system(size: 11))
                .foregroundStyle(Palette.mutedForeground)
                .padding(.top, 4)
        }
    }

    private var headerLine: String {
        let count = doctors.count
        let suffix = count == 1 ? "clinic" : "clinics"
        if let resolved = resolvedLocation {
            return "\(count) \(suffix) near \(resolved.city), \(resolved.state)"
        }
        return "\(count) \(suffix)"
    }
}

private struct DoctorCard: View {
    let doctor: Doctor

    var body: some View {
        SWCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 10) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(doctor.name)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Palette.foreground)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(doctor.addressLine)
                            .font(.system(size: 12))
                            .foregroundStyle(Palette.mutedForeground)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 0)
                    if let miles = doctor.distanceMi {
                        VStack(spacing: 2) {
                            Text(String(format: "%.1f", miles))
                                .font(.system(size: 16, weight: .semibold, design: .rounded))
                                .foregroundStyle(Palette.primary)
                            Text("miles")
                                .font(.system(size: 10))
                                .foregroundStyle(Palette.mutedForeground)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Palette.primary.opacity(0.1), in: Capsule())
                    }
                }

                if let rating = doctor.rating, rating > 0 {
                    HStack(spacing: 6) {
                        Image(systemName: "star.fill")
                            .foregroundStyle(Palette.primary)
                        Text(String(format: "%.1f", rating))
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Palette.foreground)
                        if let reviews = doctor.reviewCount, reviews > 0 {
                            Text("(\(reviews))")
                                .font(.system(size: 12))
                                .foregroundStyle(Palette.mutedForeground)
                        }
                        if let snippet = doctor.reviewSnippet, !snippet.isEmpty {
                            Text("“\(snippet)”")
                                .font(.system(size: 12))
                                .foregroundStyle(Palette.mutedForeground)
                                .lineLimit(2)
                        }
                    }
                }

                HStack(spacing: 10) {
                    Button {
                        openURL(doctor.url)
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "leaf.fill")
                            Text("View on Leafly")
                        }
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Palette.primaryForeground)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Palette.primary, in: Capsule())
                    }
                    .buttonStyle(.plain)

                    if let maps = doctor.mapsURL {
                        Button {
                            UIApplication.shared.open(maps)
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "map.fill")
                                Text("Maps")
                            }
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Palette.primary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(Palette.card.opacity(0.6), in: Capsule())
                            .overlay(Capsule().strokeBorder(Palette.primary.opacity(0.45), lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func openURL(_ string: String) {
        guard let url = URL(string: string) else { return }
        UIApplication.shared.open(url)
    }
}

private struct DoctorsLoadingPlaceholder: View {
    var body: some View {
        VStack(spacing: 12) {
            ForEach(0..<3, id: \.self) { _ in
                SWCard {
                    VStack(alignment: .leading, spacing: 8) {
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .fill(Palette.muted)
                            .frame(height: 14)
                            .frame(maxWidth: 200)
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .fill(Palette.muted)
                            .frame(height: 10)
                            .frame(maxWidth: 240)
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .fill(Palette.muted)
                            .frame(height: 10)
                            .frame(maxWidth: 180)
                    }
                }
                .redacted(reason: .placeholder)
            }
        }
    }
}

#Preview("Doctors") {
    DoctorsView(model: DoctorsModel.previewLoaded)
        .environment(\.strainAPI, PreviewStrainAPI())
        .environment(AppNavigation())
        .environment(AuthSession.previewSignedIn)
}
