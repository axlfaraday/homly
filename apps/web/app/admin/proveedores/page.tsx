"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/shared/admin-shell";
import { StatePanel } from "@/components/shared/state-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ApiState, apiFetch } from "@/lib/api";
import { formatDateTime, shortId, verificationStatusBadge } from "@/lib/admin-ui";

type VerificationStatus = "pending" | "approved" | "rejected";

interface ProviderItem {
  id: string;
  userId: string;
  fullName: string;
  bio: string;
  city: string;
  coverage: string[];
  verificationStatus: VerificationStatus;
  teamSize: number;
  travelBufferMinutes: number;
  serviceRadiusKm: number;
  createdAt: string;
}

export default function AdminProvidersPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VerificationStatus>("all");
  const [items, setItems] = useState<ProviderItem[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ApiState>("idle");
  const [feedback, setFeedback] = useState("");

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.verificationStatus !== statusFilter) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return (
        item.fullName.toLowerCase().includes(normalized) ||
        item.city.toLowerCase().includes(normalized) ||
        item.userId.toLowerCase().includes(normalized)
      );
    });
  }, [items, query, statusFilter]);

  async function load() {
    try {
      const data = await apiFetch<ProviderItem[]>("/providers");
      setItems(data);
      setState(data.length === 0 ? "empty" : "success");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateVerificationStatus(item: ProviderItem, nextStatus: VerificationStatus) {
    const actionKey = `${item.id}:${nextStatus}`;
    setSavingId(actionKey);
    setActionState("loading");
    setFeedback(`Actualizando estado de ${item.fullName}...`);

    try {
      await apiFetch("/providers/profile", {
        method: "POST",
        body: JSON.stringify({
          userId: item.userId,
          fullName: item.fullName,
          bio: item.bio,
          city: item.city,
          coverage: item.coverage.length === 0 ? [item.city] : item.coverage,
          verificationStatus: nextStatus,
          teamSize: item.teamSize ?? 1,
          travelBufferMinutes: item.travelBufferMinutes ?? 15,
          serviceRadiusKm: item.serviceRadiusKm ?? 10
        })
      });

      setItems((current) =>
        current.map((provider) =>
          provider.id === item.id
            ? {
                ...provider,
                verificationStatus: nextStatus
              }
            : provider
        )
      );
      setActionState("success");
      setFeedback(`Perfil ${item.fullName} actualizado a ${nextStatus}.`);
    } catch {
      setActionState("error");
      setFeedback(`No se pudo actualizar el estado de ${item.fullName}.`);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AdminShell
      title="Admin · proveedores"
      description="Validación operacional del onboarding y estado de visibilidad comercial."
    >
      <div className="mt-6">
        <StatePanel state={state} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Filtros de revisión</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, ciudad o userId"
          />
          <Select
            value={statusFilter}
            onValueChange={(value: "all" | VerificationStatus) => setStatusFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="approved">Aprobado</SelectItem>
              <SelectItem value="rejected">Rechazado</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center text-sm text-muted-foreground">
            Mostrando {filteredItems.length} de {items.length} perfiles
          </div>
        </CardContent>
      </Card>

      {feedback ? (
        <div className="mt-4">
          <StatePanel state={actionState} description={feedback} />
        </div>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Revisión de proveedores</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Cobertura</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.fullName}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.city} · user {shortId(item.userId)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={verificationStatusBadge(item.verificationStatus)}>
                      {item.verificationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.coverage.join(", ")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          item.verificationStatus === "pending" ||
                          savingId === `${item.id}:pending`
                        }
                        onClick={() => {
                          void updateVerificationStatus(item, "pending");
                        }}
                      >
                        Pendiente
                      </Button>
                      <Button
                        size="sm"
                        disabled={
                          item.verificationStatus === "approved" ||
                          savingId === `${item.id}:approved`
                        }
                        onClick={() => {
                          void updateVerificationStatus(item, "approved");
                        }}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={
                          item.verificationStatus === "rejected" ||
                          savingId === `${item.id}:rejected`
                        }
                        onClick={() => {
                          void updateVerificationStatus(item, "rejected");
                        }}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
