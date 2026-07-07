const bucket = (difficulty) => {
  if (difficulty < 1150) {
    return {
      label: 'Easy',
      className: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
    };
  }
  if (difficulty < 1550) {
    return {
      label: 'Medium',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    };
  }
  return { label: 'Hard', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' };
};

export const DifficultyBadge = ({ difficulty }) => {
  const { label, className } = bucket(difficulty);
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>
  );
};
