import baseConfig from '@theguild/tailwind-config';

export default {
  ...baseConfig,
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme.extend,
      fontFamily: {
        sans: [
          'var(--font-sans, ui-sans-serif)',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
      },
      colors: {
        ...baseConfig.theme.extend.colors,
        primary: baseConfig.theme.extend.colors['hive-yellow'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0', opacity: '0' },
          to: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
          to: { height: '0', opacity: '0' },
        },
        scroll: {
          to: {
            transform: 'translate(calc(-50% - .5rem))',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.5s ease',
        'accordion-up': 'accordion-up 0.5s ease',
        scroll:
          'scroll var(--animation-duration, 40s) var(--animation-direction, forwards) linear infinite',
      },
    },
  },
};
