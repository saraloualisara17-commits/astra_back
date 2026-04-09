package com.wash.laundry_app.command;


import com.wash.laundry_app.auth.AuthService;
import com.wash.laundry_app.clients.Client;
import com.wash.laundry_app.clients.ClientNotFoundException;
import com.wash.laundry_app.clients.ClientRepository;
import com.wash.laundry_app.command.ForbiddenOperationException;
import com.wash.laundry_app.tapis.Tapis;
import com.wash.laundry_app.tapis.TapisRepository;
import com.wash.laundry_app.users.User;
import com.wash.laundry_app.users.employe.CommandDetails;
import com.wash.laundry_app.users.lvreur.LivreurDashboardStatsDTO;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.stream.Collectors;


import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@AllArgsConstructor
public class CommandeService {

    private final CommandeRepository commandeRepository;
    private final CommandeTapisRepository commandeTapisRepository;
    private final ClientRepository clientRepository;
    private final TapisRepository tapisRepository;
    private final HistoriqueStatutRepository historiqueStatutRepository;
    private final CommandeMapper commandeMapper;
    private final AuthService authService;
    private final CommandeTapisMapper commandeTapisMapper;
    private final HistoriqueStatutMapper historiqueStatutMapper;

    // Create commande

    @Transactional
    public CommandeDTO createCommande(CreateCommandeRequest request) {
        var livreur = authService.currentUser();

        // 1. Find client
        Client client = clientRepository.findById(request.getClientId())
                .orElseThrow(() -> new ClientNotFoundException("Client non trouvé"));

        // 2. Create commande
        Commande commande = new Commande();
        commande.setClient(client);
        commande.setLivreur(livreur);
        commande.setStatus(CommandeStatus.en_attente);
        commande = commandeRepository.save(commande);

        BigDecimal total = BigDecimal.ZERO;

        // 3. Create each tapis with images and link to order
        for (CreateCommandeRequest.TapisItem tapisItem : request.getTapis()) {

            // Create tapis record
            Tapis tapis = new Tapis();
            tapis.setNom(tapisItem.getNom());
            tapis.setDescription(tapisItem.getDescription());
            tapis.setPrixUnitaire(tapisItem.getPrixUnitaire());
            tapis = tapisRepository.save(tapis);

            // ✅ ADD IMAGES if provided
            if (tapisItem.getImageUrls() != null && !tapisItem.getImageUrls().isEmpty()) {
                int mainIndex = tapisItem.getMainImageIndex() != null ? tapisItem.getMainImageIndex() : 0;

                for (int i = 0; i < tapisItem.getImageUrls().size(); i++) {
                    String imageUrl = tapisItem.getImageUrls().get(i);
                    boolean isMain = (i == mainIndex);
                    tapis.addImage(imageUrl, isMain);
                }

                // Save tapis again to persist images
                tapis = tapisRepository.save(tapis);
            }

            // Create commande_tapis (junction)
            CommandeTapis commandeTapis = new CommandeTapis();
            commandeTapis.setCommande(commande);
            commandeTapis.setTapis(tapis);
            commandeTapis.setQuantite(tapisItem.getQuantite());
            commandeTapis.setPrixUnitaire(tapisItem.getPrixUnitaire());

            // Persist dimension-based pricing fields
            commandeTapis.setLargeur(tapisItem.getLargeur());
            commandeTapis.setHauteur(tapisItem.getHauteur());
            commandeTapis.setPrixCalcule(tapisItem.getPrixCalcule());
            commandeTapis.setPrixFinal(tapisItem.getPrixFinal());
            commandeTapis.setModeTarification(tapisItem.getModeTarification());

            // Use prixFinal if set (overridden), otherwise fall back to prixUnitaire
            BigDecimal basePrice = (tapisItem.getPrixFinal() != null)
                    ? tapisItem.getPrixFinal()
                    : tapisItem.getPrixUnitaire();
            BigDecimal sousTotal = basePrice.multiply(new BigDecimal(tapisItem.getQuantite()));
            commandeTapis.setSousTotal(sousTotal);
            commandeTapis.setEtat(TapisEtat.en_attente);

            commandeTapisRepository.save(commandeTapis);

            // Add to total
            total = total.add(sousTotal);
        }

        // 4. Update commande total
        commande.setMontantTotal(total);
        commande = commandeRepository.save(commande);

        // 5. Record status history
        recordStatusChange(commande, null, CommandeStatus.en_attente.name(), livreur, "Commande créée");

        return commandeMapper.toDto(commande);
    }

    private void recordStatusChange(Commande commande, String oldStatus, String newStatus,
                                    com.wash.laundry_app.users.User user, String commentaire) {
        HistoriqueStatut historique = new HistoriqueStatut();
        historique.setCommande(commande);
        historique.setAncienStatut(oldStatus);
        historique.setNouveauStatut(newStatus);
        historique.setUser(user);
        historique.setCommentaire(commentaire);
        historiqueStatutRepository.save(historique);
    }


    // Get commande by ID
    public CommandDetails getCommandeById(Long id) {
        Commande commande = commandeRepository.findById(id)
                .orElseThrow(CommandeNotFoundException::new);
        return commandeMapper.Todto(commande);
    }

    // Get all commandes
    public List<CommandeDTO> getAllCommandes() {
        return commandeRepository.findAll()
                .stream()
                .map(commandeMapper::toDto)
                .toList();
    }

    // Get commandes by livreur
    public List<CommandeDTO> getCommandesByLivreur(Long livreurId) {
        return commandeRepository.findByLivreurId(livreurId)
                .stream()
                .map(commandeMapper::toDto)
                .toList();
    }

    // Get commandes ready for delivery
    public List<CommandeDTO> getReadyForDelivery() {
        var user = authService.currentUser();
        return commandeRepository.findReadyForDeliveryByLivreur(user.getId())
                .stream()
                .map(commandeMapper::toDto)
                .toList();
    }

    // Get commandes by status
    public List<CommandeDTO> getCommandesByStatus(CommandeStatus status) {
        return commandeRepository.findByStatus(status)
                .stream()
                .map(commandeMapper::toDto)
                .toList();
    }

    public long getCountByStatus(CommandeStatus status) {
        return commandeRepository.countByStatus(status);
    }

    // Update commande status
    @Transactional
    public CommandeDTO updateStatus(Long commandeId, UpdateCommandeStatusRequest request) {
        User currentUser = authService.currentUser();

        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(CommandeNotFoundException::new);

        String oldStatus = commande.getStatus().name();
        commande.setStatus(request.getNewStatus());

        // Update timestamps based on status
        switch (request.getNewStatus()) {
            case validee:
                commande.setDateValidation(LocalDateTime.now());
                break;
            case livree:
                commande.setDateLivraison(LocalDateTime.now());
                break;
        }

        commande = commandeRepository.save(commande);

        // Record status change
        recordStatusChange(commande, oldStatus, request.getNewStatus().name(), currentUser, request.getCommentaire());

        return commandeMapper.toDto(commande);
    }

    // Update tapis etat in commande
    @Transactional
    public CommandeTapisDTO updateTapisEtat(Long commandeTapisId, UpdateTapisEtatRequest request) {
        CommandeTapis commandeTapis = commandeTapisRepository.findById(commandeTapisId)
                .orElseThrow(() -> new RuntimeException("Tapis dans commande non trouvé"));

        commandeTapis.setEtat(request.getNewEtat());
        commandeTapis = commandeTapisRepository.save(commandeTapis);

        // Check if all tapis are done, update commande status
        checkAndUpdateCommandeStatusBasedOnTapis(commandeTapis.getCommande().getId());

        return commandeTapisMapper.toDto(commandeTapis);
    }

    // Record payment
    @Transactional
    public CommandeDTO recordPayment(Long commandeId, RecordPaymentRequest request) {
        User currentUser = authService.currentUser();

        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(CommandeNotFoundException::new);

        // CRIT-2: verify ownership — only the assigned livreur can record payment
        if (commande.getLivreur() == null || !commande.getLivreur().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Vous n'\u00eates pas autoris\u00e9 \u00e0 encaisser cette commande.");
        }

        if (commande.getStatus() != CommandeStatus.livree) {
            throw new ForbiddenOperationException("Seules les commandes livr\u00e9es peuvent \u00eatre pay\u00e9es.");
        }

        String oldStatus = commande.getStatus().name();
        commande.setModePaiement(request.getModePaiement());
        commande.setDatePaiement(LocalDateTime.now());
        commande.setStatus(CommandeStatus.payee);

        // Update all tapis to LIVRE
        for (CommandeTapis ct : commande.getCommandeTapis()) {
            ct.setEtat(TapisEtat.livre);
        }

        commande = commandeRepository.save(commande);

        // Record status change
        recordStatusChange(commande, oldStatus, CommandeStatus.payee.name(), currentUser, "Paiement enregistr\u00e9");

        return commandeMapper.toDto(commande);
    }

    @Transactional
    public CommandeDTO annulerCommande(Long id) {
        User currentUser = authService.currentUser();

        Commande commande = commandeRepository.findById(id)
                .orElseThrow(CommandeNotFoundException::new);

        // CRIT-2: verify ownership
        if (commande.getLivreur() == null || !commande.getLivreur().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Vous n'\u00eates pas autoris\u00e9 \u00e0 annuler cette commande.");
        }

        String oldStatus = commande.getStatus().name();
        commande.setStatus(CommandeStatus.annulee);
        commande = commandeRepository.save(commande);

        recordStatusChange(commande, oldStatus, CommandeStatus.annulee.name(), currentUser, "Livraison annul\u00e9e par le livreur");

        return commandeMapper.toDto(commande);
    }

    // Take order (prete -> sorti)
    @Transactional
    public CommandeDTO takeOrder(Long commandeId) {
        User currentUser = authService.currentUser();

        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(CommandeNotFoundException::new);

        // CRIT-2: verify ownership — only the assigned livreur can take the order
        if (commande.getLivreur() == null || !commande.getLivreur().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Vous n'\u00eates pas autoris\u00e9 \u00e0 prendre en charge cette commande.");
        }

        if (commande.getStatus() != CommandeStatus.prete) {
            throw new ForbiddenOperationException("Seules les commandes 'pr\u00eates' peuvent \u00eatre prises en charge.");
        }

        String oldStatus = commande.getStatus().name();
        commande.setStatus(CommandeStatus.livree);
        commande = commandeRepository.save(commande);

        recordStatusChange(commande, oldStatus, CommandeStatus.livree.name(), currentUser, "Commande prise en charge par le livreur");

        return commandeMapper.toDto(commande);
    }

    // Return to workplace
    @Transactional
    public CommandeDTO returnToWorkplace(Long commandeId) {
        User currentUser = authService.currentUser();

        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(CommandeNotFoundException::new);

        // CRIT-2: verify ownership
        if (commande.getLivreur() == null || !commande.getLivreur().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Vous n'\u00eates pas autoris\u00e9 \u00e0 modifier cette commande.");
        }

        if (commande.getStatus() != CommandeStatus.annulee) {
            throw new ForbiddenOperationException("Seules les commandes annul\u00e9es peuvent \u00eatre retourn\u00e9es \u00e0 l'atelier.");
        }

        String oldStatus = commande.getStatus().name();
        // Route back to the workshop with 'retournee' status
        commande.setStatus(CommandeStatus.retournee);
        commande = commandeRepository.save(commande);

        recordStatusChange(commande, oldStatus, CommandeStatus.retournee.name(), currentUser, "Retourn\u00e9e \u00e0 l'atelier par le livreur");

        return commandeMapper.toDto(commande);
    }

    // Get historique for commande
    public List<HistoriqueStatutDTO> getHistorique(Long commandeId) {
        return historiqueStatutRepository.findByCommandeIdOrderByCreatedAtDesc(commandeId)
                .stream()
                .map(historiqueStatutMapper::toDto)
                .toList();
    }

    // Helper: Check if all tapis are cleaned, update commande status
    private void checkAndUpdateCommandeStatusBasedOnTapis(Long commandeId) {
        List<CommandeTapis> allTapis = commandeTapisRepository.findByCommandeId(commandeId);

        boolean allCleaned = allTapis.stream()
                .allMatch(ct -> ct.getEtat() == TapisEtat.nettoye);

        if (allCleaned) {
            Commande commande = commandeRepository.findById(commandeId).orElseThrow();
            if (commande.getStatus() == CommandeStatus.en_attente || commande.getStatus() == CommandeStatus.en_traitement  ) {
                commande.setStatus(CommandeStatus.prete);
                commandeRepository.save(commande);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<CommandeDTO> getReadyForDeliveryByLivreur() {
        var user = authService.currentUser();
        // Fetch livree (Sorti) orders — handed over by employee to livreur
        return commandeRepository.findByLivreurIdAndStatus(user.getId(), CommandeStatus.livree)
                .stream()
                .map(this::enrichCommandeDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CommandeDTO> getReadyOrdersForLivreur() {
        var user = authService.currentUser();
        return commandeRepository.findByLivreurIdAndStatus(user.getId(), CommandeStatus.prete)
                .stream()
                .map(this::enrichCommandeDTO)
                .toList();
    }

    // Get count of prete orders (for notification badge)
    @Transactional(readOnly = true)
    public long getPreteCountForLivreur() {
        var user = authService.currentUser();
        return commandeRepository.countByLivreurIdAndStatus(user.getId(), CommandeStatus.prete);
    }

    @Transactional(readOnly = true)
    public List<CommandeDTO> getCanceledDeliveriesByLivreur() {
        var user = authService.currentUser();
        return commandeRepository.findByLivreurIdAndStatus(user.getId(), CommandeStatus.annulee)
                .stream()
                .map(this::enrichCommandeDTO)
                .toList();
    }

    private CommandeDTO enrichCommandeDTO(Commande commande) {
        CommandeDTO dto = commandeMapper.toDto(commande);

        // Find the employee who marked the command as "prete" (ready)
        historiqueStatutRepository.findByCommandeIdOrderByCreatedAtDesc(commande.getId())
                .stream()
                .filter(h -> CommandeStatus.prete.name().equalsIgnoreCase(h.getNouveauStatut()))
                .findFirst()
                .ifPresent(h -> dto.setPreparateurName(h.getUser().getName()));

        return dto;
    }

    @Transactional(readOnly = true)
    public LivreurDashboardStatsDTO getLivreurDashboardStats() {
        var user = authService.currentUser();
        Long livreurId = user.getId();

        long pretesCount = commandeRepository.countByLivreurIdAndStatus(livreurId, CommandeStatus.livree);
        long aRecupererCount = commandeRepository.countByLivreurIdAndStatus(livreurId, CommandeStatus.prete);
        long annuleesCount = commandeRepository.countByLivreurIdAndStatus(livreurId, CommandeStatus.annulee);

        // MissionsCount: count of orders created today or with active status
        long missionsCount = pretesCount + aRecupererCount + annuleesCount;

        return LivreurDashboardStatsDTO.builder()
                .commandesPretesCount(pretesCount)
                .commandesARecupererCount(aRecupererCount)
                .commandesAnnuleesCount(annuleesCount)
                .missionsCount(missionsCount)
                .build();
    }

    public List<PaymentTypeDTO> getPaymentTypes() {
        return Arrays.stream(ModePaiement.values())
                .map(m -> new PaymentTypeDTO(m.name(), capitalize(m.name())))
                .collect(Collectors.toList());
    }

    private String capitalize(String str) {
        if (str == null || str.isEmpty()) return str;
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }
}
