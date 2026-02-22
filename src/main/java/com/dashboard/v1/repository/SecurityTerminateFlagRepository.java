package com.dashboard.v1.repository;


import com.dashboard.v1.entity.SecurityTerminateFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface SecurityTerminateFlagRepository extends JpaRepository<SecurityTerminateFlag, Long> {
    @Query("select st from SecurityTerminateFlag st where st.projectId = :projectId")
    SecurityTerminateFlag findByProjectId(String projectId);
}
