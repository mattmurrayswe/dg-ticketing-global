import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, Search, X } from 'lucide-react';
import {
  ClassificadosNearbyVehicle,
  downloadTicketPdf,
  ExhibitorVehiclesResponse,
  fetchNearbyExhibitorVehicles,
  sendExhibitorVehicleInvite,
} from '../services/api';

interface FindExhibitorVehiclesTabProps {
  onInviteSent?: () => void;
}

const RADIUS_OPTIONS = [
  { value: 50, label: 'Até 50 km' },
  { value: 150, label: 'Até 150 km' },
  { value: 250, label: 'Até 250 km' },
  { value: 500, label: 'Até 500 km' },
];

export const FindExhibitorVehiclesTab: React.FC<FindExhibitorVehiclesTabProps> = ({
  onInviteSent,
}) => {
  const dialogTitleId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<number | undefined>(undefined);
  const [radiusKm, setRadiusKm] = useState<number>(250);
  const [searchInput, setSearchInput] = useState<string>('');
  const [appliedQuery, setAppliedQuery] = useState<string>('');

  const [response, setResponse] = useState<ExhibitorVehiclesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal state for inviting a specific vehicle owner
  const [targetVehicle, setTargetVehicle] = useState<ClassificadosNearbyVehicle | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<number | undefined>(undefined);
  const [ownerName, setOwnerName] = useState<string>('');
  const [ownerPhone, setOwnerPhone] = useState<string>('');
  const [ownerEmail, setOwnerEmail] = useState<string>('');
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [personalMessage, setPersonalMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    message: string;
    order_code: string;
    pass_url: string;
    whatsapp_invite_url: string;
  } | null>(null);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [downloadingCode, setDownloadingCode] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});

  const loadVehicles = async (opts?: {
    eventId?: number;
    radius?: number;
    query?: string;
  }) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const evId = opts?.eventId !== undefined ? opts.eventId : selectedEventId;
      const rad = opts?.radius !== undefined ? opts.radius : radiusKm;
      const q = opts?.query !== undefined ? opts.query : appliedQuery;
      const data = await fetchNearbyExhibitorVehicles({
        event_id: evId,
        radius_km: rad,
        q: q || undefined,
      });
      setResponse(data);
      if (data.selected_event && selectedEventId === undefined) {
        setSelectedEventId(data.selected_event.id);
      }
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.detail ||
          'Não foi possível carregar os veículos próximos ao seu evento.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId, radiusKm, appliedQuery]);

  // Light-dismiss fallback for browsers without native <dialog closedby="any">
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      setTargetVehicle(null);
      setSubmitError(null);
      setInviteResult(null);
    };
    dialog.addEventListener('close', handleClose);

    let cleanupFallback: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      let pressedOutside = false;
      const onDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          dialog.close();
        }
      };
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('pointerup', onUp);
      cleanupFallback = () => {
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('pointerup', onUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupFallback?.();
    };
  }, []);

  const openInviteModal = (vehicle: ClassificadosNearbyVehicle) => {
    const activeEvent = response?.selected_event;
    if (!activeEvent) return;

    const exhibitorTier =
      activeEvent.tiers.find((t) => t.requires_car_specs) || activeEvent.tiers[0];

    setTargetVehicle(vehicle);
    setSelectedTierId(exhibitorTier?.id);
    setOwnerName(vehicle.owner?.name || '');
    setOwnerPhone(vehicle.owner?.phone || '');
    setOwnerEmail('');
    setLicensePlate('');
    setPersonalMessage(
      `Olá! Gostaríamos de convidá-lo para expor seu ${vehicle.vehicle_title} (${vehicle.year_model}) gratuitamente no encontro ${activeEvent.title}.`
    );
    setSubmitError(null);
    setInviteResult(null);

    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  };

  const closeInviteModal = () => {
    dialogRef.current?.close();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedQuery(searchInput.trim());
  };

  const handleConfirmInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetVehicle || !response?.selected_event) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await sendExhibitorVehicleInvite({
        event_id: response.selected_event.id,
        listing_id: targetVehicle.listing_id,
        ticket_tier_id: selectedTierId,
        owner_name: ownerName.trim() || undefined,
        owner_phone: ownerPhone.trim() || undefined,
        owner_email: ownerEmail.trim() || undefined,
        license_plate: licensePlate.trim() || undefined,
        personal_message: personalMessage.trim() || undefined,
      });

      setInviteResult({
        message: res.message,
        order_code: res.order_code,
        pass_url: res.pass_url,
        whatsapp_invite_url: res.whatsapp_invite_url,
      });

      await loadVehicles();
      onInviteSent?.();
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.detail || 'Falha ao emitir convite gratuito para o veículo.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPassUrl = (orderCode: string, passUrl: string) => {
    navigator.clipboard.writeText(passUrl);
    setCopiedCode(orderCode);
    setTimeout(() => setCopiedCode(null), 2200);
  };

  const handleDownloadPdf = async (orderCode: string) => {
    if (downloadingCode) return;
    setDownloadingCode(orderCode);
    try {
      await downloadTicketPdf(orderCode);
    } catch (err) {
      console.error('Erro ao baixar PDF do convite:', err);
    } finally {
      setDownloadingCode(null);
    }
  };

  const quota = response?.invite_quota || { limit: 10, used: 0, remaining: 10 };
  const selectedEvent = response?.selected_event;
  const vehicles = response?.vehicles || [];

  return (
    <div className="space-y-6">
      {/* Sober Header & Filters Panel */}
      <div className="bg-[#0f1117] border border-[#1e222e] rounded-xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="font-markazi text-3xl sm:text-4xl font-medium text-white tracking-wide leading-tight">
              Encontre Veículos Expositores
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mt-1">
              Descubra carros cadastrados na região do seu encontro e convide os proprietários para
              a exposição do seu evento.
            </p>
          </div>

          {/* Sober Convites Grátis Metric Card */}
          <div className="bg-[#0b0d12] border border-[#1e222e] rounded-xl px-5 py-4 sm:min-w-[210px] shrink-0">
            <span className="font-sans text-sm font-semibold text-white block">
              Convites Grátis
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{quota.remaining}</span>
              <span className="text-xs text-zinc-400">de {quota.limit} disponíveis</span>
            </div>
          </div>
        </div>

        {/* Clean Filter Row */}
        {selectedEvent ? (
          <div className="pt-5 border-t border-[#1e222e] grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5">
              <label
                htmlFor="exhibitor-event-select"
                className="block text-xs font-medium text-zinc-400 mb-1.5"
              >
                Evento
              </label>
              <select
                id="exhibitor-event-select"
                name="event_id"
                value={selectedEvent.id}
                onChange={(e) => setSelectedEventId(Number(e.target.value))}
                className="dg-select"
              >
                {(response?.available_events || []).map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} — {ev.city}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="exhibitor-radius-select"
                className="block text-xs font-medium text-zinc-400 mb-1.5"
              >
                Distância
              </label>
              <select
                id="exhibitor-radius-select"
                name="radius_km"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="dg-select"
              >
                {RADIUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleSearchSubmit} className="md:col-span-4 flex gap-2">
              <div className="flex-1">
                <label
                  htmlFor="exhibitor-car-search"
                  className="block text-xs font-medium text-zinc-400 mb-1.5"
                >
                  Marca ou modelo
                </label>
                <div className="relative">
                  <Search
                    className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="exhibitor-car-search"
                    name="q"
                    type="search"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      if (e.target.value === '' && appliedQuery !== '') {
                        setAppliedQuery('');
                      }
                    }}
                    placeholder="Buscar veículo..."
                    className="w-full min-h-[42px] bg-[#0b0d12] border border-[#262a36] hover:border-white/30 rounded-lg pl-8 pr-3 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/50 transition"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="self-end min-h-[42px] px-4 py-2.5 rounded-lg bg-[#15171e] hover:bg-[#1b1e28] border border-[#262a36] hover:border-white/35 text-xs font-semibold text-white transition cursor-pointer"
              >
                Filtrar
              </button>
            </form>
          </div>
        ) : (
          !loading && (
            <div className="pt-5 border-t border-[#1e222e] flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-zinc-400">
                Crie um evento para visualizar veículos cadastrados na região.
              </p>
              <Link
                to="/criar-evento"
                className="px-3.5 py-2 rounded-lg bg-[#15171e] text-white border border-white/30 hover:border-white/50 text-xs font-semibold transition"
              >
                Criar Novo Evento
              </Link>
            </div>
          )
        )}
      </div>

      {/* Error State */}
      {errorMsg && (
        <div className="bg-[#0f1117] border border-red-500/30 text-red-300 rounded-xl p-4 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-72 rounded-xl bg-[#0f1117] border border-[#1e222e] animate-pulse"
            />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-[#0f1117] border border-[#1e222e] rounded-xl p-10 text-center space-y-3">
          <p className="text-sm font-medium text-white">
            Nenhum veículo encontrado em até {radiusKm} km.
          </p>
          {radiusKm < 500 && (
            <button
              type="button"
              onClick={() => setRadiusKm(500)}
              className="px-3.5 py-2 rounded-lg bg-[#15171e] hover:bg-zinc-800 border border-[#262a36] text-xs font-semibold text-white transition cursor-pointer"
            >
              Ampliar busca para 500 km
            </button>
          )}
        </div>
      ) : (
        /* Sober, Minimal Vehicle Grid (No Prices, No Badge Clutter) */
        <div className="dg-vehicle-grid">
          {vehicles.map((car) => {
            const isInvited = Boolean(car.already_invited && car.invite);
            const hasImage = Boolean(car.cover_url) && !brokenImages[car.listing_id];

            const metaParts = [
              car.city ? `${car.city}${car.uf ? `, ${car.uf}` : ''}` : null,
              !car.is_same_city && car.distance_km != null ? `${car.distance_km} km` : null,
              typeof car.mileage_km === 'number'
                ? `${car.mileage_km.toLocaleString('pt-BR')} km`
                : null,
            ].filter(Boolean);

            return (
              <article
                key={car.listing_id}
                className="dg-vehicle-card rounded-xl bg-[#0f1117] border border-[#1e222e] hover:border-[#2e3446] transition overflow-hidden"
              >
                {hasImage ? (
                  <img
                    src={car.cover_url!}
                    alt={`${car.vehicle_title} (${car.year_model})`}
                    loading="lazy"
                    onError={() =>
                      setBrokenImages((prev) => ({ ...prev, [car.listing_id]: true }))
                    }
                    className="w-full aspect-[16/10] object-cover block bg-[#151720]"
                  />
                ) : (
                  <div className="media w-full aspect-[16/10] bg-[#151720] flex items-center justify-center text-xs text-zinc-500">
                    {car.vehicle_title}
                  </div>
                )}

                <header className="px-4 pt-4 flex items-baseline justify-between gap-3">
                  <h3 className="font-sans text-base font-semibold text-white truncate">
                    {car.vehicle_title}
                  </h3>
                  <span className="text-xs text-zinc-400 shrink-0">{car.year_model}</span>
                </header>

                <p className="px-4 pt-1 pb-4 text-xs text-zinc-400 truncate">
                  {metaParts.join(' · ')}
                </p>

                <footer className="px-4 py-3 border-t border-[#1e222e] flex items-center justify-between gap-2">
                  {isInvited && car.invite ? (
                    <>
                      <span className="text-xs font-medium text-zinc-300">Convidado</span>
                      <div className="flex items-center gap-3 text-xs">
                        <a
                          href={car.invite.whatsapp_invite_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-300 hover:text-white underline underline-offset-4 transition"
                        >
                          WhatsApp
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyPassUrl(car.invite!.order_code, car.invite!.pass_url)
                          }
                          className="text-zinc-400 hover:text-white underline underline-offset-4 transition cursor-pointer inline-flex items-center gap-1"
                        >
                          {copiedCode === car.invite.order_code ? (
                            <>
                              <Check className="w-3 h-3" aria-hidden="true" />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <span>Link</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(car.invite!.order_code)}
                          disabled={downloadingCode === car.invite.order_code}
                          className="text-zinc-400 hover:text-white underline underline-offset-4 transition disabled:opacity-50 cursor-pointer"
                        >
                          {downloadingCode === car.invite.order_code ? '...' : 'PDF'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={quota.remaining <= 0 || !selectedEvent}
                      onClick={() => openInviteModal(car)}
                      className="w-full py-2 px-3.5 rounded-lg bg-[#15171e] hover:bg-[#1a1d27] text-white border border-[#262a36] hover:border-white/35 text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {quota.remaining > 0 ? 'Convidar Veículo' : 'Convites esgotados'}
                    </button>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {/* Sober Native <dialog> Modal for Sending Free Exhibitor Invite */}
      <dialog
        ref={dialogRef}
        aria-labelledby={dialogTitleId}
        {...({ closedby: 'any' } as any)}
        className="w-full max-w-md rounded-xl bg-[#0f1117] text-white border border-[#262a36] p-0 shadow-2xl open:block"
      >
        {targetVehicle && selectedEvent && (
          <div>
            <div className="px-5 py-4 border-b border-[#1e222e] flex items-center justify-between gap-3">
              <div>
                <h1
                  id={dialogTitleId}
                  className="font-markazi text-2xl font-medium text-white leading-tight"
                >
                  Convidar {targetVehicle.vehicle_title}
                </h1>
                <p className="text-xs text-zinc-400">
                  {quota.remaining} de {quota.limit} convites grátis disponíveis
                </p>
              </div>
              <button
                type="button"
                onClick={closeInviteModal}
                aria-label="Fechar janela de convite"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {inviteResult ? (
              <div className="p-5 space-y-4">
                <div className="p-4 rounded-lg bg-[#0b0d12] border border-[#1e222e] space-y-1">
                  <p className="text-sm font-semibold text-white">{inviteResult.message}</p>
                  <p className="text-xs font-mono text-zinc-400">
                    Passe #{inviteResult.order_code}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={inviteResult.whatsapp_invite_url}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs text-center transition"
                  >
                    Enviar no WhatsApp
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopyPassUrl(inviteResult.order_code, inviteResult.pass_url)
                    }
                    className="py-2.5 px-3 rounded-lg bg-[#15171e] hover:bg-zinc-800 border border-[#262a36] text-white font-semibold text-xs transition cursor-pointer"
                  >
                    {copiedCode === inviteResult.order_code ? 'Link copiado' : 'Copiar link'}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1e222e]">
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(inviteResult.order_code)}
                    className="text-xs text-zinc-400 hover:text-white underline underline-offset-4 cursor-pointer"
                  >
                    Baixar ingresso em PDF
                  </button>

                  <button
                    type="button"
                    onClick={closeInviteModal}
                    className="px-4 py-1.5 rounded-lg bg-[#15171e] border border-[#262a36] text-white text-xs font-semibold hover:border-white/35 transition cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmInvite} className="p-5 space-y-4">
                {submitError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                    {submitError}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="invite-owner-name"
                      className="block text-xs font-medium text-zinc-400 mb-1"
                    >
                      Nome do proprietário
                    </label>
                    <input
                      id="invite-owner-name"
                      name="owner_name"
                      type="text"
                      required
                      autoFocus
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full min-h-[42px] bg-[#0b0d12] border border-[#262a36] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/50"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="invite-tier-select"
                      className="block text-xs font-medium text-zinc-400 mb-1"
                    >
                      Categoria do ingresso cortesia
                    </label>
                    <select
                      id="invite-tier-select"
                      name="ticket_tier_id"
                      value={selectedTierId}
                      onChange={(e) => setSelectedTierId(Number(e.target.value))}
                      className="dg-select"
                    >
                      {selectedEvent.tiers.map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="invite-owner-phone"
                        className="block text-xs font-medium text-zinc-400 mb-1"
                      >
                        WhatsApp (opcional)
                      </label>
                      <input
                        id="invite-owner-phone"
                        name="owner_phone"
                        type="tel"
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="(41) 99999-9999"
                        className="w-full min-h-[42px] bg-[#0b0d12] border border-[#262a36] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/50"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="invite-owner-email"
                        className="block text-xs font-medium text-zinc-400 mb-1"
                      >
                        E-mail (opcional)
                      </label>
                      <input
                        id="invite-owner-email"
                        name="owner_email"
                        type="email"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="email@dominio.com"
                        className="w-full min-h-[42px] bg-[#0b0d12] border border-[#262a36] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="invite-message"
                      className="block text-xs font-medium text-zinc-400 mb-1"
                    >
                      Mensagem do convite
                    </label>
                    <textarea
                      id="invite-message"
                      name="personal_message"
                      rows={3}
                      value={personalMessage}
                      onChange={(e) => setPersonalMessage(e.target.value)}
                      className="w-full bg-[#0b0d12] border border-[#262a36] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/50"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e222e]">
                  <button
                    type="button"
                    onClick={closeInviteModal}
                    className="px-4 py-2 rounded-lg bg-transparent hover:bg-[#151720] border border-[#262a36] text-xs font-semibold text-zinc-300 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs inline-flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                    <span>Enviar Convite</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </dialog>
    </div>
  );
};
