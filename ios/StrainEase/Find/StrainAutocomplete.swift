import SwiftUI

/// Autocomplete chip input for tried strains.
/// Shows a text field with strain catalog suggestions and
/// renders selected strains as dismissible chips.
struct StrainAutocomplete: View {
    @Binding var items: [TriedStrainItem]
    @State private var draft = ""
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Selected chips
            if !items.isEmpty {
                FlowLayout(spacing: 8) {
                    ForEach(items) { strain in
                        HStack(spacing: 6) {
                            Text(strain.name)
                                .font(.system(size: 13, weight: .medium))
                            Button {
                                items.removeAll { $0.id == strain.id }
                            } label: {
                                Image(systemName: "xmark")
                                    .font(.system(size: 10, weight: .semibold))
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Remove \(strain.name)")
                        }
                        .foregroundStyle(Palette.primary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(Palette.primary.opacity(0.12), in: Capsule())
                        .overlay(Capsule().strokeBorder(Palette.primary.opacity(0.4), lineWidth: 1))
                    }
                }
            }

            // Input field
            HStack(spacing: 8) {
                TextField("Add strain", text: $draft)
                    .focused($focused, equals: true)
                    .textInputAutocapitalization(.words)
                    .autocorrectionDisabled()
                    .padding(.horizontal, 14)
                    .padding(.vertical, 11)
                    .background(Palette.background, in: Capsule())
                    .overlay(Capsule().strokeBorder(Palette.border, lineWidth: 1))
                    .onSubmit {
                        addItem()
                        focused = nil
                    }
                Button {
                    addItem()
                    focused = nil
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Palette.primaryForeground)
                        .frame(width: 40, height: 40)
                        .background(Palette.primary, in: Circle())
                }
                .buttonStyle(.plain)
                .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                .opacity(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.45 : 1)
                .accessibilityLabel("Add strain")
            }

            // Suggestions dropdown
            if focused && !draft.isEmpty {
                let catalog = StrainCatalog.all
                let matches = catalog.filter { strain in
                    strain.name.lowercased().contains(draft.lowercased()) &&
                    !items.contains(where: { $0.name.lowercased() == strain.name.lowercased() })
                }
                if !matches.isEmpty {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(matches.prefix(5)) { match in
                            Button {
                                let item = TriedStrainItem(
                                    id: match.slug,
                                    name: match.name,
                                    type: match.type.rawValue,
                                    thc: match.thc,
                                    addedAt: Int(Date().timeIntervalSince1970 * 1000)
                                )
                                items.append(item)
                                draft = ""
                                focused = false
                            } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(match.name)
                                            .font(.system(size: 14, weight: .medium))
                                        if !match.thc.isEmpty {
                                            Text(match.thc)
                                                .font(.system(size: 11))
                                                .foregroundStyle(Palette.mutedForeground)
                                        }
                                    }
                                    Spacer()
                                    if let type = match.type.label {
                                        Text(type)
                                            .font(.system(size: 11, weight: .medium))
                                            .foregroundStyle(Palette.mutedForeground)
                                    }
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            .buttonStyle(.plain)
                            if match.id != matches.prefix(5).last?.id {
                                Divider()
                                    .padding(.horizontal, 14)
                            }
                        }
                    }
                    .background(Palette.card, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .strokeBorder(Palette.border, lineWidth: 1)
                    )
                    .shadow(color: .black.opacity(0.08), radius: 8, y: 4)
                }
            }
        }
    }

    private func addItem() {
        let trimmed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let slug = trimmed.lowercased().replacingOccurrences(of: " ", with: "-")
        let item = TriedStrainItem(
            id: slug,
            name: trimmed,
            type: "",
            thc: "",
            addedAt: Int(Date().timeIntervalSince1970 * 1000)
        )
        if !items.contains(where: { $0.name.lowercased() == trimmed.lowercased() }) {
            items.append(item)
        }
        draft = ""
    }
}

#Preview("With items") {
    let items = [
        TriedStrainItem(id: "blue-dream", name: "Blue Dream", type: "sativa", thc: "17-24%", addedAt: 0),
        TriedStrainItem(id: "og-kush", name: "OG Kush", type: "hybrid", thc: "19-26%", addedAt: 0),
    ]
    return StrainAutocomplete(items: .constant(items))
        .padding()
}

#Preview("Empty") {
    StrainAutocomplete(items: .constant([]))
        .padding()
}
