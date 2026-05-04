import "./globals.css";

export const metadata = {
  title: "Startup Simulator | Build. Scale. Survive.",
  description: "A multiplayer pixel-art simulation where dev teams run a startup together — balancing growth, stability, and chaos in real time.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <script src="https://project.easyenterpriseos.com/widget/v1.js?v=9" data-token="f4eacd986d7b5a4ed6bbc23513ce99682b90817bfd957f00" defer></script>
        {children}
      </body>
    </html>
  );
}
