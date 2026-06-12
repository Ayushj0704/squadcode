export function SectionHeader(props: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 className="font-display text-sm font-bold tracking-wide text-ink-800">
        {props.title}
      </h2>
      {props.description ? (
        <p className="mt-1 text-sm text-ink-600">{props.description}</p>
      ) : null}
    </div>
  );
}
