/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./*.js",
    "./utils/*.js"
  ],
  safelist: [
    // 基本レイアウト
    'w-96', 'm-0', 'p-0', 'p-4', 'p-5', 'p-6', 'px-3', 'px-4', 'px-6', 'py-1', 'py-2', 'py-3', 'py-4', 'py-8',
    'min-h-screen', 'min-h-5', 'min-h-32', 'min-h-[1.5rem]', 'min-h-[3rem]',
    'max-w-4xl', 'w-2', 'w-4', 'w-5', 'w-6', 'w-8', 'w-10', 'w-full',
    'h-2', 'h-4', 'h-5', 'h-6', 'h-8', 'h-10',

    // フォント
    'font-sans', 'font-medium', 'font-semibold', 'font-bold',
    'text-xs', 'text-sm', 'text-xl', 'text-2xl',
    'leading-relaxed', 'leading-snug',

    // 色とグラデーション
    'bg-gradient-to-br', 'bg-gradient-to-r',
    'from-slate-50', 'to-blue-50', 'from-slate-700', 'to-slate-600',
    'from-blue-600', 'to-indigo-600', 'from-blue-700', 'to-indigo-700',
    'from-green-500', 'to-emerald-500', 'from-slate-400', 'to-slate-500',
    'bg-clip-text', 'text-transparent',
    'bg-white', 'bg-slate-50', 'bg-slate-100', 'bg-blue-50', 'bg-amber-50', 'bg-green-50', 'bg-red-50',

    // テキストカラー
    'text-white', 'text-slate-600', 'text-slate-700', 'text-blue-600', 'text-amber-600', 'text-amber-700',
    'text-green-600', 'text-red-600',

    // 透明度
    'bg-white/80', 'bg-white/90', 'border-white/20', 'border-white/30', 'border-slate-200/60',
    'opacity-0', 'opacity-50', 'opacity-100',

    // ボーダー
    'border', 'border-b', 'border-t', 'border-slate-200', 'border-slate-300', 'border-blue-200',
    'border-amber-200', 'border-green-200', 'border-red-200',
    'rounded', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full',

    // シャドウとぼかし
    'shadow-lg', 'shadow-xl', 'backdrop-blur-sm',

    // フレックス・グリッド
    'flex', 'flex-shrink-0', 'items-center', 'items-start', 'justify-center', 'justify-end',
    'gap-1', 'gap-2', 'gap-3', 'gap-4', 'space-y-2', 'space-y-4', 'space-y-6',

    // マージン・パディング
    'mb-2', 'mb-3', 'mb-4', 'mt-0.5', 'mt-2', 'mt-3', 'pt-3', 'pt-4',
    'mx-auto', 'mr-2', 'ml-6',

    // ポジション
    'relative', 'absolute', 'sticky', 'top-0', 'top-3', 'right-3', 'inset-0',
    'z-10', 'overflow-hidden',

    // 表示・非表示
    'block', 'hidden', 'inline-flex',

    // インタラクション
    'cursor-pointer', 'cursor-not-allowed',
    'hover:bg-slate-50', 'hover:bg-slate-100', 'hover:bg-slate-200', 'hover:bg-blue-600',
    'hover:text-blue-600', 'hover:border-slate-400', 'hover:border-blue-600',
    'hover:shadow-xl', 'hover:scale-[1.02]', 'hover:rotate-90', 'hover:-translate-y-1',
    'active:scale-[0.98]',
    'group', 'group-hover:rotate-90', 'group-disabled:opacity-50',
    'disabled:from-slate-400', 'disabled:to-slate-500', 'disabled:cursor-not-allowed', 'disabled:transform-none',

    // フォーカス
    'focus:bg-white', 'focus:border-blue-500', 'focus:outline-none', 'focus:ring-2', 'focus:ring-4',
    'focus:ring-blue-200', 'focus:ring-blue-200/50', 'focus:ring-blue-500',

    // トランジション・アニメーション
    'transition-all', 'transition-colors', 'transition-opacity', 'transition-transform',
    'duration-200', 'duration-300', 'transform',
    'animate-pulse', 'animate-spin', 'animate-fadeInUp',

    // リサイズ
    'resize-y',

    // その他
    'whitespace-pre-line', 'break-all', 'no-underline', 'hover:underline',
    'first:mt-0',

    // 新しいクラス
    'card-hover', 'success', 'error', 'show'
  ],
  theme: {
    extend: {
      animation: {
        'fadeInUp': 'fadeInUp 0.5s ease-out',
      },
      backdropBlur: {
        'sm': '4px',
      },
    },
  },
  plugins: [],
}