import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Package, User, CalendarDays,
  ClipboardList, MapPin, Phone, CreditCard, Truck, DollarSign,
  X, ChevronLeft, ChevronRight, Image as ImageIcon
} from 'lucide-react';
import { fetchCommandeById } from '../../store/admin/adminThunk';
import { clearSelectedCommande } from '../../store/admin/adminSlice';
import { StatusBadge } from '../../components/StatusBadge';

const ETAT_CONFIG = {
  en_attente: { label: 'En Attente', accentText: 'text-orange-500', accentBg: 'bg-orange-50' },
  en_nettoyage: { label: 'Nettoyage', accentText: 'text-blue-500', accentBg: 'bg-blue-50' },
  nettoye: { label: 'Nettoyé', accentText: 'text-green-500', accentBg: 'bg-green-50' },
  livre: { label: 'Livré', accentText: 'text-teal-500', accentBg: 'bg-teal-50' },
};

export default function AdminCommandeDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { selectedCommande: commande, loading } = useSelector(s => s.admin);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (id) dispatch(fetchCommandeById(id));
    return () => { dispatch(clearSelectedCommande()); };
  }, [id, dispatch]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  if (loading || !commande) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary-600 mb-3" />
        <p className="text-sm text-text-muted">Chargement...</p>
      </div>
    );
  }

  const tapis = commande.commandeTapis || [];
  const totalPrice = tapis.reduce((sum, t) => sum + (parseFloat(t.sousTotal) || 0), 0);

  return (
    <div className="max-w-2xl mx-auto pb-8 space-y-4">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary">
        <ArrowLeft size={16} />
        Retour
      </button>

      {/* Header */}
      <div className="bg-surface rounded-3xl shadow-card p-6 border border-border/50">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 px-1">Référence Commande</p>
            <div className="flex items-center gap-3">
              <p className="text-xl font-black text-text-primary tracking-tight">#{commande.numeroCommande}</p>
              <StatusBadge status={commande.status} size="sm" />
            </div>
          </div>
          {commande.montantTotal != null && (
            <div className="text-right">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">Encaissement</p>
              <div className="bg-primary-50 px-3 py-1.5 rounded-xl border border-primary-100 flex items-baseline gap-1">
                <span className="text-xl font-black text-primary-600 tracking-tight">{commande.montantTotal}</span>
                <span className="text-[10px] font-black text-primary-400 uppercase">DH</span>
              </div>
            </div>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: User, label: 'Livreur', value: commande.livreur?.name, color: 'bg-indigo-50 text-indigo-500' },
            { icon: User, label: 'Client', value: commande.client?.name, color: 'bg-teal-50 text-teal-600' },
            { icon: Phone, label: 'Téléphone', value: commande.client?.telephone || commande.client?.phone || commande.client?.phones?.[0]?.phoneNumber, color: 'bg-amber-50 text-amber-600' },
            { icon: CalendarDays, label: 'Date Création', value: formatDate(commande.dateCreation), color: 'bg-gray-50 text-text-muted' },
            { icon: Truck, label: 'Livraison Prévue', value: commande.dateLivraison ? formatDate(commande.dateLivraison) : null, color: 'bg-emerald-50 text-emerald-600' },
            { icon: CreditCard, label: 'Paiement', value: commande.modePaiement, color: 'bg-rose-50 text-rose-600' },
          ].filter(r => r.value).map((row, i) => {
            const Icon = row.icon;
            return (
              <div key={i} className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100 flex flex-col gap-1.5">
                <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.2em]">{row.label}</p>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${row.color}`}>
                    <Icon size={12} strokeWidth={2.5} />
                  </div>
                  <p className="text-[11px] font-black text-text-primary truncate">{row.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {commande.client?.address && (
          <div className="flex items-center gap-2.5 bg-background rounded-2xl px-4 py-3 mt-4 border border-border/50">
            <MapPin size={14} className="text-primary-500 shrink-0" />
            <span className="text-xs font-bold text-text-secondary tracking-tight">{commande.client.address}</span>
          </div>
        )}
      </div>

      {/* Tapis List */}
      {tapis.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
            <Package size={16} className="text-primary-600" />
            Articles — {tapis.length} tapis
          </h3>
          <div className="space-y-4">
            {tapis.map((t, i) => {
              const etatCfg = ETAT_CONFIG[t.etat] || ETAT_CONFIG.en_attente;
              const tapisInfo = t.tapis || {};

              const baseUrl = import.meta.env.VITE_API_URL;

              const getFullUrl = (img) => {
                const url = img?.imageUrl || img?.url || (typeof img === 'string' ? img : null);
                if (!url) return null;
                return url.startsWith('http') ? url : `${baseUrl}${url}`;
              };

              const avantImages = (t.tapisImages?.filter(
                img => img.imageType === 'BEFORE' || img.type === 'avant' || img.isAvant === true || !img.imageType
              ) || t.images?.filter(
                img => img.type === 'avant' || img.isAvant === true || !img.type
              ) || t.photosAvant || []).map(getFullUrl).filter(Boolean);

              const apresImages = (t.tapisImages?.filter(
                img => img.imageType === 'AFTER' || img.type === 'apres' || img.isApres === true
              ) || t.images?.filter(
                img => img.type === 'apres' || img.isApres === true
              ) || t.photosApres || []).map(getFullUrl).filter(Boolean);

              return (
                <div key={t.id} className="bg-surface rounded-2xl shadow-card p-4 flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm ${etatCfg.accentBg} ${etatCfg.accentText} flex-shrink-0`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-text-primary truncate">{tapisInfo.nom || tapisInfo.name || `Tapis ${i + 1}`}</h4>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {t.quantite && <span className="text-xs bg-gray-100 text-text-secondary px-2 py-0.5 rounded-full">×{t.quantite}</span>}
                        {t.prixUnitaire && <span className="text-xs bg-gray-100 text-text-secondary px-2 py-0.5 rounded-full">{t.prixUnitaire} DH/u</span>}
                        {t.sousTotal && <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">{t.sousTotal} DH</span>}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${etatCfg.accentBg} ${etatCfg.accentText} flex-shrink-0`}>
                      {etatCfg.label}
                    </span>
                  </div>

                  {/* BEFORE/AFTER IMAGES SECTION */}
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-sm font-semibold text-text-primary mb-3">Photos</p>
                    <div className="grid grid-cols-2 gap-4">
                      {/* AVANT NETTOYAGE */}
                      <div>
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Avant nettoyage</p>
                        {avantImages.length > 0 ? (
                          <div className="flex gap-2 flex-wrap">
                            {avantImages.map((imgUrl, idx) => (
                              <img
                                key={idx}
                                src={imgUrl}
                                className="w-20 h-20 rounded-xl object-cover cursor-pointer hover:opacity-90 transition"
                                onClick={() => {
                                  setLightboxImages(avantImages);
                                  setLightboxIndex(idx);
                                  setLightboxOpen(true);
                                }}
                                alt="avant"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* APRÈS NETTOYAGE */}
                      <div>
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Après nettoyage</p>
                        {apresImages.length > 0 ? (
                          <div className="flex gap-2 flex-wrap">
                            {apresImages.map((imgUrl, idx) => (
                              <img
                                key={idx}
                                src={imgUrl}
                                className="w-20 h-20 rounded-xl object-cover cursor-pointer hover:opacity-90 transition"
                                onClick={() => {
                                  setLightboxImages(apresImages);
                                  setLightboxIndex(idx);
                                  setLightboxOpen(true);
                                }}
                                alt="après"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
                            <p className="text-xs text-text-muted text-center px-2">Pas encore disponible</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPrice > 0 && (
            <div className="mt-3 bg-primary-600 rounded-2xl p-4 flex items-center justify-between text-white">
              <div>
                <p className="text-primary-200 text-xs">Total calculé</p>
                <p className="text-primary-300 text-xs">{tapis.length} tapis · {tapis.reduce((s, t) => s + (t.quantite || 0), 0)} unités</p>
              </div>
              <p className="text-3xl font-bold">{totalPrice.toFixed(2)} <span className="text-lg">DH</span></p>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="absolute top-4 left-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>

          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
              onClick={() => setLightboxIndex(i => i - 1)}
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}

          <img
            src={lightboxImages[lightboxIndex]}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl"
            alt="zoom"
          />

          {lightboxIndex < lightboxImages.length - 1 && (
            <button
              className="absolute right-4 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
              onClick={() => setLightboxIndex(i => i + 1)}
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          <div className="flex gap-2 mt-4 flex-wrap justify-center">
            {lightboxImages.map((img, idx) => (
              <img
                key={idx}
                src={img}
                className={`w-12 h-12 rounded-lg object-cover cursor-pointer border-2 ${idx === lightboxIndex ? 'border-white opacity-100' : 'border-transparent opacity-50'
                  }`}
                onClick={() => setLightboxIndex(idx)}
                alt="thumb"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
