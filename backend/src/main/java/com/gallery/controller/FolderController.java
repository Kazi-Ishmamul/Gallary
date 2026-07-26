package com.gallery.controller;

import com.gallery.model.Folder;
import com.gallery.repository.FolderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/folders")
public class FolderController {

    @Autowired
    private FolderRepository folderRepository;

    @GetMapping
    public List<Folder> getAllFolders() {
        return folderRepository.findAll();
    }

    @PostMapping
    public Folder createFolder(@RequestBody Folder folder) {
        return folderRepository.save(folder);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateFolder(@PathVariable Long id, @RequestBody Folder folderRequest) {
        Optional<Folder> folderOpt = folderRepository.findById(id);
        if (folderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Folder folder = folderOpt.get();
        if (folderRequest.getName() != null && !folderRequest.getName().trim().isEmpty()) {
            folder.setName(folderRequest.getName());
        }
        Folder saved = folderRepository.save(folder);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFolder(@PathVariable Long id) {
        if (!folderRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        folderRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
