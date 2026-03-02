"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatePanel } from "@/components/shared/state-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ApiState, apiFetch } from "@/lib/api";

interface ProfileItem {
  id: string;
  fullName: string;
  bio: string;
  city: string;
  coverage: string[];
}

interface AvailabilityItem {
  id: string;
}

interface ServiceItem {
  id: string;
  slug: string;
  title: string;
  basePrice: number;
  durationMinutes: number;
  extras: string[];
  active: boolean;
  updatedAt: string;
}

interface BookingItem {
  id: string;
  serviceId: string;
  status: string;
}

interface ReviewSummaryResponse {
  items: Array<{ bookingId: string; rating: number }>;
}

interface AnalyticsEventItem {
  name: string;
  payload: Record<string, unknown>;
}

interface ServiceMetric {
  views: number;
  reservations: number;
  conversionPct: number;
  averageRating: number | null;
  cancellationPct: number;
}

interface ExtraChip {
  id: string;
  label: string;
  price: number | null;
}

interface ServiceDraft {
  slug: string;
  title: string;
  durationMinutes: number;
  basePrice: number;
  active: boolean;
  extras: ExtraChip[];
  pendingExtraLabel: string;
  pendingExtraPrice: string;
}

interface CreateDraft {
  slug: string;
  title: string;
  durationMinutes: number;
  basePrice: number;
  active: boolean;
  extras: ExtraChip[];
  pendingExtraLabel: string;
  pendingExtraPrice: string;
}

interface ServiceTemplate {
  id: string;
  label: string;
  slug: string;
  title: string;
  durationMinutes: number;
  basePrice: number;
  extras: Array<{ label: string; price: number | null }>;
}

const templates: ServiceTemplate[] = [
  {
    id: "home-basic",
    label: "Limpieza hogar básica",
    slug: "limpieza-hogar-basica",
    title: "Limpieza de hogar básica",
    durationMinutes: 120,
    basePrice: 90000,
    extras: [
      { label: "Insumos incluidos", price: 15000 },
      { label: "Ventanas interiores", price: 12000 }
    ]
  },
  {
    id: "home-deep",
    label: "Limpieza profunda",
    slug: "limpieza-profunda",
    title: "Limpieza profunda de hogar",
    durationMinutes: 180,
    basePrice: 140000,
    extras: [
      { label: "Horno y campana", price: 30000 },
      { label: "Nevera interior", price: 18000 }
    ]
  },
  {
    id: "garden-basic",
    label: "Jardinería básica",
    slug: "jardineria-basica",
    title: "Mantenimiento básico de jardín",
    durationMinutes: 150,
    basePrice: 110000,
    extras: [
      { label: "Retiro de residuos", price: 25000 },
      { label: "Fertilizante", price: 20000 }
    ]
  }
];

function parseExtra(value: string, index: number): ExtraChip {
  const [labelRaw, priceRaw] = value.split("::");
  const label = labelRaw.trim();
  const parsedPrice = priceRaw !== undefined ? Number(priceRaw) : NaN;

  return {
    id: `${label || "extra"}-${index}`,
    label: label || `Extra ${index + 1}`,
    price: Number.isFinite(parsedPrice) ? parsedPrice : null
  };
}

function serializeExtras(extras: ExtraChip[]) {
  return extras.map((extra) =>
    extra.price !== null ? `${extra.label.trim()}::${Math.max(0, Math.round(extra.price))}` : extra.label.trim()
  );
}

function toDraft(service: ServiceItem): ServiceDraft {
  return {
    slug: service.slug,
    title: service.title,
    durationMinutes: service.durationMinutes,
    basePrice: service.basePrice,
    active: service.active,
    extras: service.extras.map(parseExtra),
    pendingExtraLabel: "",
    pendingExtraPrice: ""
  };
}

function createEmptyDraft(): CreateDraft {
  return {
    slug: "",
    title: "",
    durationMinutes: 120,
    basePrice: 90000,
    active: true,
    extras: [],
    pendingExtraLabel: "",
    pendingExtraPrice: ""
  };
}

export default function ProviderServicesPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [feedback, setFeedback] = useState("Gestiona y publica tu catálogo.");
  const [providerId, setProviderId] = useState("");
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ServiceDraft>>({});
  const [metrics, setMetrics] = useState<Record<string, ServiceMetric>>({});
  const [publishChecklist, setPublishChecklist] = useState<string[]>([]);
  const [dirtyIds, setDirtyIds] = useState<string[]>([]);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(createEmptyDraft());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"updated" | "title" | "priceAsc" | "priceDesc">("updated");
  const [previewServiceId, setPreviewServiceId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const toastTimeout = useRef<number | null>(null);

  const canPublish = publishChecklist.length === 0;

  function notify(kind: "success" | "error", message: string) {
    setToast({ kind, message });
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }
    toastTimeout.current = window.setTimeout(() => setToast(null), 2800);
  }

  function markBusy(serviceId: string, busy: boolean) {
    setBusyIds((current) =>
      busy ? (current.includes(serviceId) ? current : [...current, serviceId]) : current.filter((id) => id !== serviceId)
    );
  }

  function markDirty(serviceId: string) {
    setDirtyIds((current) => (current.includes(serviceId) ? current : [...current, serviceId]));
  }

  function clearDirty(serviceId: string) {
    setDirtyIds((current) => current.filter((id) => id !== serviceId));
  }

  function computeChecklist(profile: ProfileItem, availability: AvailabilityItem[]) {
    const checklist: string[] = [];
    if (!profile.fullName || profile.fullName.trim().length < 2) {
      checklist.push("Completa nombre comercial del perfil.");
    }
    if (!profile.bio || profile.bio.trim().length < 20) {
      checklist.push("Completa una biografía mínima de 20 caracteres.");
    }
    if (!profile.city || !profile.city.trim()) {
      checklist.push("Define ciudad principal de operación.");
    }
    if (!Array.isArray(profile.coverage) || profile.coverage.length === 0) {
      checklist.push("Define al menos una zona de cobertura.");
    }
    if (availability.length === 0) {
      checklist.push("Configura disponibilidad semanal antes de publicar servicios.");
    }

    setPublishChecklist(checklist);
  }

  function computeMetrics(
    services: ServiceItem[],
    bookings: BookingItem[],
    reviewItems: Array<{ bookingId: string; rating: number }>,
    events: AnalyticsEventItem[]
  ) {
    const bookingsByService = new Map<string, { reservations: number; cancelled: number }>();
    const bookingServiceById = new Map<string, string>();
    for (const booking of bookings) {
      bookingServiceById.set(booking.id, booking.serviceId);
      const current = bookingsByService.get(booking.serviceId) ?? { reservations: 0, cancelled: 0 };
      current.reservations += 1;
      if (booking.status === "cancelled") {
        current.cancelled += 1;
      }
      bookingsByService.set(booking.serviceId, current);
    }

    const ratingsByService = new Map<string, number[]>();
    for (const review of reviewItems) {
      const serviceId = bookingServiceById.get(review.bookingId);
      if (!serviceId) {
        continue;
      }
      const current = ratingsByService.get(serviceId) ?? [];
      current.push(review.rating);
      ratingsByService.set(serviceId, current);
    }

    const viewsByService = new Map<string, number>();
    for (const event of events) {
      if (event.name !== "service_view") {
        continue;
      }
      const serviceId = typeof event.payload.serviceId === "string" ? event.payload.serviceId : "";
      if (!serviceId) {
        continue;
      }
      viewsByService.set(serviceId, (viewsByService.get(serviceId) ?? 0) + 1);
    }

    const result: Record<string, ServiceMetric> = {};
    for (const service of services) {
      const reservations = bookingsByService.get(service.id)?.reservations ?? 0;
      const cancelled = bookingsByService.get(service.id)?.cancelled ?? 0;
      const views = viewsByService.get(service.id) ?? 0;
      const ratings = ratingsByService.get(service.id) ?? [];

      result[service.id] = {
        views,
        reservations,
        conversionPct: views > 0 ? (reservations / views) * 100 : 0,
        averageRating: ratings.length > 0 ? ratings.reduce((sum, current) => sum + current, 0) / ratings.length : null,
        cancellationPct: reservations > 0 ? (cancelled / reservations) * 100 : 0
      };
    }

    setMetrics(result);
  }

  async function loadPanel(profileId: string, profileUserId: string) {
    try {
      const [services, availability, bookings, reviews, events] = await Promise.all([
        apiFetch<ServiceItem[]>(`/catalog/services?providerId=${profileId}`),
        apiFetch<AvailabilityItem[]>(`/availability/provider/${profileId}`),
        apiFetch<BookingItem[]>("/bookings/mine"),
        apiFetch<ReviewSummaryResponse>(`/reviews/provider/${profileId}?limit=100`).catch(() => ({
          items: []
        })),
        apiFetch<AnalyticsEventItem[]>("/analytics/events/mine?limit=2000").catch(() => [])
      ]);

      setItems(services);
      setDrafts(Object.fromEntries(services.map((item) => [item.id, toDraft(item)])));
      setDirtyIds([]);
      computeChecklist(
        {
          id: profileId,
          fullName: "",
          bio: "",
          city: "",
          coverage: []
        },
        availability
      );

      // Reload full profile details for checklist quality.
      const profile = await apiFetch<ProfileItem>(`/providers/user/${profileUserId}`);
      computeChecklist(profile, availability);
      computeMetrics(services, bookings, reviews.items, events);

      setState(services.length === 0 ? "empty" : "success");
      setFeedback(services.length === 0 ? "Aún no tienes servicios creados." : "Catálogo cargado correctamente.");
    } catch {
      setState("error");
      setFeedback("No fue posible cargar catálogo y métricas del proveedor.");
      notify("error", "Error cargando datos del panel.");
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const userId = localStorage.getItem("homly_user_id") ?? "";
        if (!userId) {
          setState("error");
          setFeedback("No se encontró sesión de proveedor.");
          return;
        }

        const profile = await apiFetch<ProfileItem>(`/providers/user/${userId}`);
        setProviderId(profile.id);
        await loadPanel(profile.id, userId);
      } catch {
        setState("error");
        setFeedback("No se pudo cargar el perfil del proveedor.");
        notify("error", "Error cargando perfil del proveedor.");
      }
    }

    void bootstrap();

    return () => {
      if (toastTimeout.current) {
        window.clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    setCreateDraft({
      slug: template.slug,
      title: template.title,
      durationMinutes: template.durationMinutes,
      basePrice: template.basePrice,
      active: canPublish,
      extras: template.extras.map((extra, index) => ({
        id: `${template.id}-${index}`,
        label: extra.label,
        price: extra.price
      })),
      pendingExtraLabel: "",
      pendingExtraPrice: ""
    });

    notify("success", `Plantilla aplicada: ${template.label}`);
  }

  function slugExists(slug: string, currentId?: string) {
    const normalized = slug.trim().toLowerCase();
    return items.some((item) => item.id !== currentId && item.slug.trim().toLowerCase() === normalized);
  }

  function validateDraft(draft: ServiceDraft | CreateDraft, currentId?: string) {
    if (!draft.slug.trim() || !draft.title.trim()) {
      return "Slug y título son obligatorios.";
    }
    if (slugExists(draft.slug, currentId)) {
      return "El slug ya existe en otro servicio.";
    }
    if (!Number.isFinite(draft.durationMinutes) || draft.durationMinutes < 30 || draft.durationMinutes > 600) {
      return "La duración debe estar entre 30 y 600 minutos.";
    }
    if (!Number.isFinite(draft.basePrice) || draft.basePrice < 0) {
      return "El precio base debe ser un número positivo.";
    }
    if (draft.active && !canPublish) {
      return "No puedes publicar servicios hasta completar el checklist de publicación.";
    }

    return null;
  }

  async function createService() {
    if (!providerId) {
      return;
    }

    const validationError = validateDraft(createDraft);
    if (validationError) {
      setState("error");
      setFeedback(validationError);
      notify("error", validationError);
      return;
    }

    setState("loading");
    try {
      await apiFetch("/catalog/services", {
        method: "POST",
        body: JSON.stringify({
          providerId,
          slug: createDraft.slug.trim(),
          title: createDraft.title.trim(),
          durationMinutes: Number(createDraft.durationMinutes),
          basePrice: Number(createDraft.basePrice),
          extras: serializeExtras(createDraft.extras),
          active: createDraft.active
        })
      });

      const userId = localStorage.getItem("homly_user_id") ?? "";
      await loadPanel(providerId, userId);
      setCreateDraft(createEmptyDraft());
      setState("success");
      setFeedback("Servicio creado correctamente.");
      notify("success", "Servicio creado.");
    } catch {
      setState("error");
      setFeedback("No fue posible crear el servicio.");
      notify("error", "No se pudo crear el servicio.");
    }
  }

  function updateDraft(serviceId: string, patch: Partial<ServiceDraft>) {
    setDrafts((current) => ({
      ...current,
      [serviceId]: {
        ...current[serviceId],
        ...patch
      }
    }));
    markDirty(serviceId);
  }

  function addDraftExtra(serviceId: string) {
    const draft = drafts[serviceId];
    if (!draft) {
      return;
    }

    const label = draft.pendingExtraLabel.trim();
    if (!label) {
      notify("error", "Debes ingresar nombre del extra.");
      return;
    }

    const parsedPrice = draft.pendingExtraPrice.trim() ? Number(draft.pendingExtraPrice) : NaN;
    const price = Number.isFinite(parsedPrice) ? Math.max(0, Math.round(parsedPrice)) : null;

    updateDraft(serviceId, {
      extras: [...draft.extras, { id: `${serviceId}-${Date.now()}`, label, price }],
      pendingExtraLabel: "",
      pendingExtraPrice: ""
    });
  }

  function removeDraftExtra(serviceId: string, extraId: string) {
    const draft = drafts[serviceId];
    if (!draft) {
      return;
    }
    updateDraft(serviceId, {
      extras: draft.extras.filter((extra) => extra.id !== extraId)
    });
  }

  function addCreateExtra() {
    const label = createDraft.pendingExtraLabel.trim();
    if (!label) {
      notify("error", "Debes ingresar nombre del extra.");
      return;
    }

    const parsedPrice = createDraft.pendingExtraPrice.trim() ? Number(createDraft.pendingExtraPrice) : NaN;
    const price = Number.isFinite(parsedPrice) ? Math.max(0, Math.round(parsedPrice)) : null;

    setCreateDraft((current) => ({
      ...current,
      extras: [...current.extras, { id: `create-${Date.now()}`, label, price }],
      pendingExtraLabel: "",
      pendingExtraPrice: ""
    }));
  }

  function removeCreateExtra(extraId: string) {
    setCreateDraft((current) => ({
      ...current,
      extras: current.extras.filter((extra) => extra.id !== extraId)
    }));
  }

  async function saveService(serviceId: string) {
    const draft = drafts[serviceId];
    if (!draft) {
      return false;
    }

    const validationError = validateDraft(draft, serviceId);
    if (validationError) {
      setState("error");
      setFeedback(validationError);
      notify("error", validationError);
      return false;
    }

    markBusy(serviceId, true);
    try {
      await apiFetch(`/catalog/services/${serviceId}`, {
        method: "PATCH",
        body: JSON.stringify({
          slug: draft.slug.trim(),
          title: draft.title.trim(),
          durationMinutes: Number(draft.durationMinutes),
          basePrice: Number(draft.basePrice),
          active: draft.active,
          extras: serializeExtras(draft.extras)
        })
      });

      clearDirty(serviceId);
      return true;
    } catch {
      notify("error", `No se pudo guardar ${draft.title}.`);
      return false;
    } finally {
      markBusy(serviceId, false);
    }
  }

  async function saveAllDirty() {
    if (dirtyIds.length === 0) {
      return;
    }

    setState("loading");
    let successCount = 0;
    for (const serviceId of dirtyIds) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await saveService(serviceId);
      if (ok) {
        successCount += 1;
      }
    }

    const userId = localStorage.getItem("homly_user_id") ?? "";
    await loadPanel(providerId, userId);

    if (successCount === dirtyIds.length) {
      setState("success");
      setFeedback("Cambios guardados correctamente.");
      notify("success", `Se guardaron ${successCount} servicios.`);
    } else {
      setState("error");
      setFeedback("Algunos servicios no se pudieron guardar.");
      notify("error", `Solo se guardaron ${successCount} de ${dirtyIds.length}.`);
    }
  }

  async function deleteService(serviceId: string) {
    const service = items.find((item) => item.id === serviceId);
    const confirmed = window.confirm(`¿Eliminar el servicio \"${service?.title ?? ""}\"? Esta acción no se puede deshacer.`);
    if (!confirmed) {
      return;
    }

    markBusy(serviceId, true);
    setState("loading");
    try {
      await apiFetch(`/catalog/services/${serviceId}`, { method: "DELETE" });
      const userId = localStorage.getItem("homly_user_id") ?? "";
      await loadPanel(providerId, userId);
      setState("success");
      setFeedback("Servicio eliminado.");
      notify("success", "Servicio eliminado.");
    } catch {
      setState("error");
      setFeedback("No se pudo eliminar el servicio.");
      notify("error", "No se pudo eliminar el servicio.");
    } finally {
      markBusy(serviceId, false);
    }
  }

  async function duplicateService(serviceId: string) {
    const base = drafts[serviceId];
    if (!base) {
      return;
    }

    let nextSlug = `${base.slug}-copia`;
    let suffix = 2;
    while (slugExists(nextSlug)) {
      nextSlug = `${base.slug}-copia-${suffix}`;
      suffix += 1;
    }

    setState("loading");
    try {
      await apiFetch("/catalog/services", {
        method: "POST",
        body: JSON.stringify({
          providerId,
          slug: nextSlug,
          title: `${base.title} (Copia)`,
          durationMinutes: base.durationMinutes,
          basePrice: base.basePrice,
          active: false,
          extras: serializeExtras(base.extras)
        })
      });

      const userId = localStorage.getItem("homly_user_id") ?? "";
      await loadPanel(providerId, userId);
      setState("success");
      setFeedback("Servicio duplicado correctamente.");
      notify("success", "Servicio duplicado.");
    } catch {
      setState("error");
      setFeedback("No se pudo duplicar el servicio.");
      notify("error", "No se pudo duplicar el servicio.");
    }
  }

  function quickToggleActive(serviceId: string, checked: boolean) {
    if (checked && !canPublish) {
      notify("error", "Completa checklist de publicación para activar servicios.");
      return;
    }
    updateDraft(serviceId, { active: checked });
  }

  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const draft = drafts[item.id] ?? toDraft(item);
      const matchesSearch =
        draft.title.toLowerCase().includes(search.toLowerCase()) || draft.slug.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" ? draft.active : !draft.active);

      return matchesSearch && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      const draftA = drafts[a.id] ?? toDraft(a);
      const draftB = drafts[b.id] ?? toDraft(b);

      if (sortBy === "title") {
        return draftA.title.localeCompare(draftB.title);
      }

      if (sortBy === "priceAsc") {
        return draftA.basePrice - draftB.basePrice;
      }

      if (sortBy === "priceDesc") {
        return draftB.basePrice - draftA.basePrice;
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return sorted;
  }, [items, drafts, search, statusFilter, sortBy]);

  const previewDraft = previewServiceId ? drafts[previewServiceId] : null;

  return (
    <main className="container py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Servicios</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Administra catálogo con filtros, edición por lotes, métricas y publicación controlada.
      </p>

      {toast ? (
        <div className="fixed right-4 top-20 z-50">
          <Card className={toast.kind === "success" ? "border-green-500" : "border-red-500"}>
            <CardContent className="px-4 py-3 text-sm">{toast.message}</CardContent>
          </Card>
        </div>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Checklist de publicación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {canPublish ? (
            <Badge>Listo para publicar</Badge>
          ) : (
            <>
              <Badge variant="destructive">Faltan requisitos para publicar</Badge>
              <ul className="list-disc space-y-1 pl-5">
                {publishChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Crear servicio (con plantillas)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2 md:max-w-sm">
            <Label htmlFor="template">Plantilla</Label>
            <select
              id="template"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue=""
              onChange={(event) => applyTemplate(event.target.value)}
            >
              <option value="">Selecciona una plantilla</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="create-slug">Slug</Label>
              <Input
                id="create-slug"
                value={createDraft.slug}
                onChange={(event) => setCreateDraft((current) => ({ ...current, slug: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-title">Título</Label>
              <Input
                id="create-title"
                value={createDraft.title}
                onChange={(event) => setCreateDraft((current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-duration">Duración (min)</Label>
              <Input
                id="create-duration"
                type="number"
                min={30}
                max={600}
                value={createDraft.durationMinutes}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, durationMinutes: Number(event.target.value || 0) }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-price">Precio base</Label>
              <Input
                id="create-price"
                type="number"
                min={0}
                value={createDraft.basePrice}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, basePrice: Number(event.target.value || 0) }))
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Extras (chips con precio opcional)</Label>
            <div className="flex flex-wrap gap-2">
              {createDraft.extras.map((extra) => (
                <Badge key={extra.id} variant="secondary" className="gap-2">
                  {extra.label}
                  {extra.price !== null ? ` (+$${extra.price})` : ""}
                  <button type="button" onClick={() => removeCreateExtra(extra.id)} aria-label={`Eliminar ${extra.label}`}>
                    ×
                  </button>
                </Badge>
              ))}
              {createDraft.extras.length === 0 ? (
                <span className="text-xs text-muted-foreground">No hay extras.</span>
              ) : null}
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
              <Input
                placeholder="Nombre del extra"
                value={createDraft.pendingExtraLabel}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, pendingExtraLabel: event.target.value }))
                }
              />
              <Input
                placeholder="Precio opcional"
                type="number"
                min={0}
                value={createDraft.pendingExtraPrice}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, pendingExtraPrice: event.target.value }))
                }
              />
              <Button type="button" variant="outline" onClick={addCreateExtra}>
                Agregar extra
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="create-active"
              checked={createDraft.active}
              onCheckedChange={(checked) => {
                if (checked && !canPublish) {
                  notify("error", "Completa checklist de publicación para activar servicios.");
                  return;
                }
                setCreateDraft((current) => ({ ...current, active: checked }));
              }}
            />
            <Label htmlFor="create-active">Publicar servicio al crearlo</Label>
          </div>

          <div>
            <Button onClick={() => void createService()}>Crear servicio</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Catálogo de servicios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="Título o slug"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status-filter">Estado</Label>
              <select
                id="status-filter"
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sort">Orden</Label>
              <select
                id="sort"
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as "updated" | "title" | "priceAsc" | "priceDesc")}
              >
                <option value="updated">Reciente</option>
                <option value="title">Título</option>
                <option value="priceAsc">Precio ascendente</option>
                <option value="priceDesc">Precio descendente</option>
              </select>
            </div>
          </div>

          {dirtyIds.length > 0 ? (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>{dirtyIds.length} servicio(s) con cambios sin guardar.</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void saveAllDirty()}>Guardar todo</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDrafts(Object.fromEntries(items.map((item) => [item.id, toDraft(item)])));
                      setDirtyIds([]);
                      notify("success", "Cambios descartados.");
                    }}
                  >
                    Descartar cambios
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Servicio</TableHead>
                <TableHead>Configuración</TableHead>
                <TableHead>Métricas</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((item) => {
                const draft = drafts[item.id] ?? toDraft(item);
                const metric = metrics[item.id] ?? {
                  views: 0,
                  reservations: 0,
                  conversionPct: 0,
                  averageRating: null,
                  cancellationPct: 0
                };
                const isBusy = busyIds.includes(item.id);

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="grid gap-2">
                        <Input
                          value={draft.title}
                          onChange={(event) => updateDraft(item.id, { title: event.target.value })}
                          aria-label="Título del servicio"
                        />
                        <Input
                          value={draft.slug}
                          onChange={(event) => updateDraft(item.id, { slug: event.target.value })}
                          aria-label="Slug del servicio"
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input
                            type="number"
                            min={30}
                            max={600}
                            value={draft.durationMinutes}
                            onChange={(event) => updateDraft(item.id, { durationMinutes: Number(event.target.value || 0) })}
                            aria-label="Duración"
                          />
                          <Input
                            type="number"
                            min={0}
                            value={draft.basePrice}
                            onChange={(event) => updateDraft(item.id, { basePrice: Number(event.target.value || 0) })}
                            aria-label="Precio base"
                          />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="grid gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={draft.active}
                            onCheckedChange={(checked) => quickToggleActive(item.id, checked)}
                          />
                          <Badge variant={draft.active ? "default" : "secondary"}>
                            {draft.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {draft.extras.map((extra) => (
                            <Badge key={extra.id} variant="secondary" className="gap-2">
                              {extra.label}
                              {extra.price !== null ? ` (+$${extra.price})` : ""}
                              <button
                                type="button"
                                onClick={() => removeDraftExtra(item.id, extra.id)}
                                aria-label={`Eliminar ${extra.label}`}
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                          <Input
                            placeholder="Extra"
                            value={draft.pendingExtraLabel}
                            onChange={(event) => updateDraft(item.id, { pendingExtraLabel: event.target.value })}
                          />
                          <Input
                            placeholder="Precio"
                            type="number"
                            min={0}
                            value={draft.pendingExtraPrice}
                            onChange={(event) => updateDraft(item.id, { pendingExtraPrice: event.target.value })}
                          />
                          <Button type="button" variant="outline" onClick={() => addDraftExtra(item.id)}>
                            Agregar
                          </Button>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>Vistas: <span className="text-foreground">{metric.views}</span></p>
                        <p>Reservas: <span className="text-foreground">{metric.reservations}</span></p>
                        <p>Conversión: <span className="text-foreground">{metric.conversionPct.toFixed(1)}%</span></p>
                        <p>
                          Rating: <span className="text-foreground">{metric.averageRating ? metric.averageRating.toFixed(1) : "N/A"}</span>
                        </p>
                        <p>Cancelaciones: <span className="text-foreground">{metric.cancellationPct.toFixed(1)}%</span></p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" disabled={isBusy} onClick={() => void saveService(item.id)}>
                          Guardar
                        </Button>
                        <Button size="sm" variant="outline" disabled={isBusy} onClick={() => void duplicateService(item.id)}>
                          Duplicar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewServiceId(item.id)}
                        >
                          Previsualizar
                        </Button>
                        <Button size="sm" variant="destructive" disabled={isBusy} onClick={() => void deleteService(item.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {previewDraft ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Previsualización cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{previewDraft.title}</p>
            <p>Slug: {previewDraft.slug}</p>
            <p>Duración estimada: {previewDraft.durationMinutes} min</p>
            <p>Desde: ${previewDraft.basePrice}</p>
            <div className="flex flex-wrap gap-2">
              {previewDraft.extras.map((extra) => (
                <Badge key={extra.id} variant="secondary">
                  {extra.label}
                  {extra.price !== null ? ` (+$${extra.price})` : ""}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" disabled>
                Reservar ahora
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPreviewServiceId(null)}>
                Cerrar previsualización
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6">
        <StatePanel state={state} description={feedback} />
      </div>
    </main>
  );
}
