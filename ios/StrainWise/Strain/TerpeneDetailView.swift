import SwiftUI

/// Sheet shown when a patient taps a curated terpene on the strain
/// detail page. Displays the curated description, characteristic tags,
/// the patient-paired benefits, and the popular strains that share
/// the same terpene (filtered from HomeModel.popular when provided).
struct TerpeneDetailView: View {
    let name: String
    let profile: TerpeneProfile
    let familyStrains: [StrainProfile]
    var onSelectStrain: (StrainProfile) -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                MeshBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        header
                        aboutCard
                        tagsCard
                        familyCard
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle(name.capitalized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(Palette.mutedForeground)
                    }
                    .accessibilityLabel("Close terpene detail")
                }
            }
            .accessibilityIdentifier("terpene.detail")
        }
        .tint(Palette.primary)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Eyebrow(text: "Terpene")
            Text(name.capitalized)
                .font(.system(.largeTitle, design: .serif).weight(.regular))
                .foregroundStyle(Palette.foreground)
            Text(profile.summary)
                .font(.system(size: 15))
                .foregroundStyle(Palette.mutedForeground)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var aboutCard: some View {
        SWCard {
            VStack(alignment: .leading, spacing: 10) {
                SectionLabel("About this terpene")
                Text(profile.description)
                    .font(.system(size: 15))
                    .foregroundStyle(Palette.foreground)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var tagsCard: some View {
        SWCard {
            VStack(alignment: .leading, spacing: 14) {
                SectionLabel("Characteristics")
                FlowLayout(spacing: 8) {
                    ForEach(profile.characteristics, id: \.self) { tag in
                        Text(tag)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Palette.foreground)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(Palette.card.opacity(0.7), in: Capsule())
                            .overlay(Capsule().strokeBorder(Palette.border, lineWidth: 1))
                    }
                }
                SectionLabel("Patients often pair it with")
                FlowLayout(spacing: 8) {
                    ForEach(profile.benefits, id: \.self) { tag in
                        Text(tag)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Palette.primary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(Palette.primary.opacity(0.12), in: Capsule())
                            .overlay(Capsule().strokeBorder(Palette.primary.opacity(0.35), lineWidth: 1))
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var familyCard: some View {
        if familyStrains.isEmpty {
            SWCard {
                VStack(alignment: .leading, spacing: 6) {
                    SectionLabel("Strains in this family")
                    Text("No popular strains on Leafly currently list this terpene.")
                        .font(.system(size: 13))
                        .foregroundStyle(Palette.mutedForeground)
                }
            }
        } else {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    SectionLabel("Strains in this family", index: nil)
                    Spacer(minLength: 0)
                    Text("\(familyStrains.count)")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Palette.mutedForeground)
                }
                VStack(spacing: 10) {
                    ForEach(familyStrains, id: \.id) { strain in
                        Button {
                            onSelectStrain(strain)
                        } label: {
                            TerpeneFamilyRow(profile: strain)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }
}

private struct TerpeneFamilyRow: View {
    let profile: StrainProfile

    var body: some View {
        SWCard {
            HStack(alignment: .center, spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Palette.primary.opacity(0.12))
                        .frame(width: 44, height: 44)
                    Image(systemName: "leaf.fill")
                        .foregroundStyle(Palette.primary)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text(profile.name)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Palette.foreground)
                    if !profile.subtitle.isEmpty {
                        Text(profile.subtitle)
                            .font(.system(size: 12))
                            .foregroundStyle(Palette.mutedForeground)
                    }
                    if let effects = profile.effects?.prefix(3), !effects.isEmpty {
                        FlowLayout(spacing: 6) {
                            ForEach(Array(effects), id: \.name) { effect in
                                Text(effect.name)
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(Palette.foreground)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(Palette.card.opacity(0.6), in: Capsule())
                                    .overlay(Capsule().strokeBorder(Palette.border, lineWidth: 1))
                            }
                        }
                    }
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right")
                    .foregroundStyle(Palette.mutedForeground)
            }
        }
    }
}
