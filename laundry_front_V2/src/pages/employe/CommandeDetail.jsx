import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft, Loader2, Package, CheckCircle2, Clock, Wrench, Truck,
  User, CalendarDays, ChevronRight, Upload, Plus, RefreshCw, X, Image as ImageIcon,
  Receipt
} from 'lucide-react';
import {
  fetchCommandeById, updateCommandeStatus, updateTapisEtat,
  addTapisImages, uploadEmployeImages
} from '../../store/employe/employeThunk';
import {
  selectSelectedCommande, selectIsLoadingSelectedCommande,
  selectIsUpdatingStatus, selectIsUpdatingTapis
} from '../../store/employe/employeSelectors';
import { COMMANDE_STATUS, TAPIS_ETAT, clearSelectedCommande } from '../../store/employe/employeSlice';
import { StatusBadge } from '../../components/StatusBadge';

const TAPIS_IMAGE_TYPE = { BEFORE: 'BEFORE', AFTER: 'AFTER' };

const NEXT_COMMAND_LABEL = {
  [COMMANDE_STATUS.EN_ATTENTE]: 'Valider la commande',
  [COMMANDE_STATUS.VALIDEE]: 'Démarrer le traitement',
  [COMMANDE_STATUS.EN_TRAITEMENT]: 'Marquer comme Prête',
  [COMMANDE_STATUS.PRETE]: 'Marquer comme Sortie',
  [COMMANDE_STATUS.RETOURNEE]: 'Remettre en Livraison',
};

const NEXT_COMMANDE_STATUS = {
  [COMMANDE_STATUS.EN_ATTENTE]: COMMANDE_STATUS.VALIDEE,
  [COMMANDE_STATUS.VALIDEE]: COMMANDE_STATUS.EN_TRAITEMENT,
  [COMMANDE_STATUS.EN_TRAITEMENT]: COMMANDE_STATUS.PRETE,
  [COMMANDE_STATUS.PRETE]: COMMANDE_STATUS.LIVREE,
  [COMMANDE_STATUS.RETOURNEE]: COMMANDE_STATUS.LIVREE,
};

const ETAT_CONFIG = {
  [TAPIS_ETAT.EN_ATTENTE]: { label: 'En attente', next: TAPIS_ETAT.EN_NETTOYAGE },
  [TAPIS_ETAT.EN_NETTOYAGE]: { label: 'Nettoyage', next: TAPIS_ETAT.NETTOYE },
  [TAPIS_ETAT.NETTOYE]: { label: 'Terminé', next: null },
  [TAPIS_ETAT.LIVRE]: { label: 'Livré', next: null },
};

const BASE_URL = import.meta.env.VITE_API_URL// 'http://localhost:8080';

export default function CommandeDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const commande = useSelector(selectSelectedCommande);
  const isLoading = useSelector(selectIsLoadingSelectedCommande);
  const isUpdatingStatus = useSelector(selectIsUpdatingStatus);
  const isUpdatingTapis = useSelector(selectIsUpdatingTapis);

  const [previewImg, setPreviewImg] = useState(null);
  const [uploadingTapisId, setUploadingTapisId] = useState(null);

  useEffect(() => {
    dispatch(fetchCommandeById(id));
    return () => dispatch(clearSelectedCommande());
  }, [dispatch, id]);

  const handleStatusUpdate = async () => {
    const nextStatus = NEXT_COMMANDE_STATUS[commande.status];
    if (!nextStatus) return;
    try {
      await dispatch(updateCommandeStatus({ id: commande.id, newStatus: nextStatus })).unwrap();
      toast.success('Statut mis à jour !');
    } catch (err) {
      toast.error(err || 'Erreur lors de la mise à jour');
    }
  };

  const handleTapisStatusUpdate = async (tapisId, currentEtat) => {
    const cfg = ETAT_CONFIG[currentEtat];
    if (!cfg?.next) return;
    try {
      await dispatch(updateTapisEtat({ tapisId, newEtat: cfg.next, commandeId: commande.id })).unwrap();
      toast.success('Tapis mis à jour');
    } catch (err) {
      toast.error(err || 'Erreur');
    }
  };

  const handleImageUpload = async (commandeTapisId, files, imageType) => {
    if (!files.length) return;
    setUploadingTapisId(commandeTapisId);
    try {
      const uploadedUrls = await dispatch(uploadEmployeImages(Array.from(files))).unwrap();
      const imageUrls = uploadedUrls.map(r => r.imageUrl);
      await dispatch(addTapisImages({ tapisId: commandeTapisId, imageUrls, type: imageType })).unwrap();
      await dispatch(fetchCommandeById(id));
      toast.success('Images ajoutées');
    } catch (err) {
      toast.error(err || 'Erreur upload');
    } finally {
      setUploadingTapisId(null);
    }
  };

  const completedTapis = commande?.commandeTapis?.filter(ct => ct.tapis?.etat === TAPIS_ETAT.NETTOYE || ct.tapis?.etat === TAPIS_ETAT.LIVRE).length || 0;
  const totalTapis = commande?.commandeTapis?.length || 0;
  const progressPct = totalTapis > 0 ? Math.round((completedTapis / totalTapis) * 100) : 0;
  const circumference = 2 * Math.PI * 50;
  const strokeDash = (progressPct / 100) * circumference;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!commande) {
    return (
      <div className="py-20 flex flex-col items-center text-center">
        <Package size={36} className="text-text-muted mb-3" />
        <h3 className="font-semibold text-text-primary mb-1">Commande introuvable</h3>
        <button onClick={() => navigate('/employe/dashboard')} className="bg-primary-600 text-white rounded-xl px-5 py-2.5 text-sm mt-3">Retour</button>
      </div>
    );
  }

  const canAdvance = !!NEXT_COMMANDE_STATUS[commande.status];

  return (
    <div className="pb-8">
      {/* Back button */}
      <button onClick={() => navigate('/employe/dashboard')} className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary mb-4">
        <ArrowLeft size={16} />
        Retour à l&apos;atelier
      </button>

      {/* Order Header Card */}
      <div className="bg-surface rounded-2xl shadow-card p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Commande</p>
            <p className="text-3xl font-bold text-text-primary mb-2">#{commande.numeroCommande}</p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={commande.status} />
              <span className="inline-flex items-center gap-1 text-xs text-text-muted bg-gray-100 px-2.5 py-1 rounded-full">
                <CalendarDays size={12} />
                {new Date(commande.createdAt).toLocaleDateString('fr-FR')}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-text-muted bg-gray-100 px-2.5 py-1 rounded-full">
                <User size={12} />
                {commande.livreur?.name || 'Non assigné'}
              </span>
            </div>
          </div>
          {canAdvance && (
            <button
              onClick={handleStatusUpdate}
              disabled={isUpdatingStatus}
              className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors min-h-[48px] self-start sm:self-center whitespace-nowrap"
            >
              {isUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              {NEXT_COMMAND_LABEL[commande.status]}
            </button>
          )}
        </div>
      </div>

      {/* Desktop 2-col layout */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-5">

        {/* LEFT — Articles */}
        <div className="lg:col-span-2 space-y-4">
          {commande.commandeTapis?.map((ct, idx) => {
            const tapis = ct.tapis;
            const etatCfg = ETAT_CONFIG[tapis?.etat];
            const beforeImgs = tapis?.images?.filter(i => i.imageType === TAPIS_IMAGE_TYPE.BEFORE) || [];
            const afterImgs = tapis?.images?.filter(i => i.imageType === TAPIS_IMAGE_TYPE.AFTER) || [];
            const isUploading = uploadingTapisId === ct.id;

            return (
              <div key={ct.id} className="bg-surface rounded-2xl shadow-card p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs text-text-muted uppercase tracking-wide">Tapis #{idx + 1}</span>
                    <h3 className="font-semibold text-text-primary text-lg mt-0.5">{tapis?.nom}</h3>
                  </div>
                  <StatusBadge status={tapis?.etat} />
                </div>

                {/* Notes */}
                {ct.notes && (
                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-text-secondary italic mb-4">{ct.notes}</div>
                )}

                {/* Images — AVANT */}
                <div className="mb-3">
                  <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Avant</p>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {beforeImgs.map((img, i) => (
                      <img key={i} src={`${BASE_URL}${img.imageUrl}`} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0 cursor-pointer hover:opacity-90" onClick={() => setPreviewImg(img.imageUrl)} />
                    ))}
                    <label className="w-32 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary-300 hover:bg-primary-50 flex-shrink-0 transition-colors">
                      {isUploading ? <Loader2 size={18} className="text-text-muted animate-spin" /> : <><Plus size={18} className="text-text-muted" /><span className="text-[10px] text-text-muted mt-0.5">Avant</span></>}
                      <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleImageUpload(ct.id, e.target.files, TAPIS_IMAGE_TYPE.BEFORE)} />
                    </label>
                  </div>
                </div>

                {/* Images — APRÈS */}
                <div className="mb-4">
                  <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Après</p>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {afterImgs.map((img, i) => (
                      <img key={i} src={`${BASE_URL}${img.imageUrl}`} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0 cursor-pointer hover:opacity-90" onClick={() => setPreviewImg(img.imageUrl)} />
                    ))}
                    <label className="w-32 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary-300 hover:bg-primary-50 flex-shrink-0 transition-colors">
                      {isUploading ? <Loader2 size={18} className="text-text-muted animate-spin" /> : <><Plus size={18} className="text-text-muted" /><span className="text-[10px] text-text-muted mt-0.5">Après</span></>}
                      <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleImageUpload(ct.id, e.target.files, TAPIS_IMAGE_TYPE.AFTER)} />
                    </label>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex gap-2">
                    <span className="bg-gray-100 text-text-secondary text-xs px-3 py-1.5 rounded-xl">Qté: {ct.quantite}</span>
                    <span className="bg-gray-100 text-text-secondary text-xs px-3 py-1.5 rounded-xl">{(ct.quantite * ct.prixUnitaire).toFixed(2)} DH</span>
                  </div>
                  {etatCfg?.next && (
                    <button
                      onClick={() => handleTapisStatusUpdate(tapis.id, tapis.etat)}
                      disabled={isUpdatingTapis}
                      className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-4 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      {isUpdatingTapis ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} />}
                      Passer à {ETAT_CONFIG[etatCfg.next]?.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT — Progress + Info */}
        <div className="space-y-4 mt-4 lg:mt-0">
          {/* Circular Progress */}
          <div className="bg-surface rounded-3xl shadow-md p-6 border border-border/40">
            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-6 text-center">Avancement du Traitement</h3>
            <div className="flex justify-center mb-4 relative">
              <svg viewBox="0 0 120 120" className="w-32 h-32 md:w-40 md:h-40 rotate-[-90deg]">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#F1F3F8" strokeWidth="10" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#4F46E5" strokeWidth="10"
                  strokeLinecap="round" strokeDasharray={`${strokeDash} ${circumference}`}
                  className="transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-text-primary tracking-tighter">{progressPct}%</span>
                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Complété</span>
              </div>
            </div>
            <p className="text-[10px] font-black text-text-muted text-center uppercase tracking-widest">
              {completedTapis} / {totalTapis} articles terminés
            </p>
          </div>

          {/* Info Card */}
          <div className="bg-surface rounded-3xl shadow-md p-6 border border-border/40 space-y-4">
            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Détails Logistique</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1.5">Livreur en charge</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary-500 shadow-sm border border-primary-100">
                    <User size={14} />
                  </div>
                  <p className="text-sm font-black text-text-primary uppercase tracking-tight">
                    {commande.livreur?.name || 'Non assigné'}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1.5">Mode Règlement</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary-500 shadow-sm border border-primary-100">
                    <Receipt size={14} />
                  </div>
                  <p className="text-sm font-black text-text-primary uppercase tracking-tight">
                    {commande.modePaiement || 'Non défini'}
                  </p>
                </div>
              </div>

              <div className="bg-primary-500 rounded-2xl p-4 shadow-lg shadow-primary-500/20">
                <p className="text-[9px] font-black text-white/70 uppercase tracking-widest mb-1">Montant Total</p>
                <p className="text-2xl font-black text-white tracking-tighter">{commande.montantTotal} <span className="text-sm">DH</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewImg(null)}>
          <button onClick={() => setPreviewImg(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
            <X size={20} />
          </button>
          <img src={`${BASE_URL}${previewImg}`} alt="" className="max-w-full max-h-[90vh] rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
