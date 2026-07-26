package com.gallery.repository;

import com.gallery.model.Image;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ImageRepository extends JpaRepository<Image, String> {
    List<Image> findByFolderId(Long folderId);
    List<Image> findByFolderIsNull();
    List<Image> findAllByOrderByUploadedAtDesc();
}
