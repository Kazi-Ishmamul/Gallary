# Pixora Gallery App

A full-stack image gallery application built with React, Spring Boot, PostgreSQL, and Cloudinary.

## Prerequisites

Before running the application, make sure you have the following installed:
- **Java 22** or higher (with `JAVA_HOME` properly configured)
- **Node.js** (v18 or higher recommended)
- **PostgreSQL** database running locally

## Project Structure

- `/frontend` - React application built with Vite
- `/backend` - Spring Boot Java application
- `/database` - Contains any database scripts (if applicable)

---

## 1. Setting up the Backend (Spring Boot)

The backend handles image metadata, folder organization, and direct secure uploads to Cloudinary.

### Environment Variables
Ensure you have a `.env` file in the `backend/` directory with your PostgreSQL and Cloudinary credentials:
```properties
DB_USERNAME=postgres
DB_PASSWORD=postgres
CLOUDINARY_URL=cloudinary://<API_KEY>:<API_SECRET>@<CLOUD_NAME>
UPLOAD_PICTURE=Gallary
```

### Running the Backend

Open a terminal, navigate to the `backend` folder, and run:

**On Windows (PowerShell):**
```powershell
cd backend
$env:JAVA_HOME = "C:\Program Files\Java\jdk-22"  # Update this path if your Java is installed elsewhere
.\mvnw spring-boot:run
```

**On Mac/Linux:**
```bash
cd backend
export JAVA_HOME=/path/to/your/java22
./mvnw spring-boot:run
```

The backend server will start on `http://localhost:8080`.

---

## 2. Setting up the Frontend (React)

The frontend provides a beautiful, modern UI to view, upload, rename, and organize your images into folders.

### Environment Variables
Ensure you have a `.env` file in the `frontend/` directory with your Cloudinary credentials (used for previews and references):
```properties
VITE_CLOUDINARY_CLOUD_NAME=<CLOUD_NAME>
VITE_CLOUDINARY_API_KEY=<API_KEY>
VITE_CLOUDINARY_API_SECRET=<API_SECRET>
```

### Running the Frontend

Open a **new** terminal window (keep the backend running in the first one), navigate to the `frontend` folder, and run:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start and typically be available at `http://localhost:5173` (or `http://localhost:5174` if the port is busy).

## Features
- **Upload Images:** Securely upload images to Cloudinary via the Spring Boot backend.
- **Folder Management:** Create folders and organize images within them.
- **Rename:** Easily rename both folders and image titles directly from the UI.
- **Delete:** Remove images and folders seamlessly.
- **Lightbox Viewing:** Click on any image to view it in full size.
