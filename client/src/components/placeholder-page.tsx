type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Charts for this view will be wired to gold marts next.
      </div>
    </div>
  );
}
