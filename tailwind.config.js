/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./*.js",
    "./utils/*.js"
  ],
  safelist: [
    'w-96', 'm-0', 'p-4', 'bg-gray-50', 'text-gray-800', 'leading-relaxed', 'font-sans',
    'text-gray-700', 'mb-4', 'pb-2', 'border-b-2', 'border-gray-200', 'text-2xl',
    'bg-white', 'rounded-lg', 'shadow-md', 'mb-4',
    'flex', 'mb-3', 'border-b', 'border-gray-200',
    'flex-1', 'px-3', 'py-2', 'bg-none', 'border-none', 'cursor-pointer', 'text-sm', 'text-gray-600', 'border-b-2', 'border-transparent', 'transition-all', 'duration-200', 'hover:bg-gray-50',
    'text-sm', 'text-gray-600', 'mb-2', 'p-2', 'bg-gray-100', 'rounded', 'min-h-5',
    'text-xs', 'text-gray-600', 'mt-2',
    'tab-content', 'block', 'hidden',
    'mb-3', 'block', 'mb-1', 'font-bold', 'text-gray-700',
    'w-full', 'mb-2', 'p-2', 'border-2', 'border-dashed', 'border-gray-300', 'rounded', 'bg-gray-50', 'cursor-pointer', 'transition-colors', 'duration-200', 'hover:border-blue-600',
    'flex', 'items-center', 'gap-2', 'mb-3',
    'px-3', 'py-2', 'rounded', 'bg-blue-600', 'text-white', 'border-none', 'cursor-pointer', 'text-sm', 'transition-colors', 'duration-200', 'flex-grow', 'hover:bg-blue-700', 'disabled:bg-gray-400', 'disabled:cursor-not-allowed',
    'border-t', 'border-gray-200', 'pt-3', 'mt-3',
    'mt-3', 'text-sm', 'text-blue-600', 'min-h-5', 'whitespace-pre-line', 'leading-snug',
    'mt-2', 'text-sm', 'text-red-600', 'break-all', 'min-h-5', 'whitespace-pre-line', 'leading-snug',
    'flex', 'justify-end', 'mt-3', 'text-xs',
    'text-blue-600', 'no-underline', 'hover:underline',
    'max-w-4xl', 'mx-auto', 'p-5', 'mb-5', 'text-xl', 'mt-6', 'first:mt-0',
    'p-2.5', 'border', 'border-gray-300', 'box-border', 'focus:border-blue-600', 'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-200',
    'bg-white', 'cursor-pointer', 'mb-2.5', 'mr-2', 'm-0',
    'relative', 'min-h-32', 'resize-y', 'absolute', 'right-2.5', 'top-2.5', 'bg-gray-100', 'text-gray-700', 'border-gray-300', 'px-2', 'py-1', 'text-xs', 'hover:bg-gray-200', 'hover:border-gray-400',
    'ml-6', 'mt-6', 'gap-2.5', 'px-4', 'text-green-600', 'font-medium'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}