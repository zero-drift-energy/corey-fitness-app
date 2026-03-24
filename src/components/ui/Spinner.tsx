export default function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div
      className={`${dims[size]} rounded-full border-2 border-current border-t-transparent animate-spin`}
      style={{ color: 'var(--accent)' }}
    />
  );
}
