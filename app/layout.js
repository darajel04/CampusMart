import "./globals.css";

export const metadata = {
  title: "CampusMart - Marketplace Mahasiswa",
  description: "Marketplace sederhana untuk kebutuhan mahasiswa.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
