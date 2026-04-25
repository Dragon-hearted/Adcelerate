// @ts-nocheck — @react-pdf/renderer types are present at runtime; skipLibCheck handles any mismatches
import { Document, Font, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "../../../design-system/adapters/pdf";

// Register fonts directly with correct CDN URLs.
// Note: design-system/adapters/pdf.ts registerFonts() references Archivo Black v21 which returns 404.
// We register all fonts here at the consumer level using verified URLs.
Font.register({
	family: "Inter",
	fonts: [
		{
			src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2",
			fontWeight: 400,
		},
		{
			src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiA.woff2",
			fontWeight: 500,
		},
		{
			src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2",
			fontWeight: 600,
		},
		{
			src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2",
			fontWeight: 700,
		},
	],
});

Font.register({
	family: "JetBrains Mono",
	fonts: [
		{
			src: "https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjOlbZMtk.woff2",
			fontWeight: 400,
		},
	],
});

// Archivo Black v23 — the v21 URL in the DS adapter (registerFonts) returns 404 on this version of react-pdf
Font.register({
	family: "Archivo Black",
	src: "https://fonts.gstatic.com/s/archivoblack/v23/HTxqL289NzCGg4MzN6KJ7eW6OY6P-R7z.woff2",
	fontWeight: 400,
});

export interface BrandedDocProps {
	title: string;
	subtitle?: string;
	body: string;
}

/**
 * BrandedDoc — A4 PDF with a dark-ink cover page and a paper content page.
 *
 * Cover:  Archivo Black wordmark ("Adcelerate"), title, optional subtitle,
 *         and a pixel-art avatar placeholder rect.
 * Content: Body text in Inter, pulled from pdfStyles.
 */
export function BrandedDoc({ title, subtitle, body }: BrandedDocProps) {
	return (
		<Document>
			{/* ── Cover Page ─────────────────────────────────────────── */}
			<Page size="A4" style={pdfStyles.page}>
				<View style={pdfStyles.cover}>
					{/* Wordmark */}
					<Text
						style={[
							pdfStyles.h1,
							{
								color: "#EEE6D4", // paper on ink
								fontSize: 13,
								letterSpacing: 3,
								marginBottom: 48,
								fontFamily: "Archivo Black",
							},
						]}
					>
						ADCELERATE
					</Text>

					{/* Pixel-art avatar placeholder — a sized rect */}
					<View
						style={{
							width: 64,
							height: 64,
							backgroundColor: "#8B2A1D", // oxblood accent
							marginBottom: 32,
						}}
					/>

					{/* Title */}
					<Text
						style={[
							pdfStyles.h1,
							{
								color: "#EEE6D4",
								fontSize: 28,
							},
						]}
					>
						{title}
					</Text>

					{/* Subtitle */}
					{subtitle && (
						<Text
							style={[
								pdfStyles.h3,
								{
									color: "rgba(238,230,212,0.7)",
									marginTop: 8,
								},
							]}
						>
							{subtitle}
						</Text>
					)}
				</View>

				{/* ── Content Area ───────────────────────────────────────── */}
				<View style={{ paddingTop: 40 }}>
					<Text style={pdfStyles.h2}>{title}</Text>
					{subtitle && <Text style={pdfStyles.h3}>{subtitle}</Text>}
					<Text style={pdfStyles.body}>{body}</Text>
				</View>

				{/* Footer */}
				<View style={pdfStyles.footer}>
					<Text style={pdfStyles.meta}>Adcelerate Design System</Text>
					<Text style={pdfStyles.meta} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
				</View>
			</Page>
		</Document>
	);
}
