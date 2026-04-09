package com.wash.laundry_app.carpettype;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@AllArgsConstructor
public class CarpetTypeService {

    private final CarpetTypeRepository carpetTypeRepository;
    private final CarpetTypeMapper carpetTypeMapper;

    /** All types (admin view) */
    public List<CarpetTypeDTO> getAll() {
        return carpetTypeRepository.findAll()
                .stream()
                .map(carpetTypeMapper::toDto)
                .toList();
    }

    /** Only active types (livreur dropdown) */
    public List<CarpetTypeDTO> getActive() {
        return carpetTypeRepository.findByActifTrue()
                .stream()
                .map(carpetTypeMapper::toDto)
                .toList();
    }

    @Transactional
    public CarpetTypeDTO create(CarpetTypeRequest request) {
        CarpetType entity = carpetTypeMapper.toEntity(request);
        if (request.getActif() == null) entity.setActif(true);
        return carpetTypeMapper.toDto(carpetTypeRepository.save(entity));
    }

    @Transactional
    public CarpetTypeDTO update(Long id, CarpetTypeRequest request) {
        CarpetType existing = carpetTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Type de tapis introuvable avec l'id : " + id));
        existing.setNom(request.getNom());
        existing.setPrixParM2(request.getPrixParM2());
        if (request.getActif() != null) existing.setActif(request.getActif());
        return carpetTypeMapper.toDto(carpetTypeRepository.save(existing));
    }

    @Transactional
    public void delete(Long id) {
        CarpetType existing = carpetTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Type de tapis introuvable avec l'id : " + id));
        carpetTypeRepository.delete(existing);
    }
}
