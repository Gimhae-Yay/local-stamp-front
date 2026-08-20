import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export function Breadcrumbs({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <nav className="breadcrumbs" aria-label="현재 위치">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 && <span className="crumb-divider">›</span>}
          {item.to ? <Link to={item.to}>{item.label}</Link> : <strong>{item.label}</strong>}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      {children}
      <div className="page-header-row">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {action && <div className="page-header-action">{action}</div>}
      </div>
    </header>
  );
}

export function StatusPill({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "amber" | "gray" | "blue" | "red";
}) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}

export function PlaceholderImage({
  label = "대표 이미지",
  tall = false,
}: {
  label?: string;
  tall?: boolean;
}) {
  return (
    <div className={`placeholder-image${tall ? " placeholder-tall" : ""}`}>
      <span>{label}</span>
    </div>
  );
}

export function InfoRow({
  label,
  children,
  danger = false,
}: {
  label: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong className={danger ? "danger-text" : ""}>{children}</strong>
    </div>
  );
}

export function Notice({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "red";
}) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}
