/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#0B0F14",
                surface: "#111827",
                card: "#1A2230",
                "card-hover": "#212B3B",
                accent: {
                    blue: "#4DA3FF",
                    teal: "#00C2A8",
                    red: "#FF4D4F",
                },
                text: {
                    primary: "#E6EDF3",
                    secondary: "#9AA4B2",
                    muted: "#6B7280",
                }
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.5rem',
            },
            animation: {
                'glow-pulse': 'glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                glow: {
                    '0%, 100%': { 'box-shadow': '0 0 5px rgba(77, 163, 255, 0.2)' },
                    '50%': { 'box-shadow': '0 0 20px rgba(77, 163, 255, 0.4)' },
                }
            }
        },
    },
    plugins: [],
}
