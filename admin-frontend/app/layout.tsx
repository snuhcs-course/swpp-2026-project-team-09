import "./style.css";
export const metadata = { title: "캠퍼스 운영" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
