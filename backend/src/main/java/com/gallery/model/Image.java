package com.gallery.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "images")
public class Image {

    @Id
    private String id; // Cloudinary public_id or generated string

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "folder_id")
    @JsonIgnoreProperties({"images"})
    private Folder folder;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String url;

    @Column(name = "public_id", nullable = false)
    private String publicId;

    private String title;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @CreationTimestamp
    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;
}
