"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Copy, ListChecks, Loader2, Pencil, Plus, Search, ShoppingBasket, Trash2, X } from "lucide-react";
import { groceryListText, type GroceryItem, type GroceryList } from "@/lib/grocery-list";
import styles from "./grocery-workspace.module.css";

type ItemInput = { ingredient: string; amount: string; unit: string };
type Recipe = { id: string; title: string };

async function jsonRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Dat lukte niet. Probeer het opnieuw.");
  return data as T;
}
function jsonBody(method: string, data: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) };
}
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Dat lukte niet. Probeer het opnieuw."; }

export function GroceryWorkspace() {
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [retry, setRetry] = useState(0);
  const selected = lists.find(list => list.id === selectedId) || lists[0];

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    jsonRequest<GroceryList[]>("/api/recipes/grocery-list", { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setLists(data); })
      .catch(err => { if (!controller.signal.aborted) setError(errorMessage(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  function updateList(id: string, update: (list: GroceryList) => GroceryList) {
    setLists(current => current.map(list => list.id === id ? update(list) : list));
  }
  function selectList(id: string) { setSelectedId(id); setCreating(false); setError(""); }

  return <main className={styles.page}>
    <nav aria-label="Kruimelpad" className={styles.breadcrumb}>
      <Link href="/recipes"><ArrowLeft size={16} aria-hidden="true" />Recepten</Link>
      <span aria-hidden="true">/</span><span>Boodschappen</span>
    </nav>
    <div className={styles.workspace}>
      <aside className={styles.sidebar} aria-label="Je boodschappenlijsten">
        <div className={styles.sidebarHeading}><h2>Jouw lijsten</h2><button type="button" className={styles.iconButton} onClick={() => { setCreating(true); setError(""); }} aria-label="Nieuwe lijst maken"><Plus size={19} /></button></div>
        <div className={styles.desktopLists}>
          {lists.map(list => <button type="button" key={list.id} onClick={() => selectList(list.id)} aria-pressed={!creating && selected?.id === list.id} className={`${styles.listChoice} ${!creating && selected?.id === list.id ? styles.listChoiceActive : ""}`}>
            <span className={styles.choiceName}>{list.name}</span>
            <span className={styles.choiceMeta}>{list.items.filter(item => !item.isChecked).length} nog nodig <ArrowRight size={14} aria-hidden="true" /></span>
          </button>)}
          {!loading && !lists.length ? <p className={styles.sidebarEmpty}>Je lijsten krijgen hier een plek.</p> : null}
          <button type="button" className={styles.newListButton} onClick={() => { setCreating(true); setError(""); }}><Plus size={17} aria-hidden="true" />Nieuwe lijst</button>
        </div>
        <div className={styles.mobileLists}>
          <label className={styles.srOnly} htmlFor="grocery-list-picker">Kies je boodschappenlijst</label>
          <div className={styles.selectWrap}><select id="grocery-list-picker" value={creating ? "" : selected?.id || ""} onChange={event => selectList(event.target.value)} disabled={!lists.length}>
            <option value="" disabled>{creating ? "Nieuwe lijst maken" : "Nog geen lijsten"}</option>
            {lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
          </select><ChevronDown size={16} aria-hidden="true" /></div>
        </div>
        <p className={styles.sidebarNote}><ListChecks size={17} aria-hidden="true" />Van je recepten naar je winkelmand. En alles wat je zelf nog nodig hebt.</p>
      </aside>
      <div className={styles.content}>
        {error ? <div role="alert" className={styles.error}><p>{error}</p>{!lists.length ? <button type="button" onClick={() => setRetry(value => value + 1)}>Opnieuw laden</button> : <button type="button" onClick={() => setError("")} aria-label="Melding sluiten"><X size={17} /></button>}</div> : null}
        {loading ? <div className={styles.skeleton} role="status" aria-label="Boodschappenlijsten laden"><div /><div />{[0,1,2,3].map(i => <div key={i} />)}<span className={styles.srOnly}>Je lijsten worden geladen.</span></div>
          : creating ? <NewList onCancel={lists.length ? () => setCreating(false) : undefined} onCreated={list => { setLists(current => [list, ...current]); setSelectedId(list.id); setCreating(false); setError(""); }} />
          : selected ? <ListEditor key={selected.id} list={selected} update={update => updateList(selected.id, update)} onError={setError} />
          : !error ? <div className={styles.emptyState}><ShoppingBasket size={36} strokeWidth={1.3} aria-hidden="true" /><h1 className={styles.listTitle}>Een goed begin<br />voor je boodschappen.</h1><p>Maak je eigen lijst. Voeg producten toe of neem de ingrediënten van je recepten mee.</p><button className={styles.primaryButton} type="button" onClick={() => setCreating(true)}><Plus size={18} aria-hidden="true" />Maak je eerste lijst</button></div> : null}
      </div>
    </div>
  </main>;
}

function ListEditor({ list, update, onError }: { list: GroceryList; update: (fn: (list: GroceryList) => GroceryList) => void; onError: (message: string) => void }) {
  const [renaming, setRenaming] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [busyItems, setBusyItems] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>();
  const addInput = useRef<HTMLInputElement>(null);
  const done = list.items.filter(item => item.isChecked).length;
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  function markBusy(id: string, busy: boolean) { setBusyItems(current => { const next = new Set(current); if (busy) next.add(id); else next.delete(id); return next; }); }
  async function toggle(item: GroceryItem) {
    markBusy(item.id, true); onError("");
    update(current => ({ ...current, items: current.items.map(row => row.id === item.id ? { ...row, isChecked: !item.isChecked } : row) }));
    try { await jsonRequest(`/api/recipes/grocery-list/items/${item.id}`, jsonBody("PATCH", { isChecked: !item.isChecked })); }
    catch (err) { update(current => ({ ...current, items: current.items.map(row => row.id === item.id ? { ...row, isChecked: item.isChecked } : row) })); onError(errorMessage(err)); }
    finally { markBusy(item.id, false); }
  }
  async function edit(item: GroceryItem, fields: ItemInput) {
    markBusy(item.id, true); onError("");
    try { await jsonRequest(`/api/recipes/grocery-list/items/${item.id}`, jsonBody("PATCH", fields)); update(current => ({ ...current, items: current.items.map(row => row.id === item.id ? { ...row, ...fields } : row) })); }
    finally { markBusy(item.id, false); }
  }
  async function remove(item: GroceryItem) {
    markBusy(item.id, true); onError("");
    try { await jsonRequest(`/api/recipes/grocery-list/items/${item.id}`, { method: "DELETE" }); update(current => ({ ...current, items: current.items.filter(row => row.id !== item.id) })); }
    finally { markBusy(item.id, false); }
  }
  async function copyList() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Klembord niet beschikbaar");
      await navigator.clipboard.writeText(groceryListText(list)); setCopied(true); setCopyFallback(false);
      clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(false), 3000);
    } catch { setCopied(false); setCopyFallback(true); }
  }

  return <>
    <header className={styles.listHeader}>
      {renaming ? <form className={styles.renameForm} onSubmit={async event => {
        event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get("name") || "").trim(); if (!name) return;
        setSavingName(true); onError("");
        try { await jsonRequest(`/api/recipes/grocery-list/${list.id}`, jsonBody("PATCH", { name })); update(current => ({ ...current, name })); setRenaming(false); }
        catch (err) { onError(errorMessage(err)); } finally { setSavingName(false); }
      }}><label htmlFor="list-name">Naam van je lijst</label><input id="list-name" name="name" defaultValue={list.name} maxLength={100} required autoFocus /><div className={styles.formActions}><button className={styles.primaryButton} disabled={savingName} type="submit">{savingName ? "Opslaan…" : "Naam opslaan"}</button><button className={styles.textButton} type="button" disabled={savingName} onClick={() => setRenaming(false)}>Annuleren</button></div></form>
        : <div className={styles.titleRow}><h1 className={styles.listTitle}>{list.name}</h1><button className={styles.iconButton} type="button" onClick={() => setRenaming(true)} aria-label="Naam van de lijst wijzigen"><Pencil size={19} /></button></div>}
      <p className={styles.listMeta}>{list.items.length ? <><span>{list.items.length - done} nog nodig</span><span aria-hidden="true">·</span><span>{done} van {list.items.length} afgevinkt</span></> : "Jouw lijst, klaar om aan te vullen."}</p>
    </header>
    <div className={styles.toolbar}><p>Alles wat je nodig hebt.</p><button type="button" className={styles.secondaryButton} onClick={copyList}>{copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}{copied ? "Gekopieerd" : "Kopieer lijst"}</button></div>
    <span className={styles.srOnly} role="status">{copied ? "Je lijst is gekopieerd. Je kunt ze nu in Notities plakken." : ""}</span>
    {copyFallback ? <div className={styles.copyFallback}><label htmlFor="grocery-copy">Selecteer en kopieer je lijst. Plak ze daarna in je notities.</label><textarea id="grocery-copy" readOnly value={groceryListText(list)} rows={6} autoFocus onFocus={event => event.currentTarget.select()} /><button type="button" className={styles.textButton} onClick={() => setCopyFallback(false)}>Sluiten</button></div> : null}
    <AddItem inputRef={addInput} onAdd={async fields => {
      onError("");
      const item = await jsonRequest<GroceryItem>(`/api/recipes/grocery-list/${list.id}/items`, jsonBody("POST", fields));
      update(current => ({ ...current, items: [...current.items, item] }));
    }} />
    {list.items.length ? <ul className={styles.items} aria-label="Producten op je lijst">{list.items.map(item => <ItemRow key={item.id} item={item} busy={busyItems.has(item.id)} onToggle={() => toggle(item)} onSave={fields => edit(item, fields)} onDelete={() => remove(item)} />)}</ul>
      : <div className={styles.emptyList}><ShoppingBasket size={28} strokeWidth={1.4} aria-hidden="true" /><h2>Wat neem je mee?</h2><p>Voeg hierboven je eerste product toe, bijvoorbeeld brood, fruit of yoghurt.</p><button type="button" className={styles.textButton} onClick={() => addInput.current?.focus()}>Voeg een product toe <ArrowRight size={16} aria-hidden="true" /></button></div>}
    {list.items.length > 0 && done === list.items.length ? <p role="status" className={styles.allDone}><Check size={18} aria-hidden="true" />Alles afgevinkt. Je bent klaar!</p> : null}
    <p className={styles.savedNote}>Wijzigingen worden automatisch bewaard. Kopieer je lijst om ze ook in je notities te gebruiken.</p>
  </>;
}

function AddItem({ onAdd, inputRef }: { onAdd: (fields: ItemInput) => Promise<void>; inputRef: React.RefObject<HTMLInputElement> }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const focusAfterAdd = useRef(false);
  useEffect(() => {
    if (!busy && focusAfterAdd.current) {
      focusAfterAdd.current = false;
      inputRef.current?.focus();
    }
  }, [busy, inputRef]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const ingredient = String(data.get("ingredient") || "").trim(); if (!ingredient) { inputRef.current?.focus(); return; }
    setBusy(true); setError("");
    try { await onAdd({ ingredient, amount: String(data.get("amount") || "").trim(), unit: "" }); form.reset(); focusAfterAdd.current = true; }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  return <div className={styles.addSection}><form className={styles.addForm} onSubmit={submit}>
    <div className={styles.productField}><label htmlFor="add-product">Product toevoegen</label><input ref={inputRef} id="add-product" name="ingredient" placeholder="Bijvoorbeeld avocado" maxLength={150} autoComplete="off" required disabled={busy} /></div>
    <div className={styles.amountField}><label htmlFor="add-amount">Hoeveelheid <span>(optioneel)</span></label><input id="add-amount" name="amount" placeholder="2 stuks" maxLength={40} autoComplete="off" disabled={busy} /></div>
    <button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? <Loader2 size={18} className={styles.spinner} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}<span>{busy ? "Toevoegen…" : "Toevoegen"}</span></button>
  </form>{error ? <p className={styles.fieldError} role="alert">{error}</p> : null}</div>;
}

function ItemRow({ item, busy, onToggle, onSave, onDelete }: { item: GroceryItem; busy: boolean; onToggle: () => void; onSave: (fields: ItemInput) => Promise<void>; onDelete: () => Promise<void> }) {
  const [editing, setEditing] = useState(false), [confirmDelete, setConfirmDelete] = useState(false), [error, setError] = useState("");
  const quantity = [item.amount, item.unit].filter(Boolean).join(" ");
  return <li className={`${styles.item} ${item.isChecked ? styles.itemChecked : ""}`}>
    <div className={styles.itemLine}><label className={styles.checkLabel}><input type="checkbox" checked={item.isChecked} disabled={busy} onChange={onToggle} /><span className={styles.checkVisual} aria-hidden="true">{item.isChecked ? <Check size={16} strokeWidth={2.5} /> : null}</span><span className={styles.itemText}><span className={styles.ingredient}>{item.ingredient}</span>{quantity ? <span className={styles.quantity}>{quantity}</span> : null}</span></label><button type="button" className={styles.iconButton} disabled={busy} onClick={() => { setEditing(!editing); setConfirmDelete(false); setError(""); }} aria-label={`${item.ingredient} aanpassen`} aria-expanded={editing}>{editing ? <X size={17} /> : <Pencil size={17} />}</button></div>
    {editing ? <form className={styles.editForm} onSubmit={async event => {
      event.preventDefault(); const data = new FormData(event.currentTarget); setError("");
      try { await onSave({ ingredient: String(data.get("ingredient") || "").trim(), amount: String(data.get("amount") || "").trim(), unit: String(data.get("unit") || "").trim() }); setEditing(false); }
      catch (err) { setError(errorMessage(err)); }
    }}><div className={styles.editFields}><div><label htmlFor={`ingredient-${item.id}`}>Product</label><input id={`ingredient-${item.id}`} name="ingredient" defaultValue={item.ingredient} maxLength={150} required disabled={busy} autoFocus /></div><div><label htmlFor={`amount-${item.id}`}>Hoeveelheid</label><input id={`amount-${item.id}`} name="amount" defaultValue={item.amount || ""} maxLength={40} disabled={busy} /></div><div><label htmlFor={`unit-${item.id}`}>Eenheid</label><input id={`unit-${item.id}`} name="unit" defaultValue={item.unit || ""} placeholder="g, ml, stuks" maxLength={30} disabled={busy} /></div></div>
      <div className={styles.formActions}><button type="submit" className={styles.primaryButton} disabled={busy}>{busy ? "Opslaan…" : "Opslaan"}</button><button type="button" className={styles.textButton} disabled={busy} onClick={() => setEditing(false)}>Annuleren</button><button type="button" className={`${styles.textButton} ${styles.deleteButton}`} disabled={busy} onClick={() => setConfirmDelete(true)}><Trash2 size={16} aria-hidden="true" />Verwijderen</button></div>
      {confirmDelete ? <div className={styles.deleteConfirmation}><p>{item.ingredient} uit je lijst verwijderen?</p><button type="button" disabled={busy} onClick={async () => { setError(""); try { await onDelete(); } catch (err) { setError(errorMessage(err)); } }}>Ja, verwijderen</button><button type="button" disabled={busy} onClick={() => setConfirmDelete(false)}>Behouden</button></div> : null}
      {error ? <p role="alert" className={styles.fieldError}>{error}</p> : null}
    </form> : null}
  </li>;
}

function NewList({ onCancel, onCreated }: { onCancel?: () => void; onCreated: (list: GroceryList) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [showRecipes, setShowRecipes] = useState(false), [recipes, setRecipes] = useState<Recipe[]>([]), [recipeError, setRecipeError] = useState("");
  const [loadingRecipes, setLoadingRecipes] = useState(false), [search, setSearch] = useState(""), [selected, setSelected] = useState<string[]>([]);
  const [recipeRetry, setRecipeRetry] = useState(0);
  useEffect(() => {
    if (!showRecipes) return;
    const controller = new AbortController(); setLoadingRecipes(true); setRecipeError("");
    jsonRequest<Recipe[]>("/api/recipes?limit=100", { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setRecipes(data); }).catch(err => { if (!controller.signal.aborted) setRecipeError(errorMessage(err)); }).finally(() => { if (!controller.signal.aborted) setLoadingRecipes(false); });
    return () => controller.abort();
  }, [showRecipes, recipeRetry]);
  const matches = recipes.filter(recipe => recipe.title.toLocaleLowerCase("nl").includes(search.toLocaleLowerCase("nl")));
  return <div className={styles.newList}>
    <h1 className={styles.listTitle}>Een nieuwe lijst.</h1><p className={styles.newListIntro}>Geef je lijst een naam die je meteen herkent.</p>
    <form onSubmit={async event => { event.preventDefault(); setBusy(true); setError(""); const name = String(new FormData(event.currentTarget).get("name") || "").trim(); try { const list = await jsonRequest<GroceryList>("/api/recipes/grocery-list", jsonBody("POST", { name, recipeIds: selected })); onCreated(list); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); } }}>
      <label htmlFor="new-list-name">Naam van je lijst</label><input id="new-list-name" name="name" placeholder="Bijvoorbeeld: boodschappen voor deze week" maxLength={100} required autoFocus disabled={busy} />
      <button type="button" className={styles.recipeToggle} aria-expanded={showRecipes} onClick={() => setShowRecipes(!showRecipes)}><Plus size={17} aria-hidden="true" />Ingrediënten uit recepten toevoegen<span>Optioneel</span><ChevronDown size={16} aria-hidden="true" /></button>
      {showRecipes ? <div className={styles.recipePicker}><label htmlFor="recipe-search">Zoek een recept</label><div className={styles.searchField}><Search size={17} aria-hidden="true" /><input id="recipe-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Zoek op naam" type="search" /></div>
        {loadingRecipes ? <p role="status">Recepten laden…</p> : recipeError ? <div className={styles.fieldError} role="alert"><p>{recipeError}</p><button type="button" className={styles.textButton} onClick={() => setRecipeRetry(value => value + 1)}>Opnieuw proberen</button></div> : <div className={styles.recipeResults}>{matches.length ? matches.map(recipe => <label key={recipe.id}><input type="checkbox" checked={selected.includes(recipe.id)} disabled={busy} onChange={event => setSelected(current => event.target.checked ? [...current, recipe.id] : current.filter(id => id !== recipe.id))} /><span>{recipe.title}</span></label>) : <p>{search ? "Geen recepten met deze naam. Probeer een andere zoekterm." : "Er zijn nog geen recepten beschikbaar. Je kunt zelf producten toevoegen."}</p>}</div>}
        {selected.length ? <p className={styles.selectedRecipes}>{selected.length} {selected.length === 1 ? "recept" : "recepten"} geselecteerd</p> : null}
      </div> : null}
      {error ? <p role="alert" className={styles.fieldError}>{error}</p> : null}
      <div className={styles.formActions}><button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? "Lijst maken…" : "Lijst maken"}<ArrowRight size={17} aria-hidden="true" /></button>{onCancel ? <button type="button" className={styles.textButton} onClick={onCancel} disabled={busy}>Annuleren</button> : null}</div>
    </form>
  </div>;
}
