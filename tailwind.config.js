/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'azure-bg': '#0b0f19', // Deep dark blue
                'azure-panel': '#1b202c',
                'azure-border': '#2d3748',
                'azure-accent': '#0078d4', // Azure Blue
            }
        },
    },
    plugins: [],
}
