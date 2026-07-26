package com.gallery.controller;

import com.cloudinary.Cloudinary;
import com.gallery.model.Folder;
import com.gallery.model.Image;
import com.gallery.repository.FolderRepository;
import com.gallery.repository.ImageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.web.multipart.MultipartFile;
import com.cloudinary.utils.ObjectUtils;

@RestController
@RequestMapping("/api/images")
public class ImageController {

    @Autowired
    private ImageRepository imageRepository;

    @Autowired
    private FolderRepository folderRepository;

    @Autowired
    private Cloudinary cloudinary;

    @GetMapping
    public List<Image> getAllImages(@RequestParam(required = false) Long folderId) {
        if (folderId != null) {
            return imageRepository.findByFolderId(folderId);
        }
        return imageRepository.findAllByOrderByUploadedAtDesc();
    }

    @PostMapping
    public ResponseEntity<Image> saveImageMetadata(@RequestBody Image imageRequest) {
        if (imageRequest.getFolder() != null && imageRequest.getFolder().getId() != null) {
            Optional<Folder> folderOpt = folderRepository.findById(imageRequest.getFolder().getId());
            folderOpt.ifPresent(imageRequest::setFolder);
        }
        
        Image saved = imageRepository.save(imageRequest);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long folderId,
            @RequestParam(required = false) String title) {
        
        try {
            // 1. Upload to Cloudinary securely using backend credentials
            Map<String, Object> options = new java.util.HashMap<>();
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), options);

            String publicId = uploadResult.get("public_id").toString();
            String secureUrl = uploadResult.get("secure_url").toString();

            System.out.println("Cloudinary upload success: public_id=" + publicId + ", url=" + secureUrl);

            // 2. Save metadata to Database
            // Use publicId + timestamp as DB id to avoid primary key conflicts on re-upload
            Image image = new Image();
            image.setId(publicId + "_" + System.currentTimeMillis());
            image.setPublicId(publicId);
            image.setUrl(secureUrl);
            
            String originalName = file.getOriginalFilename();
            if (title != null && !title.trim().isEmpty()) {
                image.setTitle(title);
            } else if (originalName != null) {
                // Remove extension
                image.setTitle(originalName.contains(".") ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName);
            } else {
                image.setTitle("Image");
            }
            
            image.setSizeBytes(file.getSize());

            if (folderId != null) {
                folderRepository.findById(folderId).ifPresent(image::setFolder);
            }

            Image saved = imageRepository.save(image);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Upload failed: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateImage(@PathVariable String id, @RequestBody Image imageRequest) {
        Optional<Image> imageOpt = imageRepository.findById(id);
        if (imageOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Image image = imageOpt.get();
        if (imageRequest.getTitle() != null && !imageRequest.getTitle().trim().isEmpty()) {
            image.setTitle(imageRequest.getTitle());
        }
        Image saved = imageRepository.save(image);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteImage(@PathVariable String id) {
        Optional<Image> imageOpt = imageRepository.findById(id);
        if (imageOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Image image = imageOpt.get();

        try {
            // Delete from Cloudinary
            cloudinary.uploader().destroy(image.getPublicId(), Map.of());
        } catch (Exception e) {
            System.err.println("Failed to delete from Cloudinary: " + e.getMessage());
            // Proceed with DB deletion anyway
        }

        imageRepository.delete(image);
        return ResponseEntity.ok().build();
    }
}
