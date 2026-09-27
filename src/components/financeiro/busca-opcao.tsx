"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

type Opcao = { id: string; nome: string };

/** Busca pelo nome e envia o ID esperado pelas ações financeiras existentes. */
export function BuscaOpcaoFinanceira({
  name,
  label,
  options,
  initialId = "",
  placeholder,
  emptyLabel = "Nenhum (opcional)",
}: {
  name: string;
  label: string;
  options: Opcao[];
  initialId?: string;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const listId = useId();
  const initial = options.find((option) => option.id === initialId);
  const [value, setValue] = useState(initialId);
  const [query, setQuery] = useState(initial?.nome ?? "");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(
    () => options.filter((option) => option.nome.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))).slice(0, 30),
    [options, query],
  );

  return (
    <div className="relative min-w-0">
      <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor={listId}>{label}</label>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          id={listId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${listId}-options`}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder={placeholder ?? `Pesquisar ${label.toLowerCase()}...`}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => { setQuery(event.target.value); setValue(""); setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && open && filtered.length) {
              event.preventDefault();
              setValue(filtered[0].id);
              setQuery(filtered[0].nome);
              setOpen(false);
            }
          }}
          className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-9 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
        />
        <button
          type="button"
          aria-label={value ? `Limpar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (value) { setValue(""); setQuery(""); setOpen(true); }
            else setOpen(!open);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-brand"
        >
          {value ? <X size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>
      <input type="hidden" name={name} value={value} />
      {open && (
        <div id={`${listId}-options`} role="listbox" className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-xl">
          <button type="button" role="option" aria-selected={!value} onMouseDown={(event) => event.preventDefault()} onClick={() => { setValue(""); setQuery(""); setOpen(false); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-ink-muted hover:bg-background">{emptyLabel}</button>
          {filtered.map((option) => (
            <button key={option.id} type="button" role="option" aria-selected={value === option.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { setValue(option.id); setQuery(option.nome); setOpen(false); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-brand-soft hover:text-brand">
              {option.nome}
            </button>
          ))}
          {filtered.length === 0 && <p className="px-3 py-2 text-sm text-ink-muted">Nenhum resultado encontrado.</p>}
        </div>
      )}
    </div>
  );
}
