"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { StatePanel } from "@/components/shared/state-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceShell } from "@/components/shared/workspace-shell";
import { ApiState, apiFetch } from "@/lib/api";

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
type TicketRisk = "low" | "medium" | "high";

interface ProfileItem {
  id: string;
}

interface ServiceItem {
  id: string;
  title: string;
  slug: string;
  basePrice: number;
  active: boolean;
}

interface BookingItem {
  id: string;
  customerId: string;
  providerId: string;
  serviceId: string;
  scheduledAt: string;
  status: BookingStatus;
  notes: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  completionEvidence: unknown;
  createdAt: string;
}

interface BookingRisk {
  bookingId: string;
  riskScore: number;
  level: TicketRisk;
}

interface PaymentSummary {
  bookingId: string;
  status: string;
  amount: number;
  paidAt: string | null;
  releasedAt: string | null;
}

interface EvidenceDraft {
  note: string;
  geo: string;
  photoUrlsText: string;
}

function bookingStatusVariant(status: BookingStatus) {
  if (status === "completed") return "default";
  if (status === "cancelled") return "destructive";
  if (status === "confirmed") return "secondary";
  return "outline";
}

function riskVariant(level: TicketRisk) {
  if (level === "high") return "destructive";
  if (level === "medium") return "secondary";
  return "default";
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(value);
}

function parseEvidenceDraft(raw: unknown): EvidenceDraft {
  if (!raw || typeof raw !== "object") {
    return { note: "", geo: "", photoUrlsText: "" };
  }

  const parsed = raw as Record<string, unknown>;
  const photoUrls = Array.isArray(parsed.photoUrls)
    ? parsed.photoUrls.filter((item): item is string => typeof item === "string")
    : [];

  return {
    note: typeof parsed.note === "string" ? parsed.note : "",
    geo: typeof parsed.geo === "string" ? parsed.geo : "",
    photoUrlsText: photoUrls.join("\n")
  };
}

export default function ProviderBookingsPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [actionState, setActionState] = useState<ApiState>("idle");
  const [actionMessage, setActionMessage] = useState("");

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [servicesById, setServicesById] = useState<Record<string, ServiceItem>>({});
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");
  const [windowFilter, setWindowFilter] = useState<"all" | "today" | "upcoming" | "past">("all");

  const [riskByBooking, setRiskByBooking] = useState<Record<string, BookingRisk | null>>({});
  const [paymentByBooking, setPaymentByBooking] = useState<Record<string, PaymentSummary | null>>(
    {}
  );
  const [contextBusyIds, setContextBusyIds] = useState<string[]>([]);
  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, EvidenceDraft>>({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  function markContextBusy(bookingId: string, busy: boolean) {
    setContextBusyIds((current) =>
      busy
        ? current.includes(bookingId)
          ? current
          : [...current, bookingId]
        : current.filter((id) => id !== bookingId)
    );
  }

  async function loadBookings(silent = false) {
    if (!silent) {
      setState("loading");
    } else {
      setIsRefreshing(true);
    }

    try {
      const userId = localStorage.getItem("homly_user_id") ?? "";
      if (!userId) {
        setState("error");
        setFeedback("No se encontró sesión de proveedor.");
        return;
      }

      const profile = await apiFetch<ProfileItem>(`/providers/user/${userId}`);
      const [bookingData, services] = await Promise.all([
        apiFetch<BookingItem[]>("/bookings/mine"),
        apiFetch<ServiceItem[]>(`/catalog/services?providerId=${profile.id}`)
      ]);

      setBookings(bookingData);
      setServicesById(Object.fromEntries(services.map((item) => [item.id, item])));
      setEvidenceDrafts(
        Object.fromEntries(bookingData.map((item) => [item.id, parseEvidenceDraft(item.completionEvidence)]))
      );
      setSelectedBookingId((current) => {
        if (bookingData.some((item) => item.id === current)) {
          return current;
        }
        return bookingData[0]?.id ?? "";
      });
      setState(bookingData.length === 0 ? "empty" : "success");
      setFeedback(
        bookingData.length === 0
          ? "Aún no tienes reservas entrantes."
          : "Bandeja de reservas actualizada."
      );
      setLastUpdatedAt(new Date().toISOString());
    } catch {
      setState("error");
      setFeedback("No se pudieron cargar las reservas del proveedor.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function ensureBookingContext(bookingId: string, force = false) {
    if (!bookingId) {
      return;
    }

    const hasRisk = Object.prototype.hasOwnProperty.call(riskByBooking, bookingId);
    const hasPayment = Object.prototype.hasOwnProperty.call(paymentByBooking, bookingId);
    if (!force && hasRisk && hasPayment) {
      return;
    }

    markContextBusy(bookingId, true);
    try {
      const [risk, payment] = await Promise.all([
        apiFetch<BookingRisk>(`/bookings/${bookingId}/risk`).catch(() => null),
        apiFetch<PaymentSummary>(`/payments/booking/${bookingId}`).catch(() => null)
      ]);
      setRiskByBooking((current) => ({ ...current, [bookingId]: risk }));
      setPaymentByBooking((current) => ({ ...current, [bookingId]: payment }));
    } finally {
      markContextBusy(bookingId, false);
    }
  }

  useEffect(() => {
    void loadBookings();
  }, []);

  useEffect(() => {
    if (!selectedBookingId) {
      return;
    }
    void ensureBookingContext(selectedBookingId);
  }, [selectedBookingId]);

  const filteredBookings = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);
    const now = Date.now();

    return bookings.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      const bookingTime = new Date(item.scheduledAt).getTime();
      if (windowFilter === "today" && (bookingTime < startToday.getTime() || bookingTime > endToday.getTime())) {
        return false;
      }
      if (windowFilter === "upcoming" && bookingTime < now) {
        return false;
      }
      if (windowFilter === "past" && bookingTime >= now) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const service = servicesById[item.serviceId];
      return (
        item.id.toLowerCase().includes(normalized) ||
        item.customerId.toLowerCase().includes(normalized) ||
        (item.notes ?? "").toLowerCase().includes(normalized) ||
        (service?.title ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [bookings, query, servicesById, statusFilter, windowFilter]);

  const selectedBooking = useMemo(
    () => bookings.find((item) => item.id === selectedBookingId) ?? null,
    [bookings, selectedBookingId]
  );

  const metrics = useMemo(
    () => ({
      total: bookings.length,
      pending: bookings.filter((item) => item.status === "pending").length,
      confirmed: bookings.filter((item) => item.status === "confirmed").length,
      completed: bookings.filter((item) => item.status === "completed").length,
      cancelled: bookings.filter((item) => item.status === "cancelled").length,
      today: bookings.filter((item) => {
        const when = new Date(item.scheduledAt);
        const now = new Date();
        return (
          when.getFullYear() === now.getFullYear() &&
          when.getMonth() === now.getMonth() &&
          when.getDate() === now.getDate()
        );
      }).length
    }),
    [bookings]
  );

  async function runAction(
    bookingId: string,
    loadingMessage: string,
    successMessage: string,
    action: () => Promise<void>
  ) {
    setBusyBookingId(bookingId);
    setActionState("loading");
    setActionMessage(loadingMessage);

    try {
      await action();
      await loadBookings(true);
      await ensureBookingContext(bookingId, true);
      setActionState("success");
      setActionMessage(successMessage);
    } catch {
      setActionState("error");
      setActionMessage("No se pudo completar la acción sobre la reserva.");
    } finally {
      setBusyBookingId(null);
    }
  }

  function updateEvidenceDraft(bookingId: string, patch: Partial<EvidenceDraft>) {
    setEvidenceDrafts((current) => {
      const previous = current[bookingId] ?? { note: "", geo: "", photoUrlsText: "" };
      return {
        ...current,
        [bookingId]: {
          ...previous,
          ...patch
        }
      };
    });
  }

  async function saveEvidence(bookingId: string) {
    const draft = evidenceDrafts[bookingId] ?? { note: "", geo: "", photoUrlsText: "" };
    const photoUrls = draft.photoUrlsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    await runAction(
      bookingId,
      "Guardando evidencia...",
      "Evidencia guardada correctamente.",
      async () => {
        await apiFetch(`/bookings/${bookingId}/evidence`, {
          method: "POST",
          body: JSON.stringify({
            note: draft.note.trim() || undefined,
            geo: draft.geo.trim() || undefined,
            photoUrls: photoUrls.length > 0 ? photoUrls : undefined
          })
        });
      }
    );
  }

  return (
    <WorkspaceShell
      section="Proveedor"
      title="Gestión de reservas"
      description="Administra reservas entrantes, ejecución en campo y evidencia de cumplimiento."
      links={[
        { href: "/proveedor/dashboard", label: "Dashboard" },
        { href: "/proveedor/reservas", label: "Reservas" },
        { href: "/proveedor/notificaciones", label: "Notificaciones" },
        { href: "/proveedor/servicios", label: "Servicios" },
        { href: "/proveedor/mensajes", label: "Mensajes" },
        { href: "/proveedor/soporte", label: "Soporte" }
      ]}
    >
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
        <p className="text-sm text-muted-foreground">
          {lastUpdatedAt
            ? `Última actualización: ${new Date(lastUpdatedAt).toLocaleString()}`
            : "Sincronizando bandeja de reservas..."}
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={isRefreshing}
          onClick={() => {
            void loadBookings(true);
          }}
        >
          {isRefreshing ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>

      <div className="mt-6">
        <StatePanel state={state} description={feedback || undefined} />
      </div>

      {actionState !== "idle" ? (
        <div className="mt-4">
          <StatePanel state={actionState} description={actionMessage} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{metrics.total}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pendientes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{metrics.pending}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confirmadas</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{metrics.confirmed}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hoy</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{metrics.today}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completadas</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{metrics.completed}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Canceladas</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{metrics.cancelled}</CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Filtros de bandeja</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por id, cliente, nota o servicio"
          />
          <Select
            value={statusFilter}
            onValueChange={(value: "all" | BookingStatus) => setStatusFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={windowFilter}
            onValueChange={(value: "all" | "today" | "upcoming" | "past") => setWindowFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Ventana" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="upcoming">Próximas</SelectItem>
              <SelectItem value="past">Histórico</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center text-sm text-muted-foreground">
            Mostrando {filteredBookings.length} de {bookings.length} reservas
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Reservas entrantes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reserva</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Riesgo</TableHead>
                <TableHead className="text-right">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => {
                const selected = booking.id === selectedBookingId;
                const service = servicesById[booking.serviceId];
                const payment = paymentByBooking[booking.id];
                const risk = riskByBooking[booking.id];
                const contextBusy = contextBusyIds.includes(booking.id);

                return (
                  <TableRow
                    key={booking.id}
                    className={selected ? "bg-muted/40" : undefined}
                    onClick={() => {
                      setSelectedBookingId(booking.id);
                      void ensureBookingContext(booking.id);
                    }}
                  >
                    <TableCell>
                      <p className="font-medium">#{booking.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        cliente {booking.customerId.slice(0, 8)}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {service?.title ?? booking.serviceId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(booking.scheduledAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={bookingStatusVariant(booking.status)}>
                        {formatStatus(booking.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {payment ? formatStatus(payment.status) : contextBusy ? "cargando..." : "sin dato"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {risk ? (
                        <Badge variant={riskVariant(risk.level)}>{risk.level}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {contextBusy ? "cargando..." : "sin dato"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedBookingId(booking.id);
                          void ensureBookingContext(booking.id);
                        }}
                      >
                        {selected ? "Abierta" : "Abrir"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedBooking ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">
              Operación de reserva #{selectedBooking.id.slice(0, 8)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Servicio:</span>{" "}
                  {servicesById[selectedBooking.serviceId]?.title ?? selectedBooking.serviceId}
                </p>
                <p>
                  <span className="font-medium text-foreground">Agenda:</span>{" "}
                  {formatDateTime(selectedBooking.scheduledAt)}
                </p>
                <p>
                  <span className="font-medium text-foreground">Estado:</span>{" "}
                  {formatStatus(selectedBooking.status)}
                </p>
                <p>
                  <span className="font-medium text-foreground">Check-in:</span>{" "}
                  {formatDateTime(selectedBooking.checkInAt)}
                </p>
                <p>
                  <span className="font-medium text-foreground">Check-out:</span>{" "}
                  {formatDateTime(selectedBooking.checkOutAt)}
                </p>
                <p>
                  <span className="font-medium text-foreground">Nota cliente:</span>{" "}
                  {selectedBooking.notes ?? "N/A"}
                </p>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Pago:</span>{" "}
                  {paymentByBooking[selectedBooking.id]
                    ? `${formatStatus(paymentByBooking[selectedBooking.id]!.status)} · ${formatCurrency(
                        paymentByBooking[selectedBooking.id]!.amount
                      )}`
                    : "Sin dato"}
                </p>
                <p>
                  <span className="font-medium text-foreground">Pagado en:</span>{" "}
                  {formatDateTime(paymentByBooking[selectedBooking.id]?.paidAt)}
                </p>
                <p>
                  <span className="font-medium text-foreground">Payout liberado:</span>{" "}
                  {formatDateTime(paymentByBooking[selectedBooking.id]?.releasedAt)}
                </p>
                <p>
                  <span className="font-medium text-foreground">Riesgo:</span>{" "}
                  {riskByBooking[selectedBooking.id]
                    ? `${riskByBooking[selectedBooking.id]!.level} (${riskByBooking[
                        selectedBooking.id
                      ]!.riskScore.toFixed(2)})`
                    : "Sin dato"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busyBookingId === selectedBooking.id || selectedBooking.status !== "pending"}
                onClick={() => {
                  void runAction(
                    selectedBooking.id,
                    "Confirmando reserva...",
                    "Reserva confirmada.",
                    async () => {
                      await apiFetch(`/bookings/${selectedBooking.id}/status`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: "confirmed" })
                      });
                    }
                  );
                }}
              >
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={
                  busyBookingId === selectedBooking.id ||
                  selectedBooking.status === "cancelled" ||
                  selectedBooking.status === "completed"
                }
                onClick={() => {
                  void runAction(
                    selectedBooking.id,
                    "Cancelando reserva...",
                    "Reserva cancelada.",
                    async () => {
                      await apiFetch(`/bookings/${selectedBooking.id}/status`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: "cancelled" })
                      });
                    }
                  );
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={
                  busyBookingId === selectedBooking.id ||
                  selectedBooking.status === "completed" ||
                  selectedBooking.status === "cancelled"
                }
                onClick={() => {
                  void runAction(
                    selectedBooking.id,
                    "Marcando reserva como completada...",
                    "Reserva completada.",
                    async () => {
                      await apiFetch(`/bookings/${selectedBooking.id}/status`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: "completed" })
                      });
                    }
                  );
                }}
              >
                Completar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  busyBookingId === selectedBooking.id ||
                  Boolean(selectedBooking.checkInAt) ||
                  selectedBooking.status === "cancelled"
                }
                onClick={() => {
                  void runAction(
                    selectedBooking.id,
                    "Registrando check-in...",
                    "Check-in registrado.",
                    async () => {
                      await apiFetch(`/bookings/${selectedBooking.id}/check-in`, { method: "POST" });
                    }
                  );
                }}
              >
                Check-in
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  busyBookingId === selectedBooking.id ||
                  !selectedBooking.checkInAt ||
                  Boolean(selectedBooking.checkOutAt) ||
                  selectedBooking.status === "cancelled"
                }
                onClick={() => {
                  void runAction(
                    selectedBooking.id,
                    "Registrando check-out...",
                    "Check-out registrado.",
                    async () => {
                      await apiFetch(`/bookings/${selectedBooking.id}/check-out`, { method: "POST" });
                    }
                  );
                }}
              >
                Check-out
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void ensureBookingContext(selectedBooking.id, true);
                }}
              >
                Recargar riesgo/pago
              </Button>
            </div>

            <div className="grid gap-3 rounded-md border p-4">
              <div>
                <h3 className="text-sm font-medium">Evidencia de servicio</h3>
                <p className="text-xs text-muted-foreground">
                  Registra nota, geolocalización y URLs de fotos (una por línea).
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="evidence-note">Nota</Label>
                <Textarea
                  id="evidence-note"
                  value={evidenceDrafts[selectedBooking.id]?.note ?? ""}
                  onChange={(event) =>
                    updateEvidenceDraft(selectedBooking.id, { note: event.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="evidence-geo">Geo</Label>
                <Input
                  id="evidence-geo"
                  value={evidenceDrafts[selectedBooking.id]?.geo ?? ""}
                  onChange={(event) =>
                    updateEvidenceDraft(selectedBooking.id, { geo: event.target.value })
                  }
                  placeholder="Ej: 4.7110,-74.0721"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="evidence-photos">Photo URLs</Label>
                <Textarea
                  id="evidence-photos"
                  value={evidenceDrafts[selectedBooking.id]?.photoUrlsText ?? ""}
                  onChange={(event) =>
                    updateEvidenceDraft(selectedBooking.id, { photoUrlsText: event.target.value })
                  }
                  placeholder={"https://...\nhttps://..."}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busyBookingId === selectedBooking.id}
                  onClick={() => {
                    void saveEvidence(selectedBooking.id);
                  }}
                >
                  Guardar evidencia
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/proveedor/mensajes">Ir a mensajes</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </WorkspaceShell>
  );
}
