type Props = { title: string; description?: string };

export function EmptyState({ title, description }: Props) {
  return (
    <div className="text-center text-sm text-muted py-16">
      <div className="mb-1 font-medium">{title}</div>
      {description && <div>{description}</div>}
    </div>
  );
}


