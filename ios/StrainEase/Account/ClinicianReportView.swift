import PDFKit
import QuickLook
import SwiftUI

/// Generates the Clinician Report PDF on the server, then previews it
/// in QuickLook so the user can save it to Files, share it, or AirDrop
/// it to their clinician. Mirrors the web `/report` page (which
/// downloads the same PDF) and the Android `ClinicianReportScreen`.
struct ClinicianReportView: View {
    @Environment(\.strainAPI) private var api
    @Environment(AuthSession.self) private var session
    @Environment(\.dismiss) private var dismiss

    @State private var isGenerating = false
    @State private var errorMessage: String?
    @State private var pdfUrl: URL?
    @State private var lastResult: ClinicianReportPdf?

    var body: some View {
        ZStack {
            MeshBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    header
                    if let lastResult {
                        successCard(lastResult)
                    }
                    primaryButton
                    if let errorMessage {
                        errorCard(errorMessage)
                    }
                    descriptionCard
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 32)
            }
        }
        .navigationTitle("Clinician report")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .sheet(isPresented: Binding(
            get: { pdfUrl != nil },
            set: { presented in
                if !presented {
                    pdfUrl = nil
                }
            }
        )) {
            if let pdfUrl {
                QuickLookPreview(url: pdfUrl)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Eyebrow(text: "Share with your clinician")
            Text("Clinician report")
                .font(.system(.largeTitle, design: .serif).weight(.regular))
                .foregroundStyle(Palette.foreground)
            Text("A one-page PDF with your saved conditions, medications, daily check-ins, and relief logs — plus Dr. Kaya's clinical summary in plain language. Built on our servers, identical to the web app.")
                .font(.system(size: 15))
                .foregroundStyle(Palette.mutedForeground)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var primaryButton: some View {
        Button {
            Task { await generate() }
        } label: {
            HStack(spacing: 8) {
                if isGenerating {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(.white)
                } else {
                    Image(systemName: "doc.text.fill")
                }
                Text(isGenerating ? "Generating…" : "Generate PDF")
            }
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Palette.primary, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(isGenerating || session.user == nil)
        .accessibilityIdentifier("report.generate")
    }

    private func successCard(_ result: ClinicianReportPdf) -> some View {
        SWCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundStyle(Palette.primary)
                    Text("Report ready")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Palette.foreground)
                }
                Text("\(result.filename) · \(formatBytes(result.byteLength))")
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.mutedForeground)
                Text(result.kayaIncluded
                    ? "Includes Dr. Kaya's clinical summary."
                    : "Structured snapshot only (Dr. Kaya summary unavailable).")
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.mutedForeground)
                Button {
                    pdfUrl = lastResult.flatMap { _ in pdfUrl }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "eye.fill")
                        Text("Open preview")
                    }
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.primary)
                    .padding(.vertical, 8)
                    .padding(.horizontal, 12)
                    .background(Palette.primary.opacity(0.1), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("report.preview")
            }
        }
    }

    private func errorCard(_ message: String) -> some View {
        SWCard {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(Palette.destructive)
                    Text("Couldn't generate the report")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Palette.foreground)
                }
                Text(message)
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.mutedForeground)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var descriptionCard: some View {
        SWCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("What your clinician will see")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Palette.foreground)
                ForEach(descriptionBullets, id: \.self) { bullet in
                    HStack(alignment: .top, spacing: 8) {
                        Text("•")
                            .foregroundStyle(Palette.primary)
                        Text(bullet)
                            .font(.system(size: 13))
                            .foregroundStyle(Palette.mutedForeground)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
    }

    private var descriptionBullets: [String] {
        [
            "StrainEase logo + your name + generated date header.",
            "Patient facts: display name, email, age context, report window.",
            "Active conditions and current medications.",
            "14-day check-in trend + 4 metric averages.",
            "30-day relief log table + pattern analysis.",
            "Saved strains with the actual note text you wrote.",
            "Dr. Kaya's 2-3 paragraph clinical summary + 3-5 considerations.",
        ]
    }

    @MainActor
    private func generate() async {
        guard !isGenerating else { return }
        isGenerating = true
        errorMessage = nil
        defer { isGenerating = false }
        do {
            let result = try await api.clinicianReportPdf(
                language: StrainAILanguage.preferred,
                includeKayaSummary: true
            )
            let url = try writePdfToTempFile(result: result)
            self.lastResult = result
            self.pdfUrl = url
        } catch {
            self.errorMessage = friendlyMessage(error)
        }
    }

    private func writePdfToTempFile(result: ClinicianReportPdf) throws -> URL {
        let dir = FileManager.default.temporaryDirectory
        let url = dir.appendingPathComponent(result.filename)
        // Overwrite any stale file from a previous run.
        if FileManager.default.fileExists(atPath: url.path) {
            try? FileManager.default.removeItem(at: url)
        }
        try result.pdfData.write(to: url, options: [.atomic])
        return url
    }

    private func friendlyMessage(_ error: Error) -> String {
        if let api = error as? StrainAPIError, let description = api.errorDescription {
            return description
        }
        return error.localizedDescription
    }

    private func formatBytes(_ bytes: Int) -> String {
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useKB, .useMB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(bytes))
    }
}

// MARK: - QuickLook bridge

/// Wraps `QLPreviewController` so the report PDF can be previewed in
/// the standard iOS QuickLook UI. Share, Save to Files, and AirDrop
/// are all available from the share button.
private struct QuickLookPreview: UIViewControllerRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator {
        Coordinator(url: url)
    }

    func makeUIViewController(context: Context) -> UINavigationController {
        let preview = QLPreviewController()
        preview.dataSource = context.coordinator
        return UINavigationController(rootViewController: preview)
    }

    func updateUIViewController(_ uiViewController: UINavigationController, context: Context) {
        context.coordinator.url = url
        if let preview = uiViewController.viewControllers.first as? QLPreviewController {
            preview.reloadData()
        }
    }

    final class Coordinator: NSObject, QLPreviewControllerDataSource {
        var url: URL
        init(url: URL) { self.url = url }

        func numberOfPreviewItems(in controller: QLPreviewController) -> Int { 1 }

        func previewController(
            _ controller: QLPreviewController,
            previewItemAt index: Int
        ) -> QLPreviewItem {
            url as QLPreviewItem
        }
    }
}
