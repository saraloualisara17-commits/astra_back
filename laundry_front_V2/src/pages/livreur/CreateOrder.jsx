import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Plus, Minus, Trash2, MapPin, Phone,
  Package, Camera, Image as ImageIcon,
  X, ChevronRight, ShoppingBag, 
  ArrowLeft, Loader2, Info, AlertCircle,
  Users, UserCircle, CheckCircle, Pencil, Save
} from 'lucide-react';
import { createOrder, uploadImages, fetchCarpetTypes } from '../../store/livreur/livreurThunk';
import { selectLoading, selectPendingClient } from '../../store/livreur/livreurSelectors';
import { compressImage } from '../../utils/imageCompression';

export default function CreateOrder() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const pendingClient = useSelector(selectPendingClient);
  const loading = useSelector(selectLoading);
  const carpetTypes = useSelector(state => state.livreur.carpetTypes);

  const [articles, setArticles] = useState([{
    id: Date.now(),
    type: '',
    prixEstime: '',
    quantite: 1,
    notes: '',
    photos: [],
    mainPhotoIndex: 0
  }]);

  const [uploadingImageForIndex, setUploadingImageForIndex] = useState(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeStatus, setFinalizeStatus] = useState(''); // 'compressing', 'uploading', 'creating'

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      articles.forEach(article => {
        article.photos.forEach(photo => {
          if (photo.preview) URL.revokeObjectURL(photo.preview);
        });
      });
    };
  }, []);

  useEffect(() => {
    dispatch(fetchCarpetTypes());
  }, [dispatch]);

  // FIX 1: LANDING UI (if no client selected)
  if (!pendingClient && !loading?.pendingClient) {
    return (
      <div className="bg-[#F8F9FA] min-h-[calc(100vh-80px)] flex items-center justify-center p-6 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-card p-8 max-w-md w-full text-center border border-border/50">
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="text-primary-300" size={40} />
          </div>
          
          <h1 className="text-2xl font-black text-text-primary mb-2 uppercase tracking-tight">Créer une Nouvelle Commande</h1>
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 mb-8 text-left flex items-start gap-3">
            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <p className="text-sm font-bold text-amber-700 leading-tight">
              Pour créer une commande, vous devez d'abord sélectionner ou créer un client.
            </p>
          </div>

          <div className="text-left mb-8 space-y-4">
            {[
              { id: 1, text: "Recherchez un client existant par téléphone" },
              { id: 2, text: "Ou créez un nouveau profil client" },
              { id: 3, text: "Ajoutez les articles et finalisez" }
            ].map(step => (
              <div key={step.id} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 text-sm font-black flex items-center justify-center shrink-0 shadow-sm border border-primary-100">
                  {step.id}
                </div>
                <p className="text-sm font-bold text-text-secondary uppercase tracking-tight">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => navigate('/livreur/clients')}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white rounded-xl py-4 text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 active:scale-95"
            >
              <Users size={18} strokeWidth={3} /> Sélectionner un Client
            </button>
            <button 
              onClick={() => navigate('/livreur')}
              className="w-full border border-border bg-white hover:bg-gray-50 text-text-secondary rounded-xl py-3.5 text-xs font-black uppercase tracking-widest transition-colors"
            >
              Retour au tableau de bord
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!pendingClient) return null;

  // FIX 2: CREATE ORDER FORM
  const handleAddArticle = () => {
    setArticles([...articles, {
      id: Date.now(),
      type: '',
      prixEstime: '',
      quantite: 1,
      notes: '',
      photos: [],
      mainPhotoIndex: 0
    }]);
  };

  const handleRemoveArticle = (id) => {
    if (articles.length > 1) {
      setArticles(articles.filter(a => a.id !== id));
      toast.info('Article supprimé');
    } else {
      toast.warning("Vous devez avoir au moins un article");
    }
  };

  const updateArticle = (index, field, value) => {
    const newArticles = [...articles];
    newArticles[index][field] = value;
    setArticles(newArticles);
  };

  const handleImageUpload = async (index, e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    const currentPhotosCount = articles[index].photos.length;
    if (currentPhotosCount + files.length > 6) {
      return toast.warning("Maximum 6 photos par article");
    }

    const newPhotos = files.map((file, idx) => ({
      file: file,
      preview: URL.createObjectURL(file),
      isPrincipal: currentPhotosCount === 0 && idx === 0
    }));

    const newArticles = [...articles];
    newArticles[index].photos = [...newArticles[index].photos, ...newPhotos];
    setArticles(newArticles);
    toast.success(`${files.length} photo(s) ajoutée(s)`);
    e.target.value = null;
  };

  const setMainPhoto = (articleIndex, photoIndex) => {
    const newArticles = [...articles];
    newArticles[articleIndex].photos = newArticles[articleIndex].photos.map((p, i) => ({
      ...p,
      isPrincipal: i === photoIndex
    }));
    setArticles(newArticles);
  };

  const handleRemovePhoto = (articleIndex, photoIndex) => {
    const newArticles = [...articles];
    const photoToRemove = newArticles[articleIndex].photos[photoIndex];
    
    // 1. Revoke the object URL
    if (photoToRemove.preview) URL.revokeObjectURL(photoToRemove.preview);
    
    // 2. Remove photo
    const isWasPrincipal = photoToRemove.isPrincipal;
    newArticles[articleIndex].photos = newArticles[articleIndex].photos.filter((_, i) => i !== photoIndex);
    
    // 3. Reassign principal if needed
    if (isWasPrincipal && newArticles[articleIndex].photos.length > 0) {
      newArticles[articleIndex].photos[0].isPrincipal = true;
    }
    
    setArticles(newArticles);
    toast.info('Photo supprimée');
  };

  const totalUnits = articles.reduce((s, a) => s + (parseInt(a.quantite) || 0), 0);
  const totalEstime = articles.reduce((s, a) => s + ((parseFloat(a.prixEstime) || 0) * (parseInt(a.quantite) || 0)), 0);

  const handleFinalizeOrder = async () => {
    // Validation
    const invalid = articles.some(a => !a.type || !a.prixEstime);
    if (invalid) return toast.warning('Veuillez remplir le type and le prix pour tous les tapis');

    if (isFinalizing) return;
    setIsFinalizing(true);
    
    try {
      // 1. COMPRESSION PHASE
      setFinalizeStatus('compressing');
      const articlesWithCompressedPhotos = await Promise.all(articles.map(async (article) => {
        if (article.photos.length > 0) {
          const compressedPhotos = await Promise.all(article.photos.map(async (p) => {
            try {
              const compressedFile = await compressImage(p.file, { maxWidth: 1200, maxHeight: 1200, quality: 0.7 });
              return { ...p, file: compressedFile };
            } catch (err) {
              console.error("Compression error:", err);
              return p; // fallback to original if compression fails
            }
          }));
          return { ...article, photos: compressedPhotos };
        }
        return article;
      }));

      // 2. UPLOAD PHASE
      setFinalizeStatus('uploading');
      const articlesWithUrls = await Promise.all(articlesWithCompressedPhotos.map(async (article) => {
        if (article.photos.length > 0) {
          const filesToUpload = article.photos.map(p => p.file);
          const results = await dispatch(uploadImages(filesToUpload)).unwrap();
          return {
            ...article,
            uploadedUrls: results.map(r => r.imageUrl)
          };
        }
        return { ...article, uploadedUrls: [] };
      }));

      // 3. ORDER CREATION PHASE
      setFinalizeStatus('creating');
      await dispatch(createOrder({ 
        clientId: pendingClient.id, 
        tapis: articlesWithUrls.map(a => ({
          nom: a.type,
          description: a.notes,
          prixUnitaire: parseFloat(a.prixEstime),
          quantite: parseInt(a.quantite),
          imageUrls: a.uploadedUrls,
          mainImageIndex: a.photos.findIndex(p => p.isPrincipal) !== -1 ? a.photos.findIndex(p => p.isPrincipal) : 0
        })) 
      })).unwrap();

      toast.success('Bon de collecte créé avec succès !');
      navigate('/livreur');
    } catch (err) {
      console.error("Finalization error:", err);
      toast.error(typeof err === 'string' ? err : 'Erreur lors de la création de la commande');
    } finally {
      setIsFinalizing(false);
      setFinalizeStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] animate-fade-in pb-32">
      
      {/* TOPBAR */}
      <div className="fixed top-0 left-0 right-0 md:left-16 lg:left-64 z-[60] bg-white border-b border-border h-14 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors text-text-secondary"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-black text-text-primary tracking-tight uppercase">Créer une Commande</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-primary-500 transition-colors relative">
            <Info size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-black text-xs border border-primary-200">
            {pendingClient.name?.[0]?.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto pt-20 px-4 sm:px-6">
        
        {/* CLIENT SUMMARY CARD - MOBILE OPTIMIZED */}
        <div className="bg-white rounded-2xl shadow-card p-4 mb-4 mt-2 animate-in slide-in-from-top duration-500">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Détails du Client
          </p>
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center shrink-0 shadow-sm">
              <UserCircle size={24} strokeWidth={2} />
            </div>
            
            <div className="flex-1 min-w-0">
               <h3 className="text-base font-bold text-text-primary tracking-tight uppercase truncate leading-tight">{pendingClient.name}</h3>
               <div className="flex flex-col gap-1 mt-2">
                  <div className="flex items-center gap-2 text-text-muted text-xs font-medium">
                     <Phone size={14} className="text-primary-500 shrink-0" />
                     <span className="truncate">{pendingClient.phones?.[0]?.phoneNumber}</span>
                  </div>
                  <div className="flex items-start gap-2 text-text-muted text-xs font-medium">
                     <MapPin size={14} className="text-primary-500 shrink-0 mt-0.5" />
                     <span className="line-clamp-2 leading-relaxed">
                        {pendingClient.addresses?.[0]?.address || 'Adresse inconnue'}
                     </span>
                  </div>
               </div>
            </div>

            <button 
              onClick={() => navigate('/livreur/clients')}
              className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
            >
              <Pencil size={18} />
            </button>
          </div>
        </div>

        {/* ARTICLES SECTION HEADER */}
        <div className="flex items-baseline justify-between mb-4 px-1">
          <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">Articles</h3>
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">
            {articles.length} Tapis
          </span>
        </div>

        <div className="space-y-4">
          {articles.map((article, index) => (
            <div key={article.id} className="w-full bg-white rounded-2xl shadow-card p-4 mb-3 border-none flex flex-col items-stretch animate-in slide-in-from-bottom duration-500">
               
               {/* TYPE & PRICE GRID */}
               <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-text-muted uppercase tracking-wider px-1">Type *</label>
                     <select 
                       value={article.type}
                       onChange={(e) => updateArticle(index, 'type', e.target.value)}
                       className="w-full bg-gray-50 border border-border rounded-xl px-3 py-3 text-xs font-bold focus:bg-white focus:border-primary-400 outline-none appearance-none uppercase h-[48px]"
                     >
                        <option value="">CHOISIR</option>
                        {carpetTypes.map(t => (
                           <option key={t.id} value={t.nom}>{t.nom}</option>
                        ))}
                        {!carpetTypes.length && (
                          <>
                            <option value="TAPIS D'ORIENT">ORIENT</option>
                            <option value="TAPIS BERBÈRE">BERBÈRE</option>
                            <option value="TAPIS LAINE">LAINE</option>
                          </>
                        )}
                     </select>
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-text-muted uppercase tracking-wider px-1">Prix Estimé (DH) *</label>
                     <div className="relative">
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={article.prixEstime}
                          onChange={(e) => updateArticle(index, 'prixEstime', e.target.value)}
                          className="w-full bg-gray-50 border border-border rounded-xl px-3 py-3 text-xs font-bold focus:bg-white focus:border-primary-400 outline-none h-[48px]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-text-muted">DH</span>
                     </div>
                  </div>
               </div>

               {/* QUANTITY PICKER - FULL WIDTH */}
               <div className="space-y-1.5 mb-4">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-wider px-1">Quantité</label>
                  <div className="flex items-center border border-border rounded-xl overflow-hidden h-[48px] bg-gray-50">
                    <button 
                      onClick={() => updateArticle(index, 'quantite', Math.max(1, article.quantite - 1))}
                      className="flex-1 h-full hover:bg-white flex items-center justify-center transition-all bg-gray-100/50"
                    >
                      <Minus size={18} strokeWidth={3} className="text-text-secondary" />
                    </button>
                    <div className="w-16 text-center font-black text-base text-text-primary bg-white h-full flex items-center justify-center border-x border-border/50">
                       {article.quantite}
                    </div>
                    <button 
                      onClick={() => updateArticle(index, 'quantite', article.quantite + 1)}
                      className="flex-1 h-full hover:bg-white flex items-center justify-center transition-all bg-gray-100/50"
                    >
                      <Plus size={18} strokeWidth={3} className="text-text-secondary" />
                    </button>
                  </div>
               </div>

               {/* NOTES */}
               <div className="space-y-1.5 mb-4">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-wider px-1">État / Notes</label>
                  <textarea 
                    rows={2} 
                    placeholder="Taches, usure, etc..."
                    value={article.notes}
                    onChange={(e) => updateArticle(index, 'notes', e.target.value)}
                    className="w-full bg-gray-50 border border-border rounded-xl px-3 py-3 text-xs font-bold focus:bg-white outline-none resize-none shadow-sm min-h-[60px]"
                  />
               </div>

               {/* PHOTOS */}
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-wider px-1">Photos ({article.photos.length}/6)</label>
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                     {article.photos.map((photo, pIdx) => (
                        <div 
                          key={pIdx} 
                          onClick={() => setMainPhoto(index, pIdx)}
                          className={`w-28 h-24 rounded-2xl object-cover shrink-0 cursor-pointer relative overflow-hidden group border-2 transition-all ${photo.isPrincipal ? 'border-primary-500' : 'border-transparent'}`}
                        >
                           <img src={photo.preview} alt="photo" className="w-full h-full object-cover" />
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleRemovePhoto(index, pIdx); }}
                             className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-black/60 flex items-center justify-center text-white"
                           >
                              <X size={14} strokeWidth={3} />
                           </button>
                           {photo.isPrincipal && (
                              <div className="absolute top-1 left-1 bg-primary-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">
                                 Principal
                              </div>
                           )}
                        </div>
                     ))}

                     {article.photos.length < 6 && (
                        <label className="w-28 h-24 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-gray-50/50 shrink-0 h-[96px]">
                           <Camera size={20} className="text-text-muted mb-1" />
                           <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Photo</span>
                           <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(index, e)} />
                        </label>
                     )}
                  </div>
               </div>

               {/* DELETE ACTION */}
               {articles.length > 1 && (
                  <button 
                    onClick={() => handleRemoveArticle(article.id)}
                    className="mt-4 flex items-center justify-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest py-3 border-t border-gray-50"
                  >
                     <Trash2 size={14} /> Supprimer
                  </button>
               )}
            </div>
          ))}

          {/* ADD ANOTHER ARTICLE BUTTON */}
          <button 
            onClick={handleAddArticle}
            className="w-full border-2 border-dashed border-border py-6 flex flex-col items-center justify-center gap-2 rounded-2xl text-text-muted hover:border-primary-500 hover:bg-primary-50/30 hover:text-primary-600 transition-all"
          >
            <Plus size={24} strokeWidth={3} />
            <span className="text-[10px] font-black uppercase tracking-widest">Nouveau Tapis</span>
          </button>
        </div>
      </div>

      {/* STICKY BOTTOM BAR - MOBILE HEIGHT ACCOUNTED */}
      <div className="fixed bottom-[64px] pb-safe md:bottom-0 left-0 right-0 md:left-16 lg:left-64 z-[110] bg-white/95 backdrop-blur-md border-t border-border/80 px-4 pt-4 sm:pb-4 flex flex-col items-stretch gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        
        <div className="flex items-center justify-between px-2">
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Articles: {totalUnits}</span>
           </div>
           
           <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Total:</span>
              <span className="text-2xl font-black text-primary-500 tracking-tighter leading-none">{totalEstime.toFixed(0)}</span>
              <span className="text-[10px] font-black text-text-muted uppercase">DH</span>
           </div>
        </div>

        <button 
          onClick={handleFinalizeOrder}
          disabled={loading.createOrder || isFinalizing}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white rounded-2xl py-4 text-sm font-black uppercase tracking-[0.1em] shadow-lg shadow-primary-500/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isFinalizing ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>
                {finalizeStatus === 'compressing' ? 'Optimisation des photos...' : 
                 finalizeStatus === 'uploading' ? 'Envoi des images (Merci de patienter)...' : 
                 'Création du bon de commande...'}
              </span>
            </>
          ) : (
            <>
              <CheckCircle size={20} strokeWidth={3} />
              Finaliser la commande
            </>
          )}
        </button>
      </div>

    </div>
  );
}
