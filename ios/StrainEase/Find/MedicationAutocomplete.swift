import SwiftUI

/// Autocomplete chip input for medications.
/// Shows a text field with saved-suggestions dropdown and
/// renders selected medications as dismissible chips.
struct MedicationAutocomplete: View {
    @Binding var items: [String]
    var suggestions: [String]

    @State private var draft = ""
    @FocusState private var focused: Bool?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Selected chips
            if !items.isEmpty {
                FlowLayout(spacing: 8) {
                    ForEach(items, id: \.self) { name in
                        HStack(spacing: 6) {
                            Text(name)
                                .font(.system(size: 13, weight: .medium))
                            Button {
                                items.removeAll { $0 == name }
                            } label: {
                                Image(systemName: "xmark")
                                    .font(.system(size: 10, weight: .semibold))
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Remove \(name)")
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
                TextField("Add medication", text: $draft)
                    .focused($focused, equals: true)
                    .textInputAutocapitalization(.words)
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
                .accessibilityLabel("Add medication")
            }

            // Suggestions dropdown
            if focused == true && !draft.isEmpty {
                let matches = suggestions.filter { suggestion in
                    suggestion.lowercased().contains(draft.lowercased()) &&
                    !items.contains(where: { $0.lowercased() == suggestion.lowercased() })
                }
                if !matches.isEmpty {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(matches.prefix(5), id: \.self) { match in
                            Button {
                                items.append(match)
                                draft = ""
                                focused = false
                            } label: {
                                Text(match)
                                    .font(.system(size: 14))
                                    .foregroundStyle(Palette.foreground)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 10)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            .buttonStyle(.plain)
                            if match != matches.prefix(5).last {
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
        if !items.contains(where: { $0.caseInsensitiveCompare(trimmed) == .orderedSame }) {
            items.append(trimmed)
        }
        draft = ""
    }
}

#Preview("With items") {
    MedicationAutocomplete(
        items: .constant(["Lexapro", "Ibuprofen"]),
        suggestions: ["Lexapro", "Ibuprofen", "Aspirin", "Tylenol", "Advil"]
    )
    .padding()
    .environment(\.colorScheme, .light)
}

#Preview("Empty") {
    MedicationAutocomplete(
        items: .constant([]),
        suggestions: ["Lexapro", "Ibuprofen"]
    )
    .padding()
}
