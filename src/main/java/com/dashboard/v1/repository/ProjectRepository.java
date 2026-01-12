package com.dashboard.v1.repository;

import com.dashboard.v1.entity.Project;
import com.dashboard.v1.entity.ProjectStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    Optional<Project> findByProjectIdentifier(String pId);

    // Fetch project without loading client relationship to avoid circular issues
    @Query("SELECT p FROM Project p WHERE p.projectIdentifier = :pId")
    Optional<Project> findByProjectIdentifierWithoutClient(@Param("pId") String pId);

    // Fetch projects with client eagerly loaded to avoid lazy initialization issues
    @Query("SELECT p FROM Project p LEFT JOIN FETCH p.client WHERE p.status = :status ORDER BY p.createdAt")
    List<Project> findAllWithClient(@Param("status") ProjectStatus status);

    @Query("SELECT p FROM Project p WHERE p.status = :status ORDER BY p.createdAt")
    List<Project> findAll(@Param("status") ProjectStatus status);

}
