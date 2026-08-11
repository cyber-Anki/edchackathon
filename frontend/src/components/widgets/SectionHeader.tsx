type Props = {
  eyebrow: string;
  title: string;
  description?: string;
};

export function SectionHeader({ eyebrow, title, description }: Props) {
  return (
    <header className="mb-8 relative z-[1]">
      <div className="font-sans text-eyebrow uppercase text-secondary mb-2">{eyebrow}</div>
      <h1 className="font-sans text-page-title text-primary m-0">{title}</h1>
      {description ? (
        <p className="font-body text-body text-secondary mt-3 mb-0 max-w-[640px]">{description}</p>
      ) : null}
    </header>
  );
}
