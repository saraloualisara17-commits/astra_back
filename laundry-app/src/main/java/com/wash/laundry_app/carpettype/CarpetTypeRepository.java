package com.wash.laundry_app.carpettype;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CarpetTypeRepository extends JpaRepository<CarpetType, Long> {
    List<CarpetType> findByActifTrue();
    boolean existsByNom(String nom);
}
