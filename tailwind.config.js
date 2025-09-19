/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Pretendard',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Apple SD Gothic Neo',
          'Noto Sans KR',
          'Malgun Gothic',
          'Apple Color Emoji',
          'Segoe UI Emoji',
        ],
        brand: ['Chonburi', 'ui-serif', 'Georgia', 'Times New Roman', 'serif'],
      },
      colors: {
        accent: "#A7B621",
        fg: "#111111",
        muted: "#666666",
        border: "#e5e7eb",
        bg: "#ffffff",
        bgsubtle: "#f8fafc",
      },
      boxShadow: {
        card: "0 4px 16px rgba(0,0,0,0.06)",
      },
      borderRadius: {
        xl2: "1rem",
      },
      maxWidth: {
        mobile: "480px",
      },
    },
  },
  darkMode: "class",
  plugins: [],
};



