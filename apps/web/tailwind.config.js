/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    preflight: false, // 禁用 Tailwind 的 reset，避免与 Ant Design 冲突
  },
  theme: {
    extend: {
      // 颜色系统 - 集成 Ant Design 主题色
      colors: {
        primary: {
          DEFAULT: '#1890ff',
          hover: '#40a9ff',
          active: '#096dd9',
        },
        success: '#52c41a',
        warning: '#faad14',
        error: '#ff4d4f',
        info: '#1890ff',
        // 文本颜色
        text: {
          primary: 'rgba(0, 0, 0, 0.85)',
          secondary: 'rgba(0, 0, 0, 0.65)',
          tertiary: 'rgba(0, 0, 0, 0.45)',
          disabled: 'rgba(0, 0, 0, 0.25)',
        },
        // 边框颜色
        border: {
          DEFAULT: '#d9d9d9',
          light: '#f0f0f0',
        },
        // 背景颜色
        bg: {
          DEFAULT: '#ffffff',
          secondary: '#fafafa',
          tertiary: '#f5f5f5',
        },
      },
      // 间距系统 (4px 基础单位)
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        xxl: '32px',
        xxxl: '48px',
      },
      // 圆角
      borderRadius: {
        sm: '2px',
        md: '4px',
        lg: '6px',
        xl: '8px',
        xxl: '12px',
      },
      // 字体大小
      fontSize: {
        xs: '12px',
        sm: '14px',
        md: '16px',
        lg: '18px',
        xl: '20px',
        xxl: '24px',
        xxxl: '32px',
      },
      // 字体粗细
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      // 行高
      lineHeight: {
        tight: '1.4',
        normal: '1.5',
        relaxed: '1.75',
      },
      // 阴影
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px rgba(0, 0, 0, 0.02)',
        md: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
        lg: '0 6px 16px -8px rgba(0, 0, 0, 0.08), 0 9px 28px 0 rgba(0, 0, 0, 0.05), 0 12px 48px 16px rgba(0, 0, 0, 0.03)',
      },
      // 布局
      height: {
        header: '64px',
        sider: '220px',
        'sider-collapsed': '80px',
      },
      width: {
        sider: '220px',
        'sider-collapsed': '80px',
        'content-max': '1600px',
      },
      // 过渡动画
      transitionDuration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
      },
      transitionTimingFunction: {
        ease: 'ease',
      },
    },
  },
  plugins: [],
}
