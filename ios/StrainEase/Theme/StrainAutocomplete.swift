import SwiftUI

/// Autocomplete for tried strains with photo, THC, and type display.
struct StrainAutocomplete: View {
    @Binding var items: [TriedStrainItem]
    var onAdd: ((TriedStrainItem) -> Void)?

    @State private var query = ""
    @State private var isEditing = false
    @FocusState private var focused: Bool

    private var matches: [StrainProfile] {
        guard query.count >= 2 else { return [] }
        let lowercased = query.lowercased()
        return Array(StrainCatalog.all.filter { $0.name.localizedCaseInsensitiveContains(lowercased) }.prefix(8))
    }

    private var showDropdown: Bool {
        isEditing && !matches.isEmpty
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Chips
            if !items.isEmpty {
                FlowLayout(spacing: 8) {
                    ForEach(items, id: \.id) { item in
                        TriedStrainChip(item: item) {
                            withAnimation(.snappy(duration: 0.25)) {
                                items.removeAll { $0.id == item.id }
                            }
                        }
                    }
                }

                // Clear all button
                if items.count > 1 {
                    Button {
                        withAnimation(.snappy(duration: 0.25)) {
                            items.removeAll()
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "xmark")
                                .font(.system(size: 10, weight: .semibold))
                            Text("Clear all")
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundStyle(Palette.mutedForeground)
                    }
                    .buttonStyle(.plain)
                }
            }

            // Input with dropdown
            HStack(spacing: 8) {
                ZStack(alignment: .leading) {
                    if query.isEmpty {
                        Text("Search strains you've tried…")
                            .font(.system(size: 15))
                            .foregroundStyle(Palette.mutedForeground.opacity(0.6))
                            .padding(.leading, 14)
                    }
                    TextField("", text: $query)
                        .focused($focused)
                        .textInputAutocapitalization(.words)
                        .autocorrectionDisabled()
                        .onChange(of: focused) { _, newValue in
                            isEditing = newValue
                        }
                        .onChange(of: query) { _, _ in
                            isEditing = true
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .background(Palette.card, in: Capsule())
                        .overlay(
                            Capsule().strokeBorder(showDropdown ? Palette.primary.opacity(0.5) : Palette.border, lineWidth: 1)
                        )
                }

                Image(systemName: "plus")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.primaryForeground)
                    .frame(width: 40, height: 40)
                    .background(Palette.primary, in: Circle())
            }

            // Dropdown
            if showDropdown {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(matches, id: \.slug) { profile in
                        Button {
                            selectStrain(profile)
                        } label: {
                            HStack(spacing: 12) {
                                if let imageUrl = profile.imageUrl, let url = URL(string: imageUrl) {
                                    AsyncImage(url: url) { image in
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        Color.gray.opacity(0.2)
                                    }
                                    .frame(width: 44, height: 44)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                                } else {
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(Palette.muted)
                                        .frame(width: 44, height: 44)
                                }

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(profile.name)
                                        .font(.system(size: 15, weight: .medium))
                                        .foregroundStyle(Palette.foreground)
                                    HStack(spacing: 6) {
                                        if let thc = profile.thcRange {
                                            Text(thc)
                                                .font(.system(size: 12, weight: .semibold))
                                                .foregroundStyle(Palette.primary.opacity(0.8))
                                        }
                                        if let type = profile.type {
                                            Text(type.rawValue.capitalized)
                                                .font(.system(size: 12))
                                                .foregroundStyle(Palette.mutedForeground)
                                        }
                                    }
                                }

                                Spacer()

                                Image(systemName: "plus")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Palette.mutedForeground)
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)

                        if profile.slug != matches.last?.slug {
                            Divider()
                                .padding(.leading, 70)
                        }
                    }
                }
                .background(Palette.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(Palette.border, lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.08), radius: 8, y: 4)
            }
        }
    }

    private func selectStrain(_ profile: StrainProfile) {
        // Check for duplicates
        if items.contains(where: { $0.name.localizedCaseInsensitiveCompare(profile.name) == .orderedSame }) {
            query = ""
            isEditing = false
            focused = false
            return
        }

        let item = TriedStrainItem(
            id: UUID().uuidString,
            name: profile.name,
            type: profile.type?.rawValue ?? "hybrid",
            thc: profile.thcRange ?? "",
            addedAt: Int(Date().timeIntervalSince1970 * 1000)
        )

        withAnimation(.snappy(duration: 0.25)) {
            items.insert(item, at: 0)
        }
        onAdd?(item)
        query = ""
        isEditing = false
        focused = false
    }
}

struct TriedStrainChip: View {
    let item: TriedStrainItem
    var onRemove: () -> Void

    var body: some View {
        HStack(spacing: 6) {
            if !item.thc.isEmpty {
                Text(item.thc)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Palette.primary.opacity(0.7))
            }
            Text(item.name)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.primary)
            if !item.type.isEmpty {
                Text("(\(item.type))")
                    .font(.system(size: 10))
                    .foregroundStyle(Palette.primary.opacity(0.6))
            }

            Button(action: onRemove) {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Palette.primary.opacity(0.85))
                    .padding(4)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Palette.primary.opacity(0.08), in: Capsule())
        .overlay(
            Capsule()
                .strokeBorder(Palette.primary.opacity(0.3), lineWidth: 1)
        )
    }
}

/// Medication autocomplete with simple text input.
struct MedicationAutocomplete: View {
    @Binding var items: [String]
    var suggestions: [String] = []
    var onAdd: ((String) -> Void)?

    @State private var query = ""
    @State private var isEditing = false
    @FocusState private var focused: Bool

    private var matches: [String] {
        guard query.count >= 1 else { return Array(suggestions.prefix(6)) }
        return suggestions.filter { $0.localizedCaseInsensitiveContains(query) }.prefix(6).map { $0 }
    }

    private var showDropdown: Bool {
        isEditing && !matches.isEmpty && !query.isEmpty
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Chips
            if !items.isEmpty {
                FlowLayout(spacing: 8) {
                    ForEach(items, id: \.self) { name in
                        MedicationChip(name: name) {
                            withAnimation(.snappy(duration: 0.25)) {
                                items.removeAll { $0.localizedCaseInsensitiveCompare(name) == .orderedSame }
                            }
                        }
                    }
                }

                // Clear all button
                if items.count > 1 {
                    Button {
                        withAnimation(.snappy(duration: 0.25)) {
                            items.removeAll()
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "xmark")
                                .font(.system(size: 10, weight: .semibold))
                            Text("Clear all")
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundStyle(Palette.mutedForeground)
                    }
                    .buttonStyle(.plain)
                }
            }

            // Input with dropdown
            HStack(spacing: 8) {
                ZStack(alignment: .leading) {
                    if query.isEmpty {
                        Text("Add a medication…")
                            .font(.system(size: 15))
                            .foregroundStyle(Palette.mutedForeground.opacity(0.6))
                            .padding(.leading, 14)
                    }
                    TextField("", text: $query)
                        .focused($focused)
                        .textInputAutocapitalization(.words)
                        .autocorrectionDisabled()
                        .onSubmit {
                            addMedication()
                        }
                        .onChange(of: focused) { _, newValue in
                            isEditing = newValue
                        }
                        .onChange(of: query) { _, _ in
                            isEditing = true
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .background(Palette.card, in: Capsule())
                        .overlay(
                            Capsule().strokeBorder(showDropdown ? Palette.primary.opacity(0.5) : Palette.border, lineWidth: 1)
                        )
                }

                Button {
                    addMedication()
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Palette.primaryForeground)
                        .frame(width: 40, height: 40)
                        .background(Palette.primary, in: Circle())
                }
                .buttonStyle(.plain)
            }

            // Dropdown
            if showDropdown {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(matches.enumerated()), id: \.element) { index, suggestion in
                        let isSelected = items.contains { $0.localizedCaseInsensitiveCompare(suggestion) == .orderedSame }

                        Button {
                            if !isSelected {
                                withAnimation(.snappy(duration: 0.25)) {
                                    items.insert(suggestion, at: 0)
                                }
                                onAdd?(suggestion)
                            }
                            query = ""
                            isEditing = false
                            focused = false
                        } label: {
                            HStack {
                                Text(suggestion)
                                    .font(.system(size: 15))
                                    .foregroundStyle(isSelected ? Palette.mutedForeground : Palette.foreground)

                                Spacer()

                                if isSelected {
                                    Text("Already added")
                                        .font(.system(size: 12))
                                        .foregroundStyle(Palette.mutedForeground)
                                }
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .disabled(isSelected)

                        if index < matches.count - 1 {
                            Divider()
                                .padding(.leading, 14)
                        }
                    }
                }
                .background(Palette.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(Palette.border, lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.08), radius: 8, y: 4)
            }
        }
    }

    private func addMedication() {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        if items.contains(where: { $0.localizedCaseInsensitiveCompare(trimmed) == .orderedSame }) {
            query = ""
            isEditing = false
            focused = false
            return
        }
        withAnimation(.snappy(duration: 0.25)) {
            items.insert(trimmed, at: 0)
        }
        onAdd?(trimmed)
        query = ""
        isEditing = false
        focused = false
    }
}

struct MedicationChip: View {
    let name: String
    var onRemove: () -> Void

    var body: some View {
        HStack(spacing: 6) {
            Text(name)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.primary)

            Button(action: onRemove) {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Palette.primary.opacity(0.85))
                    .padding(4)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Palette.primary.opacity(0.08), in: Capsule())
        .overlay(
            Capsule()
                .strokeBorder(Palette.primary.opacity(0.3), lineWidth: 1)
        )
    }
}
